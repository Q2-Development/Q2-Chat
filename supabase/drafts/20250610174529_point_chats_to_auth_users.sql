-- Drop the old FK (if any), then point chats.user_id → auth.users(id)
alter table public.chats
    drop constraint if exists chats_user_id_fkey,
    alter column user_id type uuid using user_id::uuid,
    add constraint chats_user_id_fkey
        foreign key (user_id)
        references auth.users(id)
        on delete cascade;
