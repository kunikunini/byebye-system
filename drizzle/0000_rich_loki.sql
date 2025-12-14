CREATE TYPE "public"."capture_kind" AS ENUM('front', 'back', 'spine', 'label', 'other');--> statement-breakpoint
CREATE TYPE "public"."item_type" AS ENUM('VINYL', 'CD', 'BOOK');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('UNPROCESSED', 'IDENTIFIED', 'READY', 'LISTED', 'SOLD');--> statement-breakpoint
CREATE TABLE "captures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"kind" "capture_kind" NOT NULL,
	"storage_path" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" text NOT NULL,
	"item_type" "item_type" NOT NULL,
	"status" "status" DEFAULT 'UNPROCESSED' NOT NULL,
	"title" text,
	"artist" text,
	"catalog_no" text,
	"notes" text DEFAULT '',
	"storage_location" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "items_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
ALTER TABLE "captures" ADD CONSTRAINT "captures_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;