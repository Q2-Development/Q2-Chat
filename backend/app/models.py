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
    web: bool = False
    max_results: int = 5

class UpdateTitleItem(BaseModel):
    title: str

class KeyItem(BaseModel):
    key: str

