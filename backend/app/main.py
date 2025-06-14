from fastapi import FastAPI, HTTPException
from fastapi.requests import Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from postgrest.base_request_builder import APIResponse
from app import (
    LoginItem, PromptItem, supabase, get_temp_user,
    get_chat_messages, send_chat_prompt, generate_chat_title, create_temp_user
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
                
            title = generate_chat_title(item.prompt)
            supabase.table("chats").update({"title": title}).eq("id", item.chatId).execute()
        # Load messages for context and add the prompt to the db
        messages = get_chat_messages(item.chatId)
        messages.data.sort(key=lambda m: m.get("created_at"))

        # Use normal function if debugging is needed
        # return send_chat_prompt(item, user, messages)
        return StreamingResponse(send_chat_prompt(item, user, messages), media_type="text/event-stream")
    except Exception as e:
        return {"error": str(e)}
    
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
