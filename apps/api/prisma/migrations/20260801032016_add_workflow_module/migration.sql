-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "estados" TEXT[],
    "estado_inicial" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_transitions" (
    "id" TEXT NOT NULL,
    "workflow_definition_id" TEXT NOT NULL,
    "de" TEXT NOT NULL,
    "para" TEXT NOT NULL,
    "gatilho" TEXT NOT NULL,
    "condicao" JSONB,
    "acao" TEXT,

    CONSTRAINT "workflow_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_instances" (
    "id" TEXT NOT NULL,
    "workflow_definition_id" TEXT NOT NULL,
    "referencia_id" TEXT NOT NULL,
    "estado_atual" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_instance_history_entries" (
    "id" TEXT NOT NULL,
    "workflow_instance_id" TEXT NOT NULL,
    "de" TEXT NOT NULL,
    "para" TEXT NOT NULL,
    "gatilho" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_instance_history_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflow_transitions_workflow_definition_id_idx" ON "workflow_transitions"("workflow_definition_id");

-- CreateIndex
CREATE INDEX "workflow_instances_workflow_definition_id_idx" ON "workflow_instances"("workflow_definition_id");

-- CreateIndex
CREATE INDEX "workflow_instances_referencia_id_idx" ON "workflow_instances"("referencia_id");

-- CreateIndex
CREATE INDEX "workflow_instance_history_entries_workflow_instance_id_idx" ON "workflow_instance_history_entries"("workflow_instance_id");

-- AddForeignKey
ALTER TABLE "workflow_transitions" ADD CONSTRAINT "workflow_transitions_workflow_definition_id_fkey" FOREIGN KEY ("workflow_definition_id") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
