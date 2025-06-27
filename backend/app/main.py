from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.requests import Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from postgrest.base_request_builder import APIResponse
from typing import Optional
import httpx
from app import (
    LoginItem, PromptItem, TitleUpdate, SignupItem, ValidateApiKeyRequest, UserResponse, supabase, create_temp_user,
    get_chat_messages, send_chat_prompt, generate_chat_title,
    send_image_prompt, send_pdf_prompt, encryption
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
async def post_signup(item: SignupItem):
    if not item.email or not item.password or not item.openrouter_api_key:
        raise HTTPException(status_code=400, detail="All fields are required")
    
    if not item.openrouter_api_key.startswith('sk-or-'):
        raise HTTPException(status_code=400, detail="Invalid API key format")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://openrouter.ai/api/v1/models",
                headers={"Authorization": f"Bearer {item.openrouter_api_key}"},
                timeout=10.0
            )
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid OpenRouter API key")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Could not validate API key")
    
    encrypted_key = encryption.encrypt_api_key(item.openrouter_api_key)
    
    try:
        response = supabase.auth.sign_up({
            "email": item.email,
            "password": item.password,
            "options": {
                "data": {
                    "encrypted_api_key": encrypted_key
                }
            }
        })
        
        if response.user:
            # Insert user into public.users table
            supabase.table("users").insert({
                "id": response.user.id,
                "email": response.user.email,
                "created_at": "now()"
            }).execute()
            
            # Insert API key
            supabase.table("user_api_keys").insert({
                "user_id": response.user.id,
                "encrypted_key": encrypted_key,
                "created_at": "now()"
            }).execute()
            
            return {"message": "Signup successful", "user": response.user}
        else:
            raise HTTPException(status_code=400, detail="Signup failed")
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/login")
def post_login(item: LoginItem):
    try:
        assert (item.email != None and item.email != "") and (item.password != None and item.password != "")
        auth_response = supabase.auth.sign_in_with_password(
            {
                "email": item.email,
                "password": item.password
            }
        )
        
        # Return session data for frontend to use
        if auth_response.session:
            return {
                "message": "Login successful",
                "session": {
                    "access_token": auth_response.session.access_token,
                    "refresh_token": auth_response.session.refresh_token,
                    "expires_at": auth_response.session.expires_at,
                    "user": {
                        "id": auth_response.user.id,
                        "email": auth_response.user.email,
                        "is_anonymous": auth_response.user.is_anonymous
                    }
                }
            }
        else:
            return {"error": "Failed to create session"}

    except gotrue.errors.AuthApiError as e:
        return {"error": f"Incorrect login credentials: {e.message}"}
    
    except AssertionError:
        return {"error": "Your email and/or password was not inputted"}
        
@app.get("/login_status")
def get_login_status():
    return supabase.auth.get_user()

@app.get("/logout")
def get_logout():
    supabase.auth.sign_out()
    return True

@app.post("/chats/{chat_id}")
def rename_chat_title(chat_id: str, item: TitleUpdate):
    """Update a chat's title."""
    user_resp = supabase.auth.get_user()
    if not user_resp or not user_resp.user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user = user_resp.user
    
    # Update the title in the 'chats' table
    response = supabase.table("chats") \
        .update({"title": item.title}) \
        .eq("id", chat_id) \
        .eq("user_id", user.id) \
        .execute()
    
    # Check if the update was successful
    if not response.data:
        # Investigate why it failed
        chat_exists_res = supabase.table("chats").select("id", count='exact').eq("id", chat_id).execute()
        if chat_exists_res.count == 0:
            raise HTTPException(status_code=404, detail=f"Chat not found: {chat_id}")
        else:
            # The chat exists but doesn't belong to this user or something else went wrong
            raise HTTPException(status_code=403, detail="Access denied or update failed")
            
    return response.data[0]

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

        generated_title = None
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
                generated_title = generate_chat_title(item.prompt)
                supabase.table("chats").update({"title": generated_title}).eq("id", item.chatId).execute()
            except Exception as title_e:
                # Log the error but don't fail the whole request.
                logger.error(f"Could not generate chat title for chat {item.chatId}: {title_e}")
                generated_title = "New Chat"

        # Load messages for context and add the prompt to the db
        print(f"ChatID: {item.chatId}")
        messages = get_chat_messages(item.chatId)
        messages.data.sort(key=lambda m: m.get("created_at"))

        # Create the streaming response with headers
        response = StreamingResponse(send_chat_prompt(item, user, messages), media_type="text/event-stream")
        
        # Add headers for new chats
        if not chat_exists:
            response.headers["X-Chat-Id"] = item.chatId
            if generated_title:
                response.headers["X-Chat-Title"] = generated_title
        
        return response
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

@app.get("/chats/{chat_id}/messages")
def get_chat_messages_endpoint(chat_id: str):
    """Get all messages for a specific chat."""
    try:
        # Check if user is authenticated
        user_resp = supabase.auth.get_user()
        if not user_resp:
            logger.info("Guest Mode active")
            user = create_temp_user().user
        else:
            user = user_resp.user
        
        # Verify the chat belongs to the user
        chat_check = supabase.table("chats") \
            .select("id") \
            .eq("id", chat_id) \
            .eq("user_id", user.id) \
            .execute()
        
        if not chat_check.data:
            raise HTTPException(status_code=404, detail="Chat not found or access denied")
        
        # Get messages for the chat
        messages_resp = get_chat_messages(chat_id)
        
        # Sort messages by creation time
        messages = messages_resp.data
        if messages:
            messages.sort(key=lambda m: m.get("created_at", ""))
        
        return {"chatId": chat_id, "messages": messages or []}
        
    except Exception as e:
        logger.error(f"Error fetching messages for chat {chat_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch messages")


@app.get("/user/api-key-status")
async def get_api_key_status(request: Request):
    # Get the Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = auth_header.split(" ")[1]
    
    try:
        # Verify the token with Supabase
        user = supabase.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        result = supabase.table("user_api_keys").select("id").eq("user_id", user.user.id).execute()
        has_key = len(result.data) > 0 if result.data else False
        
        return {"has_api_key": has_key}
    except Exception as e:
        raise HTTPException(status_code=401, detail="Unauthorized")

@app.post("/user/api-key")
async def update_api_key(api_key_request: ValidateApiKeyRequest, request: Request):
    # Get the Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = auth_header.split(" ")[1]
    
    try:
        # Verify the token with Supabase
        user = supabase.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    if not api_key_request.api_key.startswith('sk-or-'):
        raise HTTPException(status_code=400, detail="Invalid API key format")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://openrouter.ai/api/v1/models",
                headers={"Authorization": f"Bearer {api_key_request.api_key}"},
                timeout=10.0
            )
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid OpenRouter API key")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not validate API key")
    
    encrypted_key = encryption.encrypt_api_key(api_key_request.api_key)
    
    supabase.table("user_api_keys").upsert({
        "user_id": user.user.id,
        "encrypted_key": encrypted_key,
        "updated_at": "now()"
    }).execute()
    
    return {"message": "API key updated successfully"}

@app.delete("/user/api-key")
async def delete_api_key(request: Request):
    # Get the Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = auth_header.split(" ")[1]
    
    try:
        # Verify the token with Supabase
        user = supabase.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        supabase.table("user_api_keys").delete().eq("user_id", user.user.id).execute()
        return {"message": "API key deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to delete API key")