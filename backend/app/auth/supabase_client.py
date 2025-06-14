from supabase import create_client, Client
import dotenv
import os
from pathlib import Path

dotenv.load_dotenv(Path(__file__).parent.parent / ".env")
supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_ANON_KEY"]
)