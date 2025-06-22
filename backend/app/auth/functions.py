from app.auth.supabase_client import supabase

def create_temp_user():
    supabase.auth.sign_in_anonymously()
    return supabase.auth.get_user()

def get_temp_user():
    return supabase.auth.get_user()