-- ====================================================================
-- Enable RLS & Policies on chats and messages
-- Core Req: Authentication & Sync
-- ====================================================================

-- Enable RLS on chats
alter table public.chats enable row level security;

-- Policy: only allow users to select their own chats
create policy "select_own_chats" on public.chats
    for select using ( auth.uid() = user_id );

-- Policy: only allow users to insert chats for themselves
create policy "insert_own_chats" on public.chats
    for insert with check ( auth.uid() = user_id );



-- Enable RLS on messages
alter table public.messages enable row level security;

-- Policy: only allow users to select messages in their own chats
create policy "select_own_messages" on public.messages
    for select using (
        chat_id in ( select id from public.chats where user_id = auth.uid() )
    );

-- Policy: only allow users to insert messages in their own chats
create policy "insert_own_messages" on public.messages
    for insert with check (
        chat_id in ( select id from public.chats where user_id = auth.uid() )
    );