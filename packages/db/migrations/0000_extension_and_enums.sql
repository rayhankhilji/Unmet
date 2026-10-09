CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."claim_kind" AS ENUM('support', 'counter', 'fit', 'uncertainty');--> statement-breakpoint
CREATE TYPE "public"."cost_band" AS ENUM('under_500', '500_2k', '2k_10k');--> statement-breakpoint
CREATE TYPE "public"."eval_suite" AS ENUM('extraction', 'traps', 'backtest', 'comparison');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('status', 'model_call', 'tool_call', 'tool_result', 'finding_recorded', 'error', 'note');--> statement-breakpoint
CREATE TYPE "public"."evidence_source" AS ENUM('transcript', 'caption', 'frame', 'comment');--> statement-breakpoint
CREATE TYPE "public"."extract_status" AS ENUM('pending', 'extracting', 'complete', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."fit_rating" AS ENUM('strong', 'moderate', 'poor');--> statement-breakpoint
CREATE TYPE "public"."follower_tier" AS ENUM('nano', 'micro', 'mid', 'macro');--> statement-breakpoint
CREATE TYPE "public"."ingest_status" AS ENUM('pending', 'transcribing', 'framing', 'describing', 'complete', 'failed', 'excluded');--> statement-breakpoint
CREATE TYPE "public"."outcome" AS ENUM('confirmed', 'refuted', 'inconclusive');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('tiktok', 'youtube_shorts', 'instagram_reels', 'synthetic');--> statement-breakpoint
CREATE TYPE "public"."run_kind" AS ENUM('agent', 'baseline');--> statement-breakpoint
CREATE TYPE "public"."run_origin" AS ENUM('owner', 'live_demo', 'eval');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('queued', 'running', 'completed', 'failed', 'cancelled', 'budget_exceeded');--> statement-breakpoint
CREATE TYPE "public"."signal_type" AS ENUM('complaint', 'wish', 'workaround', 'dupe_hunt');--> statement-breakpoint
CREATE TYPE "public"."sponsored" AS ENUM('disclosed', 'suspected', 'none');--> statement-breakpoint
CREATE TYPE "public"."stance" AS ENUM('sincere', 'sarcastic', 'unclear');--> statement-breakpoint
CREATE TYPE "public"."system_under_test" AS ENUM('unmet', 'baseline');--> statement-breakpoint
CREATE TYPE "public"."test_type" AS ENUM('content_concept_test', 'creator_seeding', 'waitlist_landing', 'commenter_survey', 'concept_ad_test');--> statement-breakpoint
CREATE TYPE "public"."verdict" AS ENUM('strong', 'emerging', 'weak', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('private', 'published');