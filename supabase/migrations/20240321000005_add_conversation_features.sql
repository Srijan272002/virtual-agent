-- Create conversation_suggestions table
CREATE TABLE "public"."conversation_suggestions" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    "topic" text NOT NULL,
    "description" text,
    "category" text NOT NULL,
    "used" boolean DEFAULT false NOT NULL,
    "created_at" timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updated_at" timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create special_moments table
CREATE TABLE "public"."special_moments" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    "title" text NOT NULL,
    "description" text,
    "moment_type" text NOT NULL, -- anniversary, milestone, birthday, achievement
    "date" timestamp WITH time zone NOT NULL,
    "is_recurring" boolean DEFAULT false NOT NULL,
    "recurrence_pattern" text, -- yearly, monthly, etc.
    "is_celebrated" boolean DEFAULT false NOT NULL,
    "created_at" timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updated_at" timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create interaction_patterns table
CREATE TABLE "public"."interaction_patterns" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    "pattern_type" text NOT NULL, -- daily, weekly, custom
    "days_of_week" integer[], -- 0-6 for Sunday-Saturday
    "time_of_day" time,
    "topic_category" text,
    "is_active" boolean DEFAULT true NOT NULL,
    "last_triggered" timestamp WITH time zone,
    "created_at" timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updated_at" timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create predefined_conversation_topics table for system-defined topics
CREATE TABLE "public"."predefined_conversation_topics" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "topic" text NOT NULL,
    "description" text NOT NULL,
    "category" text NOT NULL,
    "difficulty" integer DEFAULT 1 NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
    "created_at" timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE "public"."conversation_suggestions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can perform all actions on their own conversation suggestions"
    ON "public"."conversation_suggestions"
    FOR ALL
    USING (auth.uid() = user_id);

ALTER TABLE "public"."special_moments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can perform all actions on their own special moments"
    ON "public"."special_moments"
    FOR ALL
    USING (auth.uid() = user_id);

ALTER TABLE "public"."interaction_patterns" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can perform all actions on their own interaction patterns"
    ON "public"."interaction_patterns"
    FOR ALL
    USING (auth.uid() = user_id);

ALTER TABLE "public"."predefined_conversation_topics" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read predefined conversation topics"
    ON "public"."predefined_conversation_topics"
    FOR SELECT
    USING (true);

-- Create indexes for better query performance
CREATE INDEX "conversation_suggestions_user_id_idx" ON "public"."conversation_suggestions" ("user_id");
CREATE INDEX "conversation_suggestions_category_idx" ON "public"."conversation_suggestions" ("category");
CREATE INDEX "conversation_suggestions_used_idx" ON "public"."conversation_suggestions" ("used");

CREATE INDEX "special_moments_user_id_idx" ON "public"."special_moments" ("user_id");
CREATE INDEX "special_moments_date_idx" ON "public"."special_moments" ("date");
CREATE INDEX "special_moments_moment_type_idx" ON "public"."special_moments" ("moment_type");

CREATE INDEX "interaction_patterns_user_id_idx" ON "public"."interaction_patterns" ("user_id");
CREATE INDEX "interaction_patterns_is_active_idx" ON "public"."interaction_patterns" ("is_active");

CREATE INDEX "predefined_conversation_topics_category_idx" ON "public"."predefined_conversation_topics" ("category");

-- Set up triggers for updated_at columns
CREATE TRIGGER "set_conversation_suggestions_updated_at"
    BEFORE UPDATE ON "public"."conversation_suggestions"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."handle_updated_at"();

CREATE TRIGGER "set_special_moments_updated_at"
    BEFORE UPDATE ON "public"."special_moments"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."handle_updated_at"();

CREATE TRIGGER "set_interaction_patterns_updated_at"
    BEFORE UPDATE ON "public"."interaction_patterns"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."handle_updated_at"();

-- Insert some predefined conversation topics
INSERT INTO "public"."predefined_conversation_topics" (topic, description, category, difficulty) VALUES
('Childhood Memories', 'Share favorite memories from your childhood', 'Personal', 1),
('Dream Travel Destinations', 'Discuss places you would love to visit someday', 'Travel', 1),
('Favorite Movies', 'Talk about movies that have left an impression on you', 'Entertainment', 1),
('Life Goals', 'Share your aspirations and what you want to achieve', 'Personal', 2),
('Book Recommendations', 'Discuss books that have changed your perspective', 'Culture', 2),
('Music Tastes', 'Talk about your favorite songs, artists, or concerts', 'Entertainment', 1),
('Philosophical Questions', 'Explore deep questions about life and existence', 'Philosophy', 3),
('Career Aspirations', 'Discuss your career path and professional goals', 'Work', 2),
('Hobbies and Interests', 'Share activities you enjoy in your free time', 'Lifestyle', 1),
('Dream Home', 'Describe your ideal living space and location', 'Lifestyle', 1),
('Food Adventures', 'Talk about culinary experiences and favorite dishes', 'Food', 1),
('Pet Stories', 'Share stories about pets, past or present', 'Personal', 1),
('Technology Impact', 'Discuss how technology has changed your life', 'Technology', 2),
('Relationship Values', 'Talk about what you value most in relationships', 'Relationships', 3),
('Bucket List', 'Share experiences you hope to have in your lifetime', 'Personal', 2),
('Favorite Holidays', 'Discuss holidays you enjoy celebrating', 'Culture', 1),
('Fitness Journey', 'Talk about your relationship with exercise and health', 'Health', 2),
('Creative Pursuits', 'Discuss any artistic or creative activities you enjoy', 'Art', 2),
('Future Predictions', 'Share thoughts on how you see the future unfolding', 'Future', 3),
('Cultural Differences', 'Explore different cultural practices and perspectives', 'Culture', 3); 