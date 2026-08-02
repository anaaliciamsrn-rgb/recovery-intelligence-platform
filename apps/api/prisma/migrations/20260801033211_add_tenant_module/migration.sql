-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_resource_ownerships" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_resource_ownerships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenant_resource_ownerships_tenant_id_resource_type_idx" ON "tenant_resource_ownerships"("tenant_id", "resource_type");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_resource_ownerships_resource_type_resource_id_key" ON "tenant_resource_ownerships"("resource_type", "resource_id");

-- AddForeignKey
ALTER TABLE "tenant_resource_ownerships" ADD CONSTRAINT "tenant_resource_ownerships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
