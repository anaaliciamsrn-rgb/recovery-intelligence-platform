-- CreateTable
CREATE TABLE "version_snapshots" (
    "id" TEXT NOT NULL,
    "dossie_id" TEXT NOT NULL,
    "versao" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "usuario_id" TEXT,
    "evidencias" JSONB NOT NULL,
    "classificacao" TEXT NOT NULL,
    "justificativa_geral" TEXT NOT NULL,
    "fatores" JSONB NOT NULL,
    "recomendacoes" JSONB NOT NULL,
    "prompt" JSONB NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "risk_score" DOUBLE PRECISION NOT NULL,
    "hash" TEXT NOT NULL,

    CONSTRAINT "version_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "version_snapshots_dossie_id_idx" ON "version_snapshots"("dossie_id");

-- CreateIndex
CREATE UNIQUE INDEX "version_snapshots_dossie_id_versao_key" ON "version_snapshots"("dossie_id", "versao");
