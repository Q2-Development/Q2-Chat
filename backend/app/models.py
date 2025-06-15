from typing import Optional
from pydantic import BaseModel

class LoginItem(BaseModel):
    email: str
    password: str

class PromptItem(BaseModel):
    chatId: Optional[str] = None
    model: str
    prompt: str

class UpdateTitleItem(BaseModel):
    title: str