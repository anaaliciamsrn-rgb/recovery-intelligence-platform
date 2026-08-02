-- CreateEnum
CREATE TYPE "ScheduledJobStatus" AS ENUM ('PENDENTE', 'EXECUTANDO', 'CONCLUIDO', 'MORTO');

-- CreateEnum
CREATE TYPE "JobExecutionStatus" AS ENUM ('SUCESSO', 'FALHA');

-- CreateTable
CREATE TABLE "scheduled_jobs" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "ScheduledJobStatus" NOT NULL DEFAULT 'PENDENTE',
    "agendado_para" TIMESTAMP(3) NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "max_tentativas" INTEGER NOT NULL,
    "ultimo_erro" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_execution_entries" (
    "id" TEXT NOT NULL,
    "scheduled_job_id" TEXT NOT NULL,
    "tentativa" INTEGER NOT NULL,
    "status" "JobExecutionStatus" NOT NULL,
    "erro" TEXT,
    "iniciado_em" TIMESTAMP(3) NOT NULL,
    "finalizado_em" TIMESTAMP(3) NOT NULL,
    "duracao_ms" INTEGER NOT NULL,

    CONSTRAINT "job_execution_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_jobs_status_agendado_para_idx" ON "scheduled_jobs"("status", "agendado_para");

-- CreateIndex
CREATE INDEX "job_execution_entries_scheduled_job_id_idx" ON "job_execution_entries"("scheduled_job_id");

-- AddForeignKey
ALTER TABLE "job_execution_entries" ADD CONSTRAINT "job_execution_entries_scheduled_job_id_fkey" FOREIGN KEY ("scheduled_job_id") REFERENCES "scheduled_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
