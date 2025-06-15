from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.requests import Request
from fastapi.responses import StreamingResponse
from postgrest.base_request_builder import APIResponse
from app import (
    KeyItem, LoginItem, PromptItem, fernet, supabase,
    get_chat_messages, send_chat_prompt, send_pdf_prompt, send_image_prompt, generate_chat_title, create_temp_user
)
import uuid
import requests
import dotenv
import os
import gotrue
import logging

logger = logging.getLogger(__name__)
DEBUG = True

app = FastAPI()

dotenv.load_dotenv()

fernet = fernet
supabase = supabase

@app.get("/")
def read_root():
    return {"Hello": "World"}

# Auth Functions

@app.post("/signup")
def post_signup(item: LoginItem):
    if (item.email == None or item.email == ""): return None
    
    response = supabase.auth.sign_up(
        {
            "email": item.email,
            "password": item.password
        }
    )
    return response.user

@app.post("/login")
def post_login(item: LoginItem):
    try:
        assert (item.email != None and item.email != "") and (item.password != None and item.password != "")
        login = supabase.auth.sign_in_with_password(
            {
                "email": item.email,
                "password": item.password
            }
        )
        return {"message": "Login successful"}

    except gotrue.errors.AuthApiError:
        logger.error("Error: Incorrect credentials (/login/)")
        raise HTTPException(status_code=401, detail="Error: Incorrect credentials (/login/)")
    
    except AssertionError:
        raise HTTPException(status_code=400, detail="Error: Your email and/or password was not inputted (/login/)")
        
@app.get("/login_status")
def get_login_status():
    return supabase.auth.get_user()

@app.get("/logout")
def get_logout():
    supabase.auth.sign_out()
    return True

# Send chat info
@app.get("/key")
def get_key():
    try:
        user = supabase.auth.get_user()
        if not user:
            logger.info("Guest Mode active")
            user = create_temp_user().user
        else: 
            user = user.user
        
        keys = supabase.table("keys") \
            .select("*") \
            .eq("user_id", user.id) \
            .execute()
        
        if (len(keys.data) >= 1):
            encryptedKey = keys.data[0]["key"]
            key = fernet.decrypt(encryptedKey.encode("ascii")).decode("ascii")
            return key
        else:
            return None
    
    except Exception as e:
        logger.error("Error: No user logged in (/key/)")
        raise HTTPException(status_code=401, detail=str(e))
    
@app.post("/key")
def post_key(item: KeyItem):
    try:
        user = supabase.auth.get_user()
        if not user:
            logger.info("Guest Mode active")
            user = create_temp_user().user
        else: 
            user = user.user
        
        assert (item.key != None and item.key != "")

        key = fernet.encrypt(item.key.encode("ascii")).decode("ascii")
        
        supabase.table("keys") \
            .upsert({"user_id": user.id, "key": key}) \
            .execute()
        
        return True
    except AssertionError:
        logger.error("Error: No key was provided (/key/)")
        raise HTTPException(status_code=400, detail="No key was provided")

    except Exception as e:
        logger.error("Error: No user logged in (/key/)")
        raise HTTPException(status_code=401, detail=str(e))

def get_user_and_chat(chatId: str | None):
    """Determine user (or guest) and ensure chatId exists."""
    user_resp = supabase.auth.get_user()
    if not user_resp:
        logger.info("Guest Mode active")
        user = create_temp_user().user
    else:
        user = user_resp.user

    if not chatId:
        chatId = str(uuid.uuid4())
        supabase.table("chats").insert({
            "id":      chatId,
            "user_id": user.id,
            "title":   "New Chat"
        }).execute()

    return user, chatId

@app.get("/models")
def get_models():
    r = requests.get("https://openrouter.ai/api/v1/models")
    if r.status_code >= 200 and r.status_code <= 299:
        return r.text
    else:
        raise HTTPException(status_code=500, detail="Failed to load models")

@app.get("/chats")
def get_chats():
    try:
        user = supabase.auth.get_user()
        if not user:
            logger.info("Guest Mode active")
            user = create_temp_user().user
        else: 
            user = user.user
        
        chats = supabase.table("chats") \
            .select("id, title") \
            .eq("user_id", user.id) \
            .execute()
        return chats.data
    
    except Exception as e:
        logger.error("Error: No user logged in (/chats/)")
        raise HTTPException(status_code=401, detail=str(e))

@app.post("/chat")
def chat(item: PromptItem):
    try:
        # Get the current user to assign the chat to them.
        user = supabase.auth.get_user()
        chat: APIResponse
        if not user:
            logger.info("Guest Mode active")
            user = create_temp_user().user
        else: 
            user = user.user

        # Find the associated chat if it is an old one
        # Technically the user check could be removed since the likelihood of a UUID
        # conflict is virtually impossible without manual manipulation
        # If the row with the user is not found, we should randomly generate a new one
        if item.chatId != None:
            chat = supabase.table("chats") \
                .select("*") \
                .eq("user_id", user.id) \
                .eq("id", item.chatId) \
                .execute()

        # Make sure the chat actually exists
        # If not we need to create it
        if item.chatId == None or len(chat.data) != 1:
            item.chatId = str(uuid.uuid4())

            # Probably should have the new chat name auto change after the initial prompting
            supabase.table("chats") \
                .insert({"id": item.chatId, "user_id": user.id, "title": "New Chat"}) \
                .execute()
                
        # Load messages for context and add the prompt to the db
        messages = get_chat_messages(item.chatId)
        messages.data.sort(key=lambda m: m.get("created_at"))

        # Use normal function if debugging is needed
        # return send_chat_prompt(item, user, messages)
        return StreamingResponse(send_chat_prompt(item, user, messages, item.key), media_type="text/event-stream")
    except Exception as e:
        logger.error("Error in /chat/:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/upload/image")
async def chat_upload_image(
    model:     str           = Form(...),
    chatId:    str | None    = Form(None),
    prompt:    str           = Form(""),
    file:      UploadFile    = File(...)
):
    # 1) Lookup or create user + chat
    user, chatId = get_user_and_chat(chatId)

    # 2) Read file bytes once
    file_bytes    = await file.read()
    content_type  = file.content_type

    # 3) Build PromptItem
    item = PromptItem(model=model, chatId=chatId, prompt=prompt)

    # 4) Stream via the image helper
    try:
        return StreamingResponse(
            send_image_prompt(item, file_bytes, content_type),
            media_type="text/event-stream"
        )
    except Exception as e:
        logger.error("Error in /chat/upload/image:", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat/upload/pdf")
async def chat_upload_pdf(
    model:     str           = Form(...),
    chatId:    str | None    = Form(None),
    prompt:    str           = Form(""),
    file:      UploadFile    = File(...)
):
    # 1) Lookup or create user + chat
    user, chatId = get_user_and_chat(chatId)

    # 2) Read file bytes once
    file_bytes    = await file.read()
    content_type  = file.content_type

    # 3) Build PromptItem
    item = PromptItem(model=model, chatId=chatId, prompt=prompt)

    # 4) Stream via the PDF helper
    try:
        return StreamingResponse(
            send_pdf_prompt(item, file_bytes, content_type),
            media_type="text/event-stream"
        )
    except Exception as e:
        logger.error("Error in /chat/upload/pdf:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/chat/{chat_id}/title")
def get_chat_title(chat_id: str):
    # Query Supabase for just the title field
    resp = supabase.table("chats") \
        .select("title") \
        .eq("id", chat_id) \
        .single() \
        .execute()

    data = getattr(resp, "data", None)
    if data is None:
        raise HTTPException(status_code=404, detail="Chat not found")

    # resp.data looks like {"title": "Your Generated Title"}
    return {"chatId": chat_id, "title": resp.data["title"]}
