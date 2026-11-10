-- AlterTable
ALTER TABLE "email_sends" ADD COLUMN     "bounce_type" TEXT,
ADD COLUMN     "bounced_at" TIMESTAMP(3),
ADD COLUMN     "postmark_msg_id" TEXT,
ADD COLUMN     "to_email" TEXT;

-- CreateIndex
CREATE INDEX "email_sends_postmark_msg_id_idx" ON "email_sends"("postmark_msg_id");
