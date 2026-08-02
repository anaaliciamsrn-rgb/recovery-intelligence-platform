-- CreateTable
CREATE TABLE "rule_definitions" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "recurso" TEXT NOT NULL,
    "condicoes" JSONB NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL,
    "prioridade" INTEGER NOT NULL,
    "acao" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "versao_atual" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rule_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_version_entries" (
    "id" TEXT NOT NULL,
    "rule_definition_id" TEXT NOT NULL,
    "versao" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "recurso" TEXT NOT NULL,
    "condicoes" JSONB NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL,
    "prioridade" INTEGER NOT NULL,
    "acao" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rule_version_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rule_definitions_recurso_idx" ON "rule_definitions"("recurso");

-- CreateIndex
CREATE INDEX "rule_version_entries_rule_definition_id_idx" ON "rule_version_entries"("rule_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "rule_version_entries_rule_definition_id_versao_key" ON "rule_version_entries"("rule_definition_id", "versao");

-- AddForeignKey
ALTER TABLE "rule_version_entries" ADD CONSTRAINT "rule_version_entries_rule_definition_id_fkey" FOREIGN KEY ("rule_definition_id") REFERENCES "rule_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
