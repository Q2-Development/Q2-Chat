from typing import Optional, Dict, Any
from pydantic import BaseModel

class LoginItem(BaseModel):
    email: str
    password: str

class PromptItem(BaseModel):
    key: Optional[str] = None
    chatId: Optional[str] = None
    model: str
    prompt: str

class UpdateTitleItem(BaseModel):
    title: str

class KeyItem(BaseModel):
    key: str
      
class UserPreferences(BaseModel):
    defaultModel: str = "openai/gpt-4o"
    messageDisplay: str = "comfortable" 
    autoSave: bool = True
    soundEnabled: bool = False
    keyboardShortcuts: bool = True
    theme: str = "dark"

class UpdatePreferencesItem(BaseModel):
    preferences: Dict[str, Any]

class UpdateApiKeyItem(BaseModel):
    apiKey: str
