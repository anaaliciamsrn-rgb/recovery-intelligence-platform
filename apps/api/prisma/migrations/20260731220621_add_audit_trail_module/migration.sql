-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('LOGIN', 'LOGOUT', 'PESSOA_CRIADA', 'EMPRESA_CRIADA', 'PARTICIPACAO_SOCIETARIA_CRIADA', 'PLANILHA_IMPORTADA', 'DOSSIE_CRIADO', 'EVIDENCIA_ATUALIZADA', 'IDENTITY_RESOLUTION_EXECUTADA', 'CLASSIFICACAO_EXECUTADA', 'RECOMENDACAO_GERADA', 'PROMPT_GERADO', 'EXPLICACAO_CONSULTADA');

-- CreateEnum
CREATE TYPE "AuditEventOutcome" AS ENUM ('SUCESSO', 'FALHA');

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "usuario_id" TEXT,
    "entidade" TEXT NOT NULL,
    "entidade_id" TEXT,
    "tipo" "AuditEventType" NOT NULL,
    "payload" JSONB NOT NULL,
    "request_id" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "duracao_ms" INTEGER NOT NULL,
    "outcome" "AuditEventOutcome" NOT NULL,
    "mensagem" TEXT NOT NULL,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_events_timestamp_idx" ON "audit_events"("timestamp");

-- CreateIndex
CREATE INDEX "audit_events_usuario_id_idx" ON "audit_events"("usuario_id");

-- CreateIndex
CREATE INDEX "audit_events_tipo_idx" ON "audit_events"("tipo");

-- CreateIndex
CREATE INDEX "audit_events_entidade_entidade_id_idx" ON "audit_events"("entidade", "entidade_id");

-- CreateIndex
CREATE INDEX "audit_events_request_id_idx" ON "audit_events"("request_id");
