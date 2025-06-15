from fastapi import UploadFile
from app.models import PromptItem
from .prompts import SYSTEM_PROMPT
from app.auth.supabase_client import supabase
from postgrest.base_request_builder import APIResponse
from pathlib import Path

import dotenv
import os
import json
import gotrue
import base64
import requests
import logging
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

# Send chat
def send_chat_prompt(item: PromptItem, user: gotrue.types.User, messages: APIResponse, key: str):
    logger.info(f"Prompt: {item.prompt}")
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {key if (key != None and key != '') else os.getenv('OPENAI_API_KEY')}",
        "Content-Type": "application/json"
    }

    # Change the messages from their DB form to a object compatible with the api
    messagesInApiFormat = [
        {"role": message.get("speaker").lower(), "content": message.get("content")} for message in messages.data
    ]

    if len(messagesInApiFormat) == 0:
        messagesInApiFormat = [{"role": "system", "content": SYSTEM_PROMPT }]
        supabase.table("messages") \
            .insert({"chat_id": item.chatId, "provider_id": item.model, "content": SYSTEM_PROMPT, "speaker": "System"}) \
            .execute()
    print(messagesInApiFormat)
    # return

    # Actual API payload
    payload = {
        "model": item.model,
        "messages": [
            *messagesInApiFormat,
            {"role": "user", "content": item.prompt}
        ],
        "stream": True
    }
    print(payload["messages"])

    supabase.table("messages") \
        .insert({"chat_id": item.chatId, "provider_id": item.model, "content": item.prompt, "speaker": "User"}) \
        .execute()
    # Stream the response back to the client
    response = []
    with requests.post(url, headers=headers, json=payload, stream=True) as r:
        for line in r.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data: "):
                continue
            data = line[len("data: "):]
            if data == "[DONE]":
                print(f"R: {"".join(response)}")

                # Save the assistant's response in the database
                supabase.table("messages") \
                    .insert({"chat_id": item.chatId, "provider_id": item.model, "content": "".join(response), "speaker": "Assistant"}) \
                    .execute()
                break
            try:
                data_obj = json.loads(data)
                delta = data_obj["choices"][0]["delta"]

                # Encode to properly handle emojis and special characters.
                content = delta.get("content").encode('latin1').decode('utf-8')
                if content:
                    response.append(content)
                    yield content
            except json.JSONDecodeError:
                continue

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

def stream_multimodal(item: PromptItem, file_field: dict):
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}",
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


def send_image_prompt(item: PromptItem, file_bytes: bytes, content_type: str):
    b64 = base64.b64encode(file_bytes).decode("utf-8")
    data_url = f"data:{content_type};base64,{b64}"
    file_field = {"type": "image_url", "image_url": {"url": data_url}}
    # simply return the generator
    return stream_multimodal(item, file_field)


def send_pdf_prompt(item: PromptItem, file_bytes: bytes, content_type: str):
    b64 = base64.b64encode(file_bytes).decode("utf-8")
    data_url = f"data:{content_type};base64,{b64}"
    file_field = {
        "type": "file",
        "file": {
            "filename": getattr(item, "filename", "upload.pdf"),
            "file_data": data_url
        }
    }
    return stream_multimodal(item, file_field)


