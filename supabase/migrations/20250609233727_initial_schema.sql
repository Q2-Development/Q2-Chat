-- ====================================================================
-- Table: users
-- Purpose: Store each authenticated user so we can tie chats & messages
--          to an account and sync across devices.
-- ====================================================================
create table if not exists users (
    id uuid primary key default gen_random_uuid(),
    email text unique not null,
    created_at timestamp with time zone default now()
);

-- ====================================================================
-- Table: llm_providers
-- Purpose: Store available LLM endpoints (e.g., OpenAI, Anthropic),
--          so the frontend/backend can switch between them at runtime.
-- ====================================================================
create table if not exists llm_providers (
    id uuid primary key default gen_random_uuid(), -- unique provider ID
    name text not null, -- display name
    api_url text not null, -- HTTP endpoint
    api_key text not null, -- credential
    created_at timestamp with time zone default now(), -- registration date
	model text not null default '' -- specific model name (e.g. "gpt-4o-mini")
);

-- ====================================================================
-- Table: chats
-- Purpose: Represent a conversation thread so users can have multiple
--          chat sessions (and title or list them).
-- ====================================================================
create table if not exists chats (
    id uuid primary key default gen_random_uuid(), -- unique chat ID
    user_id uuid not null references users(id) on delete cascade, -- owner
    title text, -- optional chat title
    created_at timestamp with time zone default now() -- when created
);

-- ====================================================================
-- Table: messages
-- Purpose: Store each message in a chat, including who sent it (user vs AI),
--          which LLM provider/model was used, and the timestamp.
-- ====================================================================
create table if not exists messages (
    id uuid primary key default gen_random_uuid(), -- unique message ID
    chat_id uuid not null references chats(id) on delete cascade, -- parent chat
    provider_id uuid not null references llm_providers(id), -- which LLM/provider
    speaker text not null check (speaker in ('user','assistant','system')), -- who is speaking
    content text not null, -- message text
    created_at timestamp with time zone default now() -- when sent
);