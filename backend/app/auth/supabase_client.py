from supabase import create_client, Client
import dotenv
import os

dotenv.load_dotenv()
supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_ANON_KEY"]
)