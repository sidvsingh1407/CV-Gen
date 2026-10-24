-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('experience', 'project', 'freelance', 'education', 'certification', 'skill', 'position', 'volunteer', 'award');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('always', 'on_request', 'never');

-- CreateEnum
CREATE TYPE "FactKind" AS ENUM ('free_text', 'locked_number');

-- CreateEnum
CREATE TYPE "ContextMode" AS ENUM ('open_market', 'campus');

-- CreateEnum
CREATE TYPE "Source" AS ENUM ('generated', 'edited');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "CheckVerdict" AS ENUM ('supported', 'partly_supported', 'unsupported', 'not_yet_checked');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "daily_run_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "header" JSONB NOT NULL,
    "show_marks" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entries" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "type" "EntryType" NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT,
    "start" TEXT,
    "end" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'always',
    "placement" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facts" (
    "id" UUID NOT NULL,
    "entry_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "kind" "FactKind" NOT NULL DEFAULT 'free_text',
    "evidence_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_settings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "settings" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rule_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "jd_text" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "role_title" TEXT NOT NULL,
    "context_mode" "ContextMode" NOT NULL DEFAULT 'open_market',
    "threshold" INTEGER NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fit_results" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "requirement_scores" JSONB NOT NULL,
    "domain_percentages" JSONB NOT NULL,
    "total" INTEGER NOT NULL,
    "stability_flag" BOOLEAN NOT NULL DEFAULT false,
    "decision" TEXT NOT NULL,
    "override_flag" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fit_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cv_versions" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "cv" JSONB NOT NULL,
    "source" "Source" NOT NULL DEFAULT 'generated',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cv_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_logs" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "cv_version_id" UUID NOT NULL,
    "bullet_id" TEXT NOT NULL,
    "cited_fact_ids" UUID[],
    "layer_1_result" BOOLEAN NOT NULL,
    "layer_2_verdict" "CheckVerdict" NOT NULL,
    "reason" TEXT,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "rule_settings_user_id_key" ON "rule_settings"("user_id");

-- CreateIndex
CREATE INDEX "runs_user_id_created_at_idx" ON "runs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "fit_results_run_id_key" ON "fit_results"("run_id");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facts" ADD CONSTRAINT "facts_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_settings" ADD CONSTRAINT "rule_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fit_results" ADD CONSTRAINT "fit_results_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv_versions" ADD CONSTRAINT "cv_versions_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_logs" ADD CONSTRAINT "check_logs_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_logs" ADD CONSTRAINT "check_logs_cv_version_id_fkey" FOREIGN KEY ("cv_version_id") REFERENCES "cv_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add custom CHECK constraints that Prisma schema cannot express
ALTER TABLE "users" ADD CONSTRAINT "users_daily_run_count_check" CHECK ("daily_run_count" >= 0);
ALTER TABLE "runs" ADD CONSTRAINT "runs_threshold_check" CHECK ("threshold" >= 0 AND "threshold" <= 100);
ALTER TABLE "fit_results" ADD CONSTRAINT "fit_results_total_check" CHECK ("total" >= 0 AND "total" <= 100);
ALTER TABLE "check_logs" ADD CONSTRAINT "check_logs_retries_check" CHECK ("retries" >= 0);
