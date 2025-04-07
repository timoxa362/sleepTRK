CREATE TABLE "sleep_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"required_sleep_minutes" integer NOT NULL,
	"scheduled_nap_time" text,
	"scheduled_bedtime" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"time" text NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
