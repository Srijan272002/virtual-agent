-- Create relationship_progress table
create table "public"."relationship_progress" (
    "id" uuid default gen_random_uuid() primary key,
    "user_id" uuid references public.profiles(id) on delete cascade not null,
    "level" integer not null default 1,
    "experience" integer not null default 0,
    "next_level_exp" integer not null default 100,
    "milestones" jsonb not null default '[]'::jsonb,
    "relationship_stage" text not null default 'acquaintance',
    "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    "updated_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    unique ("user_id")
);

-- Create relationship_events table to track interactions that affect relationship
create table "public"."relationship_events" (
    "id" uuid default gen_random_uuid() primary key,
    "user_id" uuid references public.profiles(id) on delete cascade not null,
    "event_type" text not null,
    "experience_points" integer not null,
    "description" text,
    "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table "public"."relationship_progress" enable row level security;

create policy "Users can perform all actions on their own relationship progress"
    on "public"."relationship_progress"
    for all
    using (auth.uid() = user_id);

alter table "public"."relationship_events" enable row level security;

create policy "Users can perform all actions on their own relationship events"
    on "public"."relationship_events"
    for all
    using (auth.uid() = user_id);

-- Create indexes for better query performance
create index "relationship_progress_user_id_idx" on "public"."relationship_progress" ("user_id");
create index "relationship_events_user_id_idx" on "public"."relationship_events" ("user_id");
create index "relationship_events_created_at_idx" on "public"."relationship_events" ("created_at");

-- Set up trigger for updated_at column
create trigger "set_relationship_progress_updated_at"
    before update on "public"."relationship_progress"
    for each row
    execute function "public"."handle_updated_at"(); 