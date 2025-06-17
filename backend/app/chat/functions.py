from app.models import PromptItem
from .prompts import SYSTEM_PROMPT
from app.auth.supabase_client import supabase
from postgrest.base_request_builder import APIResponse
from pathlib import Path
from typing import Optional

import dotenv
import os
import json
import gotrue
import base64
import requests
import logging
import gotrue

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger(__name__)

dotenv.load_dotenv(Path(__file__).parent.parent / ".env")

kdf = PBKDF2HMAC(
    algorithm=hashes.SHA256(),
    length=32,
    salt=os.getenv("ENCRYPTION_KEY").encode(),
    iterations=1_200_000,
)

encryption_key = base64.urlsafe_b64encode(kdf.derive(os.getenv("ENCRYPTION_KEY").encode()))
fernet = Fernet(encryption_key)
def get_chat_messages(chatId:str):
    return supabase.table("messages") \
        .select("*") \
        .eq("chat_id", chatId) \
        .execute()

def get_user_api_key(user_id: str) -> Optional[str]:
    """Fetches and decrypts the user's OpenRouter API key from user_metadata."""
    try:
        user_data_res = supabase.auth.admin.get_user_by_id(user_id)
        if not user_data_res or not user_data_res.user:
            return None

        meta_data = user_data_res.user.user_metadata or {}
        encrypted_key = meta_data.get("openrouter_api_key")

        if encrypted_key:
            try:
                # The key is stored as a list with one element, handle that
                if isinstance(encrypted_key, list) and len(encrypted_key) > 0:
                    encrypted_key = encrypted_key[0]
                
                if isinstance(encrypted_key, str):
                    return fernet.decrypt(encrypted_key.encode()).decode()
                
            except Exception as e:
                logger.warning(f"Could not decrypt API key for user {user_id}: {e}")
        return None
    except Exception as e:
        logger.error(f"Error getting user API key for {user_id}: {e}")
        return None

def send_chat_prompt(item: PromptItem, user: gotrue.types.User, messages: APIResponse, key_override: Optional[str] = None):
    logger.info(f"Streaming prompt for chat: {item.chatId}")
    url = "https://openrouter.ai/api/v1/chat/completions"
    
    api_key = key_override or get_user_api_key(user.id) or os.getenv('OPEN_ROUTER_KEY')
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    messagesInApiFormat = [
        {"role": message.get("speaker").lower(), "content": message.get("content")} for message in messages.data
    ]

    if len(messagesInApiFormat) == 0:
        messagesInApiFormat = [{"role": "system", "content": SYSTEM_PROMPT }]
        supabase.table("messages") \
            .insert({"chat_id": item.chatId, "provider_id": item.model, "content": SYSTEM_PROMPT, "speaker": "System", "user_id": user.id}) \
            .execute()

    payload = {
        "model": item.model,
        "messages": [
            *messagesInApiFormat,
            {"role": "user", "content": item.prompt}
        ],
        "stream": True
    }

    supabase.table("messages") \
        .insert({"chat_id": item.chatId, "provider_id": item.model, "content": item.prompt, "speaker": "User", "user_id": user.id}) \
        .execute()
    
    response = []
    with requests.post(url, headers=headers, json=payload, stream=True) as r:
        r.raise_for_status()
        r.encoding = 'utf-8'
        for line in r.iter_lines(decode_unicode=True):
            if not line.startswith("data: "):
                continue
            chunk = line[len("data: "):]
            if chunk == "[DONE]":
                break
            try:
                delta = json.loads(chunk)["choices"][0]["delta"].get("content")
                if delta:
                    response.append(delta)
                    yield delta
            except Exception:
                continue

    supabase.table("messages") \
        .insert({"chat_id": item.chatId, "provider_id": item.model, "content": "".join(response), "speaker": "Assistant", "user_id": user.id}) \
        .execute()

def generate_chat_title(prompt: str) -> str:
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f'Bearer {os.getenv("OPEN_ROUTER_KEY")}',
        "Content-Type": "application/json"
    }
    
    system = (
        "You are an assistant that creates concise chat titles. "
        "When given the user's very first message, you should: "
        "1) Summarize the core topic or intent in exactly 1-3 words. "
        "2) Capitalize each significant word (Title Case). "
        "3) Omit filler words, punctuation, and quotes. "
        "4) Ensure the title clearly reflects the user's goal."
    )
    
    payload = {
        "model": "gpt-4", 
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 5,
        "temperature": 0.2
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        raw = data["choices"][0]["message"]["content"] or "Untitled Chat"
        return raw.strip().strip('"')
    except Exception as e:
        logger.error(f"Error generating chat title: {str(e)}")
        return "Untitled Chat"

def stream_multimodal(item: PromptItem, file_field: dict, user_id: str):
    url = "https://openrouter.ai/api/v1/chat/completions"
    
    # Get user's API key or fallback to system key
    api_key = get_user_api_key(user_id)
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type":  "application/json"
    }

    # 1) record user prompt
    supabase.table("messages").insert({
        "chat_id":     item.chatId,
        "provider_id": item.model,
        "content":     item.prompt,
        "speaker":     "User"
    }).execute()

    # 2) build payload
    multimodal = {
        "role":    "user",
        "content": [
            {"type": "text",      "text": item.prompt},
            file_field
        ]
    }
    payload = {"model": item.model, "messages": [multimodal], "stream": True}

    # 3) stream the response
    buffer = []
    with requests.post(url, headers=headers, json=payload, stream=True) as r:
        r.raise_for_status()
        r.encoding = 'utf-8'
        for line in r.iter_lines(decode_unicode=True):
            if not line.startswith("data: "):
                continue
            chunk = line[len("data: "):]
            if chunk == "[DONE]":
                break
            try:
                delta = json.loads(chunk)["choices"][0]["delta"].get("content")
                if delta:
                    buffer.append(delta)
                    yield delta
            except Exception:
                continue

    # 4) record assistant reply
    full = "".join(buffer)
    supabase.table("messages").insert({
        "chat_id":     item.chatId,
        "provider_id": item.model,
        "content":     full,
        "speaker":     "Assistant"
    }).execute()


def send_image_prompt(item: PromptItem, file_bytes: bytes, content_type: str, user_id: str):
    b64 = base64.b64encode(file_bytes).decode("utf-8")
    data_url = f"data:{content_type};base64,{b64}"
    file_field = {"type": "image_url", "image_url": {"url": data_url}}
    return stream_multimodal(item, file_field, user_id)

def send_pdf_prompt(item: PromptItem, file_bytes: bytes, content_type: str, filename: str, user_id: str):
    b64 = base64.b64encode(file_bytes).decode("utf-8")
    data_url = f"data:{content_type};base64,{b64}"
    file_field = {
        "type": "file",
        "file": {
            "filename": filename or "upload.pdf",
            "file_data": data_url
        }
    }
    # 3. Use the generic multimodal streamer to send the request
    # return stream_multimodal(item, file_field, item.chatId)
    return stream_multimodal(item, file_field, user_id)
