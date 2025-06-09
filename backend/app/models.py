from pydantic import BaseModel

class LoginItem(BaseModel):
    email: str
    password: str