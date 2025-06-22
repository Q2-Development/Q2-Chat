# In backend/app/models.py

from typing import Optional, Dict, Any, List
from pydantic import BaseModel

class LoginItem(BaseModel):
    email: str
    password: str

class PromptItem(BaseModel):
    key: Optional[str] = None
    chatId: str  # Changed to be required
    model: str
    prompt: str
    webSearchEnabled: Optional[bool] = False

class UpdateTitleItem(BaseModel):
    title: str

class KeyItem(BaseModel):
    key: str
    
class ApiKeyStatus(BaseModel):
    hasKey: bool
    maskedKey: Optional[str] = None

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

class ChatCreationRequest(BaseModel):
    model: str
    message: str

class MessageResponse(BaseModel):
    id: str
    created_at: str
    speaker: str
    content: str

class ChatResponse(BaseModel):
    id: str
    user_id: str
    title: str
    model: str
    messages: List[MessageResponse] = []
    
class TitleUpdate(BaseModel):
    title: str
    
class SignupItem(BaseModel):
    email: str
    password: str
    openrouter_api_key: str

class UserResponse(BaseModel):
    id: str
    email: str
    has_api_key: bool
    created_at: str

class ValidateApiKeyRequest(BaseModel):
    api_key: str