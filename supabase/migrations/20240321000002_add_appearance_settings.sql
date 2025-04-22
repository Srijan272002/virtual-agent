-- Create appearance_settings table
create table "public"."appearance_settings" (
    "id" uuid default gen_random_uuid() primary key,
    "user_id" uuid references public.profiles(id) on delete cascade not null,
    "setting_name" text not null,
    "setting_value" text not null,
    "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    "updated_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    unique ("user_id", "setting_name")
);

-- Set up Row Level Security (RLS)
alter table "public"."appearance_settings" enable row level security;

create policy "Users can perform all actions on their own appearance settings"
    on "public"."appearance_settings"
    for all
    using (auth.uid() = user_id);

-- Create index for better query performance
create index "appearance_settings_user_id_idx" on "public"."appearance_settings" ("user_id");

-- Set up trigger for updated_at column
create trigger "set_appearance_settings_updated_at"
    before update on "public"."appearance_settings"
    for each row
    execute function "public"."handle_updated_at"(); 