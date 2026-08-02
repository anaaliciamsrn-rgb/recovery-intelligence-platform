-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('CONCLUIDO', 'REVERTIDO');

-- AlterTable
ALTER TABLE "import_batches" ADD COLUMN     "motivo_reversao" TEXT,
ADD COLUMN     "revertido_em" TIMESTAMP(3),
ADD COLUMN     "status" "ImportBatchStatus" NOT NULL DEFAULT 'CONCLUIDO';
