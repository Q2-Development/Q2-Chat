from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class LoginItem(BaseModel):
    email: str
    password: str

class PromptItem(BaseModel):
    chatId: Optional[str] = None
    model: str
    prompt: str