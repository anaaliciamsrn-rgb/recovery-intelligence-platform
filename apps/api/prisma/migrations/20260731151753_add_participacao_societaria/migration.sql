-- CreateEnum
CREATE TYPE "PapelSocietario" AS ENUM ('SOCIO', 'ADMINISTRADOR', 'SOCIO_ADMINISTRADOR');

-- CreateTable
CREATE TABLE "participacoes_societarias" (
    "id" TEXT NOT NULL,
    "pessoa_id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "papel" "PapelSocietario" NOT NULL,
    "percentual_participacao" DECIMAL(5,2),
    "data_entrada" TIMESTAMP(3),
    "data_saida" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participacoes_societarias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "participacoes_societarias_pessoa_id_idx" ON "participacoes_societarias"("pessoa_id");

-- CreateIndex
CREATE INDEX "participacoes_societarias_empresa_id_idx" ON "participacoes_societarias"("empresa_id");

-- AddForeignKey
ALTER TABLE "participacoes_societarias" ADD CONSTRAINT "participacoes_societarias_pessoa_id_fkey" FOREIGN KEY ("pessoa_id") REFERENCES "pessoas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacoes_societarias" ADD CONSTRAINT "participacoes_societarias_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
