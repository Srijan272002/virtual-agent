-- Enable necessary extensions
create extension if not exists "vector" with schema "public";

-- Create profiles table
create table "public"."profiles" (
    "id" uuid references auth.users on delete cascade not null primary key,
    "username" text unique,
    "full_name" text,
    "avatar_url" text,
    "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    "updated_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create conversations table
create table "public"."conversations" (
    "id" uuid default gen_random_uuid() primary key,
    "user_id" uuid references public.profiles(id) on delete cascade not null,
    "title" text,
    "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    "updated_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    "last_message_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create messages table
create table "public"."messages" (
    "id" uuid default gen_random_uuid() primary key,
    "conversation_id" uuid references public.conversations(id) on delete cascade not null,
    "content" text not null,
    "role" text not null check (role in ('user', 'assistant')),
    "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    "embedding" vector(768) -- For semantic search
);

-- Create personality_traits table
create table "public"."personality_traits" (
    "id" uuid default gen_random_uuid() primary key,
    "user_id" uuid references public.profiles(id) on delete cascade not null,
    "trait_name" text not null,
    "trait_value" integer check (trait_value >= 0 and trait_value <= 100),
    "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    "updated_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    unique ("user_id", "trait_name")
);

-- Create memories table for long-term context
create table "public"."memories" (
    "id" uuid default gen_random_uuid() primary key,
    "user_id" uuid references public.profiles(id) on delete cascade not null,
    "content" text not null,
    "importance" integer check (importance >= 1 and importance <= 10),
    "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    "last_accessed" timestamp with time zone default timezone('utc'::text, now()) not null,
    "embedding" vector(768) -- For semantic search
);

-- Set up Row Level Security (RLS)

-- Profiles: Users can read any profile but only update their own
alter table "public"."profiles" enable row level security;

create policy "Profiles are viewable by everyone"
    on "public"."profiles"
    for select
    using (true);

create policy "Users can update their own profile"
    on "public"."profiles"
    for update
    using (auth.uid() = id);

-- Conversations: Users can only access their own conversations
alter table "public"."conversations" enable row level security;

create policy "Users can perform all actions on their own conversations"
    on "public"."conversations"
    for all
    using (auth.uid() = user_id);

-- Messages: Users can only access messages from their conversations
alter table "public"."messages" enable row level security;

create policy "Users can perform all actions on messages in their conversations"
    on "public"."messages"
    for all
    using (
        exists (
            select 1 from public.conversations
            where id = messages.conversation_id
            and user_id = auth.uid()
        )
    );

-- Personality Traits: Users can only access their own personality traits
alter table "public"."personality_traits" enable row level security;

create policy "Users can perform all actions on their own personality traits"
    on "public"."personality_traits"
    for all
    using (auth.uid() = user_id);

-- Memories: Users can only access their own memories
alter table "public"."memories" enable row level security;

create policy "Users can perform all actions on their own memories"
    on "public"."memories"
    for all
    using (auth.uid() = user_id);

-- Create indexes for better query performance
create index "profiles_username_idx" on "public"."profiles" ("username");
create index "conversations_user_id_idx" on "public"."conversations" ("user_id");
create index "conversations_last_message_at_idx" on "public"."conversations" ("last_message_at");
create index "messages_conversation_id_idx" on "public"."messages" ("conversation_id");
create index "messages_embedding_idx" on "public"."messages" using ivfflat (embedding vector_cosine_ops);
create index "memories_user_id_idx" on "public"."memories" ("user_id");
create index "memories_embedding_idx" on "public"."memories" using ivfflat (embedding vector_cosine_ops);

-- Set up triggers for updated_at columns
create or replace function "public"."handle_updated_at"()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create trigger "set_profiles_updated_at"
    before update on "public"."profiles"
    for each row
    execute function "public"."handle_updated_at"();

create trigger "set_conversations_updated_at"
    before update on "public"."conversations"
    for each row
    execute function "public"."handle_updated_at"();

create trigger "set_personality_traits_updated_at"
    before update on "public"."personality_traits"
    for each row
    execute function "public"."handle_updated_at"(); 