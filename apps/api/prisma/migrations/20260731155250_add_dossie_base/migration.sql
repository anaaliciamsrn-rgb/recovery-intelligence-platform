-- CreateEnum
CREATE TYPE "DossieSubjectType" AS ENUM ('PESSOA', 'EMPRESA');

-- CreateTable
CREATE TABLE "dossies" (
    "id" TEXT NOT NULL,
    "subject_type" "DossieSubjectType" NOT NULL,
    "subject_id" TEXT NOT NULL,
    "gerado_em" TIMESTAMP(3) NOT NULL,
    "evidencia_pgfn" JSONB NOT NULL,
    "evidencia_data_jud" JSONB NOT NULL,
    "evidencia_receita_federal" JSONB NOT NULL,
    "evidencia_portal_transparencia" JSONB NOT NULL,
    "evidencia_cenprot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dossies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dossies_subject_type_subject_id_idx" ON "dossies"("subject_type", "subject_id");
