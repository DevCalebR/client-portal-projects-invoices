ALTER TABLE "InvoiceItem"
ADD COLUMN "organizationId" TEXT;

UPDATE "InvoiceItem" item
SET "organizationId" = invoice."organizationId"
FROM "Invoice" invoice
WHERE invoice.id = item."invoiceId";

ALTER TABLE "InvoiceItem"
ALTER COLUMN "organizationId" SET NOT NULL;

CREATE INDEX "InvoiceItem_organizationId_invoiceId_idx"
ON "InvoiceItem"("organizationId", "invoiceId");

ALTER TABLE "InvoiceItem"
ADD CONSTRAINT "InvoiceItem_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
