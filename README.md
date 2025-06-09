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
