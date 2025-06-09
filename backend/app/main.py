from typing import Union

from fastapi import FastAPI
from supabase import create_client, Client
from app.models import LoginItem
import dotenv
import os

app = FastAPI()

dotenv.load_dotenv()
supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_ANON_KEY"]
)

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
    if (item.email == None or item.email == ""): return None

    response = supabase.auth.sign_in_with_password(
        {
            "email": item.email,
            "password": item.password
        }
    )
    return response.user

@app.get("/logout")
def get_logout():
    supabase.auth.sign_out()
    return True

@app.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}