-- CreateEnum
CREATE TYPE "FeatureFlagScopeType" AS ENUM ('TENANT', 'AMBIENTE', 'USUARIO');

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo_padrao" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flag_overrides" (
    "id" TEXT NOT NULL,
    "feature_flag_id" TEXT NOT NULL,
    "escopo_tipo" "FeatureFlagScopeType" NOT NULL,
    "escopo_valor" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flag_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_chave_key" ON "feature_flags"("chave");

-- CreateIndex
CREATE INDEX "feature_flag_overrides_feature_flag_id_idx" ON "feature_flag_overrides"("feature_flag_id");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flag_overrides_feature_flag_id_escopo_tipo_escopo_v_key" ON "feature_flag_overrides"("feature_flag_id", "escopo_tipo", "escopo_valor");

-- AddForeignKey
ALTER TABLE "feature_flag_overrides" ADD CONSTRAINT "feature_flag_overrides_feature_flag_id_fkey" FOREIGN KEY ("feature_flag_id") REFERENCES "feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
