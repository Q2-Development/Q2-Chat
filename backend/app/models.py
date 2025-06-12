from pydantic import BaseModel

class LoginItem(BaseModel):
    email: str
    password: str

class PromptItem(BaseModel):
    model: str
    prompt: str