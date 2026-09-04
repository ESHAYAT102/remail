ALTER TABLE "user_preferences" ADD COLUMN "keybinds" jsonb DEFAULT '{}'::jsonb NOT NULL;
