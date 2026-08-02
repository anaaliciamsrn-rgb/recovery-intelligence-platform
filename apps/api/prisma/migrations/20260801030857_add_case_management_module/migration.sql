-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('ABERTO', 'EM_ANDAMENTO', 'AGUARDANDO_RETORNO', 'NEGOCIACAO', 'RESOLVIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "CasePriority" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE');

-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "dossie_id" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'ABERTO',
    "owner_id" TEXT,
    "priority" "CasePriority" NOT NULL DEFAULT 'MEDIA',
    "tags" TEXT[],
    "proxima_acao" TEXT,
    "data_proxima_acao" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_notes" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "autor_id" TEXT,
    "texto" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_history_entries" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "autor_id" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_history_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cases_dossie_id_idx" ON "cases"("dossie_id");

-- CreateIndex
CREATE INDEX "cases_status_idx" ON "cases"("status");

-- CreateIndex
CREATE INDEX "cases_owner_id_idx" ON "cases"("owner_id");

-- CreateIndex
CREATE INDEX "case_notes_case_id_idx" ON "case_notes"("case_id");

-- CreateIndex
CREATE INDEX "case_history_entries_case_id_idx" ON "case_history_entries"("case_id");
