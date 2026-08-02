-- CreateEnum
CREATE TYPE "ImportRowStatus" AS ENUM ('IMPORTADA', 'IGNORADA', 'INVALIDA', 'DUPLICADA', 'ERRO');

-- CreateEnum
CREATE TYPE "ImportResolutionStatus" AS ENUM ('PENDENTE', 'RESOLVIDA', 'SEM_CORRESPONDENCIA');

-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "fonte" TEXT NOT NULL,
    "nome_arquivo" TEXT NOT NULL,
    "iniciado_em" TIMESTAMP(3) NOT NULL,
    "finalizado_em" TIMESTAMP(3),
    "total_linhas" INTEGER NOT NULL,
    "total_importadas" INTEGER NOT NULL DEFAULT 0,
    "total_ignoradas" INTEGER NOT NULL DEFAULT 0,
    "total_invalidas" INTEGER NOT NULL DEFAULT 0,
    "total_duplicadas" INTEGER NOT NULL DEFAULT 0,
    "total_erros" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_rows" (
    "id" TEXT NOT NULL,
    "import_batch_id" TEXT NOT NULL,
    "numero_linha" INTEGER NOT NULL,
    "status" "ImportRowStatus" NOT NULL,
    "resolution_status" "ImportResolutionStatus" NOT NULL,
    "pessoa_id" TEXT,
    "dossie_id" TEXT,
    "documento_mascarado" TEXT,
    "nome" TEXT,
    "nome_fantasia" TEXT,
    "valor_total" DECIMAL(14,2),
    "valor_divida_selecionada" DECIMAL(14,2),
    "natureza_divida" TEXT,
    "motivo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_rows_import_batch_id_idx" ON "import_rows"("import_batch_id");

-- CreateIndex
CREATE INDEX "import_rows_import_batch_id_status_idx" ON "import_rows"("import_batch_id", "status");

-- CreateIndex
CREATE INDEX "import_rows_documento_mascarado_idx" ON "import_rows"("documento_mascarado");

-- AddForeignKey
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
