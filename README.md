# Q2 Chat

## To do

- Frontend container needs to be created

## Start up

```
docker compose up -d
```

## Architecture & Data Model

### Components

- **Supabase**: Hosts our Postgres database, Auth service, and Realtime streams.
- **Backend (FastAPI)**: Provides LLM‐driven chat endpoints, handles provider API calls.
- **Frontend (Expo/React Native + Web)**: UI for signing in, viewing chat history, and streaming AI responses.
- **LLM Providers**: Abstracted in the `llm_providers` table so you can plug in multiple APIs.

### Database Tables

- **users**:  
  Stores authenticated users (UUID + email + created_at). Ties every chat and message to its owner for sync.

- **llm_providers**  
  Enumerates available LLM endpoints (name + api_url + api_key + model + created_at).  
  Lets you switch between different models (e.g. OpenAI, OpenRouter, Anthropic) at runtime.  

- **chats**  
  One row per conversation thread (`id`, `user_id` → `users.id`, title, created_at).  
  Enables users to list, title, and revisit past chats.  

- **messages**  
  All messages in a chat (`id`, `chat_id` → `chats.id`, `provider_id` → `llm_providers.id`,  
  `speaker` (user/assistant/system), content, created_at).  
  Persistent history and realtime updates via Supabase Realtime.  