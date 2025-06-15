from fastapi import FastAPI
from fastapi.requests import Request
from fastapi.responses import StreamingResponse
from postgrest.base_request_builder import APIResponse
from openai import OpenAI
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
from app.models import KeyItem, LoginItem, PromptItem
from app.auth.supabase_client import supabase
from app.auth.functions import create_temp_user
from app.chat.functions import get_chat_messages, send_chat_prompt
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

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key=os.getenv("OPENAI_API_KEY"),
)

kdf = PBKDF2HMAC(
    algorithm=hashes.SHA256(),
    length=32,
    salt=os.getenv("ENCRYPTION_KEY").encode(),
    iterations=1_200_000,
)

encryption_key = base64.urlsafe_b64encode(kdf.derive(os.getenv("ENCRYPTION_KEY").encode()))
fernet = Fernet(encryption_key)


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
    
    except:
        print("No user logged in")
        return {"error": "No user logged in"}
    
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
        print("No key was provided")
        return {"error": "No key was provided"}

    except:
        print("No user logged in")
        return {"error": "No user logged in"}

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
                
        # Load messages for context and add the prompt to the db
        messages = get_chat_messages(item.chatId)
        messages.data.sort(key=lambda m: m.get("created_at"))

        # Use normal function if debugging is needed
        # return send_chat_prompt(item, user, messages)
        return StreamingResponse(send_chat_prompt(item, user, messages, item.key), media_type="text/event-stream")
    except Exception as e:
        return {"error": e}