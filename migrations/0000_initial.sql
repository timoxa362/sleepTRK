
CREATE TABLE IF NOT EXISTS "time_entries" (
  "id" SERIAL PRIMARY KEY,
  "type" text NOT NULL,
  "time" text NOT NULL,
  "date" date NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sleep_settings" (
  "id" SERIAL PRIMARY KEY,
  "required_sleep_minutes" integer NOT NULL,
  "scheduled_nap_time" text,
  "scheduled_bedtime" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
