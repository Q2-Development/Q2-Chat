-- Add a foreign‐key so public.users.id always points at auth.users.id
alter table public.users
    add constraint fk_users_to_auth_users
    foreign key (id)
    references auth.users (id)
    on delete cascade;