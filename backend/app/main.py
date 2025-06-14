from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.requests import Request
from fastapi.responses import StreamingResponse
from postgrest.base_request_builder import APIResponse
from openai import OpenAI
from app.models import LoginItem, PromptItem
from app.auth.supabase_client import supabase
from app.auth.functions import create_temp_user
from app.chat.functions import get_chat_messages, send_chat_prompt, generate_chat_title, send_file_prompt, send_file_prompt_bytes
import base64
import uuid
import requests
import dotenv
import os
import gotrue
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
DEBUG = True

app = FastAPI()

dotenv.load_dotenv()

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENAI_API_KEY"),
)

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

def encode_file_to_base64(upload_file: UploadFile) -> str:
    file_content = upload_file.file.read()
    return base64.b64encode(file_content).decode('utf-8')

# Send chat info

@app.get("/models")
def get_models():
    r = requests.get("https://openrouter.ai/api/v1/models")
    if r.status_code >= 200 and r.status_code <= 299:
        return r.text
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
                
            title = generate_chat_title(client, item.prompt)
            supabase.table("chats").update({"title": title}).eq("id", item.chatId).execute()
        # Load messages for context and add the prompt to the db
        messages = get_chat_messages(item.chatId)
        messages.data.sort(key=lambda m: m.get("created_at"))

        # Use normal function if debugging is needed
        # return send_chat_prompt(item, user, messages)
        return StreamingResponse(send_chat_prompt(item, user, messages), media_type="text/event-stream")
    except Exception as e:
        return {"error": e}

@app.post("/chat/upload")
async def chat_with_file(
    model:  str           = Form(...),
    chatId: str | None    = Form(None),
    prompt: str           = Form(""),
    file:   UploadFile    = File(...)
):
    # 1) Identify or create user
    user_resp = supabase.auth.get_user()
    if not user_resp:
        logging.info("Guest Mode active")
        user = create_temp_user().user
    else:
        user = user_resp.user

    # 2) Create chat if missing
    if not chatId:
        chatId = str(uuid.uuid4())
        supabase.table("chats").insert({
            "id":      chatId,
            "user_id": user.id,
            "title":   "New Chat"
        }).execute()

    # 3) Read the file bytes *once*
    file_bytes = await file.read()
    content_type = file.content_type

    # 4) Build your PromptItem
    item = PromptItem(model=model, chatId=chatId, prompt=prompt)

    # 5) Stream out
    try:
        return StreamingResponse(
            send_file_prompt_bytes(item, file_bytes, content_type),
            media_type="text/event-stream"
        )
    except Exception as e:
        logger.error("Error in /chat/upload:", e)
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
