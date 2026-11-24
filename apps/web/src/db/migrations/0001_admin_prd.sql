CREATE TYPE "public"."delivery_status" AS ENUM('QUEUED', 'DELIVERED', 'FAILED');--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "capacity" integer;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "map_url" text;--> statement-breakpoint
ALTER TABLE "standings" ADD COLUMN "manual_rank_reason" text;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "revision_of_id" uuid;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "category" varchar(80);--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "highlight_player_id" uuid;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "external_url" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament_rules" ADD COLUMN "revision_of_id" uuid;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "delivery_status" "delivery_status" DEFAULT 'QUEUED' NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "failure_reason" text;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "team_id" uuid;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "match_id" uuid;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "available" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_highlight_player_id_players_id_fk" FOREIGN KEY ("highlight_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;
