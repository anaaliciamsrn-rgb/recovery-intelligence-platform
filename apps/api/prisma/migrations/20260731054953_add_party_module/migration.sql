-- CreateTable
CREATE TABLE "pessoas" (
    "id" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pessoas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "razao_social" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pessoas_cpf_key" ON "pessoas"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_cnpj_key" ON "empresas"("cnpj");
