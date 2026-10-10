CREATE TABLE "brand" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"positioning" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brand_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "catalog_product" (
	"id" uuid PRIMARY KEY NOT NULL,
	"brand_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"format" text NOT NULL,
	"key_ingredients" text[] NOT NULL,
	"claims" text[] NOT NULL,
	"skin_types" text[] NOT NULL,
	"url" text NOT NULL,
	"embedding" vector(1536)
);
--> statement-breakpoint
CREATE TABLE "comment" (
	"id" uuid PRIMARY KEY NOT NULL,
	"video_id" uuid NOT NULL,
	"author_hash" text NOT NULL,
	"text" text NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"posted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "creator" (
	"id" uuid PRIMARY KEY NOT NULL,
	"platform" "platform" NOT NULL,
	"handle" text NOT NULL,
	"follower_count" integer NOT NULL,
	"follower_tier" "follower_tier" NOT NULL,
	"likely_minor" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_platform_handle_unique" UNIQUE("platform","handle"),
	CONSTRAINT "creator_follower_count_nonnegative" CHECK ("creator"."follower_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "keyframe" (
	"id" uuid PRIMARY KEY NOT NULL,
	"video_id" uuid NOT NULL,
	"at_ms" integer NOT NULL,
	"media_key" text NOT NULL,
	"description" text NOT NULL,
	"on_screen_text" text DEFAULT '' NOT NULL,
	"products_visible" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signal" (
	"id" uuid PRIMARY KEY NOT NULL,
	"video_id" uuid NOT NULL,
	"type" "signal_type" NOT NULL,
	"need_statement" text NOT NULL,
	"products" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stance" "stance" NOT NULL,
	"sponsored" "sponsored" NOT NULL,
	"confidence" real NOT NULL,
	"embedding" vector(1536),
	"tsv" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', "need_statement")) STORED,
	"extractor_version" text NOT NULL,
	"repair_attempts" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "signal_need_statement_length" CHECK (char_length("signal"."need_statement") between 10 and 160),
	CONSTRAINT "signal_confidence_range" CHECK ("signal"."confidence" >= 0 and "signal"."confidence" <= 1)
);
--> statement-breakpoint
CREATE TABLE "signal_evidence" (
	"id" uuid PRIMARY KEY NOT NULL,
	"signal_id" uuid NOT NULL,
	"source" "evidence_source" NOT NULL,
	"transcript_segment_id" uuid,
	"keyframe_id" uuid,
	"comment_id" uuid,
	"start_ms" integer,
	"end_ms" integer,
	"excerpt" text NOT NULL,
	CONSTRAINT "signal_evidence_excerpt_length" CHECK (char_length("signal_evidence"."excerpt") <= 200),
	CONSTRAINT "signal_evidence_reference" CHECK (("signal_evidence"."source" = 'caption' and "signal_evidence"."transcript_segment_id" is null and "signal_evidence"."keyframe_id" is null and "signal_evidence"."comment_id" is null)
        or ("signal_evidence"."source" = 'transcript' and "signal_evidence"."transcript_segment_id" is not null and "signal_evidence"."keyframe_id" is null and "signal_evidence"."comment_id" is null)
        or ("signal_evidence"."source" = 'frame' and "signal_evidence"."keyframe_id" is not null and "signal_evidence"."transcript_segment_id" is null and "signal_evidence"."comment_id" is null)
        or ("signal_evidence"."source" = 'comment' and "signal_evidence"."comment_id" is not null and "signal_evidence"."transcript_segment_id" is null and "signal_evidence"."keyframe_id" is null))
);
--> statement-breakpoint
CREATE TABLE "transcript_segment" (
	"id" uuid PRIMARY KEY NOT NULL,
	"video_id" uuid NOT NULL,
	"start_ms" integer NOT NULL,
	"end_ms" integer NOT NULL,
	"text" text NOT NULL,
	"tsv" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', "text")) STORED,
	CONSTRAINT "transcript_segment_range" CHECK ("transcript_segment"."end_ms" > "transcript_segment"."start_ms")
);
--> statement-breakpoint
CREATE TABLE "video" (
	"id" uuid PRIMARY KEY NOT NULL,
	"corpus_id" text DEFAULT 'main' NOT NULL,
	"platform" "platform" NOT NULL,
	"external_id" text NOT NULL,
	"source_url" text NOT NULL,
	"creator_id" uuid NOT NULL,
	"posted_at" timestamp with time zone NOT NULL,
	"duration_ms" integer,
	"caption" text DEFAULT '' NOT NULL,
	"hashtags" text[] DEFAULT '{}'::text[] NOT NULL,
	"views" bigint DEFAULT 0 NOT NULL,
	"likes" bigint DEFAULT 0 NOT NULL,
	"comments_count" integer DEFAULT 0 NOT NULL,
	"collected_at" timestamp with time zone NOT NULL,
	"provenance_note" text NOT NULL,
	"collection_query" text NOT NULL,
	"media_key" text,
	"is_synthetic" boolean DEFAULT false NOT NULL,
	"trap_tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"sponsored_disclosed" boolean DEFAULT false NOT NULL,
	"ingest_status" "ingest_status" DEFAULT 'pending' NOT NULL,
	"ingest_error" text,
	"extract_status" "extract_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_platform_external_id_unique" UNIQUE("platform","external_id")
);
--> statement-breakpoint
CREATE TABLE "eval_case_result" (
	"id" uuid PRIMARY KEY NOT NULL,
	"eval_run_id" uuid NOT NULL,
	"case_id" text NOT NULL,
	"system" "system_under_test" NOT NULL,
	"investigation_id" uuid,
	"passed" boolean NOT NULL,
	"expected" jsonb NOT NULL,
	"actual" jsonb NOT NULL,
	"scores" jsonb NOT NULL,
	"failure_reason" text
);
--> statement-breakpoint
CREATE TABLE "eval_run" (
	"id" uuid PRIMARY KEY NOT NULL,
	"suite" "eval_suite" NOT NULL,
	"git_sha" text NOT NULL,
	"model_ids" jsonb NOT NULL,
	"prompt_versions" jsonb NOT NULL,
	"formula_version" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"metrics" jsonb NOT NULL,
	"thresholds" jsonb NOT NULL,
	"passed" boolean NOT NULL,
	"notes" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_fit" (
	"id" uuid PRIMARY KEY NOT NULL,
	"finding_id" uuid NOT NULL,
	"scores" jsonb NOT NULL,
	"existing_coverage" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"rating" "fit_rating" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brand_fit_finding_id_unique" UNIQUE("finding_id")
);
--> statement-breakpoint
CREATE TABLE "claim" (
	"id" uuid PRIMARY KEY NOT NULL,
	"finding_id" uuid NOT NULL,
	"kind" "claim_kind" NOT NULL,
	"text" text NOT NULL,
	"stat_snapshot_id" uuid,
	"ordinal" smallint NOT NULL,
	CONSTRAINT "claim_text_length" CHECK (char_length("claim"."text") <= 300),
	CONSTRAINT "claim_number_needs_snapshot" CHECK ("claim"."text" !~ '[0-9]' or "claim"."stat_snapshot_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "claim_evidence" (
	"claim_id" uuid NOT NULL,
	"signal_evidence_id" uuid NOT NULL,
	CONSTRAINT "claim_evidence_pk" PRIMARY KEY("claim_id","signal_evidence_id")
);
--> statement-breakpoint
CREATE TABLE "demand_test" (
	"id" uuid PRIMARY KEY NOT NULL,
	"finding_id" uuid NOT NULL,
	"test_type" "test_type" NOT NULL,
	"hypothesis" text NOT NULL,
	"audience" text NOT NULL,
	"activation" text NOT NULL,
	"primary_metric" text NOT NULL,
	"success_threshold" text NOT NULL,
	"stop_condition" text NOT NULL,
	"duration_days" smallint NOT NULL,
	"cost_band" "cost_band" NOT NULL,
	"predicted_probability" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "demand_test_finding_id_unique" UNIQUE("finding_id"),
	CONSTRAINT "demand_test_hypothesis_length" CHECK (char_length("demand_test"."hypothesis") <= 300),
	CONSTRAINT "demand_test_audience_length" CHECK (char_length("demand_test"."audience") <= 200),
	CONSTRAINT "demand_test_activation_length" CHECK (char_length("demand_test"."activation") <= 500),
	CONSTRAINT "demand_test_threshold_has_number" CHECK ("demand_test"."success_threshold" ~ '[0-9]'),
	CONSTRAINT "demand_test_duration_range" CHECK ("demand_test"."duration_days" between 3 and 60),
	CONSTRAINT "demand_test_probability_range" CHECK ("demand_test"."predicted_probability" >= 0.05 and "demand_test"."predicted_probability" <= 0.95)
);
--> statement-breakpoint
CREATE TABLE "finding" (
	"id" uuid PRIMARY KEY NOT NULL,
	"investigation_id" uuid NOT NULL,
	"need_id" uuid NOT NULL,
	"verdict" "verdict" NOT NULL,
	"agent_verdict" "verdict" NOT NULL,
	"capped_by" text[] DEFAULT '{}'::text[] NOT NULL,
	"override_reason" text,
	"confidence" real NOT NULL,
	"summary" text NOT NULL,
	"uncertainties" text[] NOT NULL,
	"alternative_explanations" text[] NOT NULL,
	"sceptic_checked" boolean NOT NULL,
	"rank" smallint NOT NULL,
	CONSTRAINT "finding_need_id_unique" UNIQUE("need_id"),
	CONSTRAINT "finding_summary_length" CHECK (char_length("finding"."summary") <= 600),
	CONSTRAINT "finding_confidence_range" CHECK ("finding"."confidence" >= 0 and "finding"."confidence" <= 1),
	CONSTRAINT "finding_rank_positive" CHECK ("finding"."rank" >= 1),
	CONSTRAINT "finding_uncertainty_required" CHECK ("finding"."verdict" = 'rejected' or (cardinality("finding"."uncertainties") >= 1 and cardinality("finding"."alternative_explanations") >= 1))
);
--> statement-breakpoint
CREATE TABLE "investigation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" "run_kind" NOT NULL,
	"origin" "run_origin" NOT NULL,
	"brand_id" uuid NOT NULL,
	"question" text NOT NULL,
	"as_of" timestamp with time zone NOT NULL,
	"corpus_id" text DEFAULT 'main' NOT NULL,
	"status" "run_status" DEFAULT 'queued' NOT NULL,
	"visibility" "visibility" DEFAULT 'private' NOT NULL,
	"requester_ip_hash" text,
	"claimed_by" text,
	"heartbeat_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"model_ids" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"prompt_versions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"formula_version" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(10, 4) DEFAULT 0 NOT NULL,
	"iterations" smallint DEFAULT 0 NOT NULL,
	"error_code" text,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "investigation_question_length" CHECK (char_length("investigation"."question") between 10 and 500)
);
--> statement-breakpoint
CREATE TABLE "ledger_outcome" (
	"id" uuid PRIMARY KEY NOT NULL,
	"demand_test_id" uuid NOT NULL,
	"outcome" "outcome" NOT NULL,
	"observed_value" text NOT NULL,
	"notes" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_outcome_demand_test_id_unique" UNIQUE("demand_test_id")
);
--> statement-breakpoint
CREATE TABLE "need" (
	"id" uuid PRIMARY KEY NOT NULL,
	"investigation_id" uuid NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"centroid" vector(1536) NOT NULL,
	"signal_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "need_label_length" CHECK (char_length("need"."label") <= 80)
);
--> statement-breakpoint
CREATE TABLE "need_signal" (
	"need_id" uuid NOT NULL,
	"signal_id" uuid NOT NULL,
	CONSTRAINT "need_signal_pk" PRIMARY KEY("need_id","signal_id")
);
--> statement-breakpoint
CREATE TABLE "run_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"investigation_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"type" "event_type" NOT NULL,
	"tool_name" text,
	"title" text NOT NULL,
	"payload" jsonb NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(10, 4) DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "run_event_investigation_seq_unique" UNIQUE("investigation_id","seq"),
	CONSTRAINT "run_event_seq_positive" CHECK ("run_event"."seq" >= 1)
);
--> statement-breakpoint
CREATE TABLE "stat_snapshot" (
	"id" uuid PRIMARY KEY NOT NULL,
	"need_id" uuid NOT NULL,
	"as_of" timestamp with time zone NOT NULL,
	"window_days" smallint DEFAULT 90 NOT NULL,
	"formula_version" text NOT NULL,
	"stats" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalog_product" ADD CONSTRAINT "catalog_product_brand_id_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brand"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_video_id_video_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."video"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyframe" ADD CONSTRAINT "keyframe_video_id_video_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."video"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signal" ADD CONSTRAINT "signal_video_id_video_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."video"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signal_evidence" ADD CONSTRAINT "signal_evidence_signal_id_signal_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signal_evidence" ADD CONSTRAINT "signal_evidence_transcript_segment_id_transcript_segment_id_fk" FOREIGN KEY ("transcript_segment_id") REFERENCES "public"."transcript_segment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signal_evidence" ADD CONSTRAINT "signal_evidence_keyframe_id_keyframe_id_fk" FOREIGN KEY ("keyframe_id") REFERENCES "public"."keyframe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signal_evidence" ADD CONSTRAINT "signal_evidence_comment_id_comment_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_segment" ADD CONSTRAINT "transcript_segment_video_id_video_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."video"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video" ADD CONSTRAINT "video_creator_id_creator_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_case_result" ADD CONSTRAINT "eval_case_result_eval_run_id_eval_run_id_fk" FOREIGN KEY ("eval_run_id") REFERENCES "public"."eval_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_case_result" ADD CONSTRAINT "eval_case_result_investigation_id_investigation_id_fk" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_fit" ADD CONSTRAINT "brand_fit_finding_id_finding_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."finding"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim" ADD CONSTRAINT "claim_finding_id_finding_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."finding"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim" ADD CONSTRAINT "claim_stat_snapshot_id_stat_snapshot_id_fk" FOREIGN KEY ("stat_snapshot_id") REFERENCES "public"."stat_snapshot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_evidence" ADD CONSTRAINT "claim_evidence_claim_id_claim_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claim"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_evidence" ADD CONSTRAINT "claim_evidence_signal_evidence_id_signal_evidence_id_fk" FOREIGN KEY ("signal_evidence_id") REFERENCES "public"."signal_evidence"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demand_test" ADD CONSTRAINT "demand_test_finding_id_finding_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."finding"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding" ADD CONSTRAINT "finding_investigation_id_investigation_id_fk" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding" ADD CONSTRAINT "finding_need_id_need_id_fk" FOREIGN KEY ("need_id") REFERENCES "public"."need"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investigation" ADD CONSTRAINT "investigation_brand_id_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brand"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_outcome" ADD CONSTRAINT "ledger_outcome_demand_test_id_demand_test_id_fk" FOREIGN KEY ("demand_test_id") REFERENCES "public"."demand_test"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "need" ADD CONSTRAINT "need_investigation_id_investigation_id_fk" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "need_signal" ADD CONSTRAINT "need_signal_need_id_need_id_fk" FOREIGN KEY ("need_id") REFERENCES "public"."need"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "need_signal" ADD CONSTRAINT "need_signal_signal_id_signal_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_event" ADD CONSTRAINT "run_event_investigation_id_investigation_id_fk" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stat_snapshot" ADD CONSTRAINT "stat_snapshot_need_id_need_id_fk" FOREIGN KEY ("need_id") REFERENCES "public"."need"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_product_brand_id_idx" ON "catalog_product" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "comment_video_id_idx" ON "comment" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "keyframe_video_id_idx" ON "keyframe" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "signal_video_id_idx" ON "signal" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "signal_embedding_hnsw_idx" ON "signal" USING hnsw ("embedding" vector_cosine_ops) WITH (m=16,ef_construction=64);--> statement-breakpoint
CREATE INDEX "signal_tsv_idx" ON "signal" USING gin ("tsv");--> statement-breakpoint
CREATE INDEX "signal_evidence_signal_id_idx" ON "signal_evidence" USING btree ("signal_id");--> statement-breakpoint
CREATE INDEX "transcript_segment_video_id_idx" ON "transcript_segment" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "transcript_segment_tsv_idx" ON "transcript_segment" USING gin ("tsv");--> statement-breakpoint
CREATE INDEX "video_corpus_id_idx" ON "video" USING btree ("corpus_id");--> statement-breakpoint
CREATE INDEX "video_creator_id_idx" ON "video" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "video_posted_at_idx" ON "video" USING btree ("posted_at");--> statement-breakpoint
CREATE INDEX "video_corpus_posted_at_idx" ON "video" USING btree ("corpus_id","posted_at");--> statement-breakpoint
CREATE INDEX "eval_case_result_eval_run_id_idx" ON "eval_case_result" USING btree ("eval_run_id");--> statement-breakpoint
CREATE INDEX "claim_finding_id_idx" ON "claim" USING btree ("finding_id");--> statement-breakpoint
CREATE INDEX "finding_investigation_id_idx" ON "finding" USING btree ("investigation_id");--> statement-breakpoint
CREATE INDEX "investigation_status_idx" ON "investigation" USING btree ("status");--> statement-breakpoint
CREATE INDEX "investigation_status_created_at_idx" ON "investigation" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "investigation_visibility_finished_at_idx" ON "investigation" USING btree ("visibility","finished_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "need_investigation_id_idx" ON "need" USING btree ("investigation_id");--> statement-breakpoint
CREATE INDEX "stat_snapshot_need_id_idx" ON "stat_snapshot" USING btree ("need_id");