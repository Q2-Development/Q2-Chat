from fastapi import Request, HTTPException
from typing import Optional
import gotrue

from app.auth.supabase_client import supabase


def create_temp_user():
    supabase.auth.sign_in_anonymously()
    return supabase.auth.get_user()

def get_temp_user():
    return supabase.auth.get_user()

def get_current_user(request: Request) -> gotrue.types.User:
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    
    token = auth_header.split(" ")[1]
    try:
        user_response = supabase.auth.get_user(token)
        return user_response.user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication token")