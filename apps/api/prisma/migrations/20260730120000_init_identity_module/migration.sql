-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'LOCKED', 'DISABLED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AuditOutcome" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "roles" TEXT[],
    "account_status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "user_agent" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "replaced_by_token_id" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log_entries" (
    "id" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_user_id" TEXT,
    "event_type" TEXT NOT NULL,
    "outcome" "AuditOutcome" NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,

    CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");

-- CreateIndex
CREATE INDEX "audit_log_entries_actor_user_id_occurred_at_idx" ON "audit_log_entries"("actor_user_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
