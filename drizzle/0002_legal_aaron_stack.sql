CREATE TYPE "public"."rank" AS ENUM('N', 'R', 'SR', 'SSR', 'UR');--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "rank" "rank" DEFAULT 'N' NOT NULL;