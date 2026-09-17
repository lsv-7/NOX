-- AlterTable
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- DropForeignKey
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT IF EXISTS "PasswordResetToken_customerId_fkey";

-- DropTable
DROP TABLE IF EXISTS "PasswordResetToken";
