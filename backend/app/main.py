from fastapi import FastAPI
from fastapi.requests import Request
from fastapi.responses import StreamingResponse
from supabase import create_client, Client
from openai import OpenAI
from app.models import LoginItem, PromptItem
import requests
import json
import dotenv
import os
import gotrue

DEBUG = True

app = FastAPI()

dotenv.load_dotenv()

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key=os.getenv("OPENAI_API_KEY"),
)

supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_ANON_KEY"))

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


def send_chat_prompt(item: PromptItem):
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {os.getenv("OPENAI_API_KEY")}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": item.model,
        "messages": [{"role": "user", "content": item.prompt}],
        "stream": True
    }

    with requests.post(url, headers=headers, json=payload, stream=True) as r:
        for line in r.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data: "):
                continue
            data = line[len("data: "):]
            if data == "[DONE]":
                break
            try:
                data_obj = json.loads(data)
                delta = data_obj["choices"][0]["delta"]
                content = delta.get("content")
                if content:
                    yield content
            except json.JSONDecodeError:
                continue

@app.post("/chat")
def chat(request: Request, item: PromptItem):
    return StreamingResponse(send_chat_prompt(item), media_type="text/event-stream")