-- Create user_feedback table for conversation ratings
create table "public"."conversation_ratings" (
    "id" uuid default gen_random_uuid() primary key,
    "user_id" uuid references public.profiles(id) on delete cascade not null,
    "conversation_id" uuid references public.conversations(id) on delete cascade not null,
    "rating" integer not null check (rating >= 1 and rating <= 5),
    "feedback" text,
    "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    unique ("user_id", "conversation_id")
);

-- Create feature_suggestions table for user suggestions
create table "public"."feature_suggestions" (
    "id" uuid default gen_random_uuid() primary key,
    "user_id" uuid references public.profiles(id) on delete cascade not null,
    "category" text not null,
    "title" text not null,
    "description" text not null,
    "status" text not null default 'pending',
    "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    "updated_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table "public"."conversation_ratings" enable row level security;

create policy "Users can perform all actions on their own conversation ratings"
    on "public"."conversation_ratings"
    for all
    using (auth.uid() = user_id);

alter table "public"."feature_suggestions" enable row level security;

create policy "Users can perform all actions on their own feature suggestions"
    on "public"."feature_suggestions"
    for all
    using (auth.uid() = user_id);

-- Create indexes for better query performance
create index "conversation_ratings_user_id_idx" on "public"."conversation_ratings" ("user_id");
create index "conversation_ratings_conversation_id_idx" on "public"."conversation_ratings" ("conversation_id");
create index "feature_suggestions_user_id_idx" on "public"."feature_suggestions" ("user_id");
create index "feature_suggestions_status_idx" on "public"."feature_suggestions" ("status");

-- Set up trigger for updated_at column
create trigger "set_feature_suggestions_updated_at"
    before update on "public"."feature_suggestions"
    for each row
    execute function "public"."handle_updated_at"(); 