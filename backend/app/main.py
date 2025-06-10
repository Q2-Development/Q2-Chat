from typing import Union

from fastapi import FastAPI
from app.models import LoginItem
from app.supabase_client import supabase


app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("/supabase/health")
async def supabase_health():
    try:
        result = supabase.from_("users").select("id").limit(1).execute()
        return {"status": "ok", "rows_returned": len(result.data or [])}
    except Exception as e:
        return {"status": "error", "message": str(e)}


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