from fastapi import UploadFile
from postgrest.base_request_builder import APIResponse
from app.models import PromptItem
from .prompts import SYSTEM_PROMPT
from app.auth.supabase_client import supabase
from app.auth.encryption import encryption
from postgrest.base_request_builder import APIResponse

import os
import json
import gotrue
import base64
import requests
import logging

logger = logging.getLogger(__name__)

def get_chat_messages(chatId:str):
    return supabase.table("messages") \
        .select("*") \
        .eq("chat_id", chatId) \
        .execute()

# Send chat
def send_chat_prompt(item: PromptItem, user: gotrue.types.User, messages: APIResponse):
    logger.info(f"Prompt: {item.prompt}")
    
    api_key = None
    if not user.is_anonymous:
        try:
            result = supabase.table("user_api_keys").select("encrypted_key").eq("user_id", user.id).execute()
            if result.data and len(result.data) > 0:
                encrypted_key = result.data[0]['encrypted_key']
                api_key = encryption.decrypt_api_key(encrypted_key)
        except Exception as e:
            logger.error(f"Failed to get user API key: {e}")
        
    openrouter_key = api_key or os.getenv("OPEN_ROUTER_KEY")
    if not openrouter_key:
        raise Exception("No API key available")
            
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f'Bearer {openrouter_key}',
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
                print(f'R: {"".join(response)}')

                # Save the assistant's response in the database
                supabase.table("messages") \
                    .insert({"chat_id": item.chatId, "provider_id": item.model, "content": "".join(response), "speaker": "Assistant"}) \
                    .execute()
                break
            try:
                data_obj = json.loads(data)
                delta = data_obj["choices"][0]["delta"]

                # Get content, handle potential None values
                content = delta.get("content")
                if content:
                    # Remove the problematic encoding/decoding that was causing issues
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

def stream_multimodal(item: PromptItem, user: gotrue.types.User, file_field: dict):
    api_key = None
    if not user.is_anonymous:
        try:
            result = supabase.table("user_api_keys").select("encrypted_key").eq("user_id", user.id).execute()
            if result.data and len(result.data) > 0:
                encrypted_key = result.data[0]['encrypted_key']
                api_key = encryption.decrypt_api_key(encrypted_key)
        except Exception as e:
            logger.error(f"Failed to get user API key: {e}")
        
    openrouter_key = api_key or os.getenv("OPEN_ROUTER_KEY")
    if not openrouter_key:
        raise Exception("No API key available")
    
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {openrouter_key}",
        "Content-Type":  "application/json"
    }

    # 1) record user prompt
    supabase.table("messages").insert({
        "chat_id":     item.chatId,
        "provider_id": item.model,
        "content":     item.prompt,
        "speaker":     "User"
    }).execute()

    # 2) build payload - ensure we use a vision-capable model
    vision_model = get_vision_model(item.model)
    
    multimodal = {
        "role":    "user",
        "content": [
            {"type": "text", "text": item.prompt},
            file_field
        ]
    }
    payload = {"model": vision_model, "messages": [multimodal], "stream": True}

    # 3) stream the response with better error handling
    buffer = []
    try:
        with requests.post(url, headers=headers, json=payload, stream=True) as r:
            if not r.ok:
                # Get the actual error message from OpenRouter
                error_text = r.text
                logger.error(f"OpenRouter API error ({r.status_code}): {error_text}")
                error_msg = f"Error: {r.status_code} - {error_text}"
                supabase.table("messages").insert({
                    "chat_id":     item.chatId,
                    "provider_id": item.model,
                    "content":     error_msg,
                    "speaker":     "Assistant"
                }).execute()
                yield error_msg
                return
                
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
                except Exception as e:
                    logger.error(f"Error parsing stream chunk: {e}")
                    continue
    except Exception as e:
        logger.error(f"Error in stream_multimodal: {str(e)}")
        error_msg = f"Error processing file: {str(e)}"
        supabase.table("messages").insert({
            "chat_id":     item.chatId,
            "provider_id": item.model,
            "content":     error_msg,
            "speaker":     "Assistant"
        }).execute()
        yield error_msg
        return

    # 4) record assistant reply
    full = "".join(buffer)
    if full:  # Only save if we got content
        supabase.table("messages").insert({
            "chat_id":     item.chatId,
            "provider_id": item.model,
            "content":     full,
            "speaker":     "Assistant"
        }).execute()

def get_vision_model(requested_model: str) -> str:
    vision_models = {
        "openai/gpt-4": "openai/gpt-4-vision-preview",
        "openai/gpt-3.5-turbo": "openai/gpt-4-vision-preview",  # Fallback to GPT-4V
        "anthropic/claude-3-sonnet": "anthropic/claude-3-sonnet",  # Already supports vision
        "anthropic/claude-3-haiku": "anthropic/claude-3-haiku",    # Already supports vision
        "google/gemini-pro": "google/gemini-pro-vision",
    }
    return vision_models.get(requested_model, "openai/gpt-4-vision-preview")

def send_image_prompt(item: PromptItem, user: gotrue.types.User, file_bytes: bytes, content_type: str):
    b64 = base64.b64encode(file_bytes).decode("utf-8")
    data_url = f"data:{content_type};base64,{b64}"
    file_field = {"type": "image_url", "image_url": {"url": data_url}}
    return stream_multimodal(item, user, file_field)

def send_pdf_prompt(item: PromptItem, user: gotrue.types.User, file_bytes: bytes, content_type: str):
    """
    Handle PDF files by converting to text first, since most LLMs don't support PDF directly.
    We'll use a text-based approach similar to CSV handling.
    """
    try:
        # For now, we'll treat PDFs as text files and use the text approach
        # In the future, you could integrate a PDF parser like PyPDF2 or pdfplumber
        
        # Create a text-based prompt explaining the PDF
        enhanced_prompt = f"""
            {item.prompt}

            I've received a PDF file named "{getattr(item, 'filename', 'document.pdf')}". 
            Unfortunately, I cannot directly read PDF files in this format. 

            To help you with this PDF, please:
            1. Copy and paste the text content from the PDF, or
            2. Convert the PDF to text format and share it, or  
            3. Tell me what specific information you're looking for and I can guide you on how to extract it.

            What would you like to do with this PDF?
        """
        
        # Use the regular chat prompt function with enhanced text
        return send_text_prompt(item, user, enhanced_prompt)
        
    except Exception as e:
        logger.error(f"Error processing PDF file: {str(e)}")
        error_msg = f"Error processing PDF file: {str(e)}"
        return send_text_prompt(item, user, error_msg)

def send_text_prompt(item: PromptItem, user: gotrue.types.User, prompt_text: str):
    """
    (used for CSV and PDF fallbacks)
    """
    api_key = None
    if not user.is_anonymous:
        try:
            result = supabase.table("user_api_keys").select("encrypted_key").eq("user_id", user.id).execute()
            if result.data and len(result.data) > 0:
                encrypted_key = result.data[0]['encrypted_key']
                api_key = encryption.decrypt_api_key(encrypted_key)
        except Exception as e:
            logger.error(f"Failed to get user API key: {e}")
        
    openrouter_key = api_key or os.getenv("OPEN_ROUTER_KEY")
    if not openrouter_key:
        raise Exception("No API key available")
    
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {openrouter_key}",
        "Content-Type":  "application/json"
    }

    # Record user prompt
    supabase.table("messages").insert({
        "chat_id":     item.chatId,
        "provider_id": item.model,
        "content":     item.prompt + " [File uploaded]",
        "speaker":     "User"
    }).execute()

    # Build payload for text-based analysis
    payload = {
        "model": item.model, 
        "messages": [
            {"role": "user", "content": prompt_text}
        ], 
        "stream": True
    }

    # Stream the response
    buffer = []
    try:
        with requests.post(url, headers=headers, json=payload, stream=True) as r:
            if not r.ok:
                error_text = r.text
                logger.error(f"OpenRouter API error ({r.status_code}): {error_text}")
                error_msg = f"Error: {r.status_code} - {error_text}"
                supabase.table("messages").insert({
                    "chat_id":     item.chatId,
                    "provider_id": item.model,
                    "content":     error_msg,
                    "speaker":     "Assistant"
                }).execute()
                yield error_msg
                return
                
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
    except Exception as e:
        logger.error(f"Error in send_text_prompt: {str(e)}")
        error_msg = f"Error processing request: {str(e)}"
        supabase.table("messages").insert({
            "chat_id":     item.chatId,
            "provider_id": item.model,
            "content":     error_msg,
            "speaker":     "Assistant"
        }).execute()
        yield error_msg
        return

    # Record assistant reply
    full = "".join(buffer)
    if full:
        supabase.table("messages").insert({
            "chat_id":     item.chatId,
            "provider_id": item.model,
            "content":     full,
            "speaker":     "Assistant"
        }).execute()