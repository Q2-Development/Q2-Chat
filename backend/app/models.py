from typing import Optional
from pydantic import BaseModel

class LoginItem(BaseModel):
    email: str
    password: str

class PromptItem(BaseModel):
    key: Optional[str] = None
    chatId: Optional[str] = None
    model: str
    prompt: str

class KeyItem(BaseModel):
    key: str