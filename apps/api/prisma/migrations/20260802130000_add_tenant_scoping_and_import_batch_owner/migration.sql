-- AlterTable
ALTER TABLE "import_batches" ADD COLUMN     "iniciado_por_usuario_id" TEXT;

-- Backfill (ADR 0037): toda conta criada antes do multi-tenant real precisa
-- de um TenantResourceOwnership, porque LoginUseCase/RefreshTokenUseCase
-- passam a recusar emitir token sem tenant (fail-closed). Cria um único
-- tenant "legado" e associa todo usuário que ainda não tem nenhum
-- ownership registrado -- idempotente, seguro reexecutar.
INSERT INTO "tenants" ("id", "nome", "slug", "ativo", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Legado (pré multi-tenant)', 'legado', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "tenants" WHERE "slug" = 'legado');

INSERT INTO "tenant_resource_ownerships" ("id", "tenant_id", "resource_type", "resource_id", "created_at")
SELECT gen_random_uuid(), (SELECT "id" FROM "tenants" WHERE "slug" = 'legado'), 'User', "u"."id", now()
FROM "users" "u"
WHERE NOT EXISTS (
  SELECT 1 FROM "tenant_resource_ownerships" "o"
  WHERE "o"."resource_type" = 'User' AND "o"."resource_id" = "u"."id"
);
