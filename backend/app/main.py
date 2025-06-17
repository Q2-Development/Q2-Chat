from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.requests import Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from postgrest.base_request_builder import APIResponse
from typing import Optional
import base64
from app import (
    LoginItem, PromptItem, supabase, create_temp_user,
    get_chat_messages, send_chat_prompt, generate_chat_title,
    send_image_prompt, send_pdf_prompt
)
import uuid
import requests
import dotenv
import os
import gotrue
import logging

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)
DEBUG = True

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

dotenv.load_dotenv()

@app.get("/")
def read_root():
    return {"Hello": "World"}

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
        return {"error": "Incorrect login credentials"}
    
    except AssertionError:
        return {"error": "Your email and/or password was not inputted"}
        
@app.get("/login_status")
def get_login_status():
    return supabase.auth.get_user()

@app.get("/logout")
def get_logout():
    supabase.auth.sign_out()
    return True

def get_user_and_chat(chatId: Optional[str]):
    """Determine user (or guest) and ensure chatId exists."""
    user_resp = supabase.auth.get_user()
    if not user_resp:
        logger.info("Guest Mode active")
        user = create_temp_user().user
    else:
        user = user_resp.user

    chat_exists = False
    if chatId:
        res = supabase.table("chats").select("id", count='exact').eq("id", chatId).execute()
        if res.count > 0:
            chat_exists = True

    if not chat_exists:
        if not chatId:
            chatId = str(uuid.uuid4())
        
        supabase.table("chats").insert({
            "id":      chatId,
            "user_id": user.id,
            "title":   "New Chat"
        }).execute()

    return user, chatId

# Send chat info
@app.get("/models")
def get_models():
    headers = {
        "Authorization": f'Bearer {os.getenv("OPEN_ROUTER_KEY")}',  # Changed to use OPEN_ROUTER_KEY
        "Content-Type": "application/json"
    }
    r = requests.get("https://openrouter.ai/api/v1/models", headers=headers)
    if r.status_code >= 200 and r.status_code <= 299:
        return r.json()  
    else:
        return {"error": "Failed to retrieve models"}

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
    
    except:
        print("No user logged in")
        return {"error": "No user logged in"}

@app.post("/chat")
def chat(item: PromptItem):
    try:
        # Get the current user to assign the chat to them.
        user = supabase.auth.get_user()
        if not user:
            logger.info("Guest Mode active")
            user = create_temp_user().user
        else: 
            user = user.user

        # Check if chat exists. If not, create it.
        chat_exists = False
        if item.chatId:
            # More efficient query to check for existence
            res = supabase.table("chats").select("id", count='exact').eq("id", item.chatId).execute()
            if res.count > 0:
                chat_exists = True

        if not chat_exists:
            # If no chatId provided by client, generate one.
            if not item.chatId:
                item.chatId = str(uuid.uuid4())
            
            # Create the chat record.
            supabase.table("chats").insert({
                "id": item.chatId, 
                "user_id": user.id, 
                "title": "New Chat"
            }).execute()
            
            # Generate a title for the new chat.
            try:
                title = generate_chat_title(item.prompt)
                supabase.table("chats").update({"title": title}).eq("id", item.chatId).execute()
            except Exception as title_e:
                # Log the error but don't fail the whole request.
                logger.error(f"Could not generate chat title for chat {item.chatId}: {title_e}")

        # Load messages for context and add the prompt to the db
        print(f"ChatID: {item.chatId}")
        messages = get_chat_messages(item.chatId)
        messages.data.sort(key=lambda m: m.get("created_at"))

        # Use normal function if debugging is needed
        # return send_chat_prompt(item, user, messages)
        return StreamingResponse(send_chat_prompt(item, user, messages), media_type="text/event-stream")
    except Exception as e:
        logger.error(f"Error in /chat endpoint for chat {item.chatId}: {e}", exc_info=True)
        return {"error": str(e)}

@app.post("/chat/upload/image")
async def chat_upload_image(
    model:     str                = Form(...),
    chatId:    Optional[str]      = Form(None),
    prompt:    str                = Form(""),
    file:      UploadFile         = File(...)
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
    model:     str                = Form(...),
    chatId:    Optional[str]      = Form(None),
    prompt:    str                = Form(""),
    file:      UploadFile         = File(...)
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