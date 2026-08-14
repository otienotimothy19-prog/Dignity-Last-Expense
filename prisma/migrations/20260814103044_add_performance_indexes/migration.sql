-- CreateIndex
CREATE INDEX "audit_logs_entity_ref_created_at_idx" ON "audit_logs"("entity_ref", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "documents_quotation_id_idx" ON "documents"("quotation_id");

-- CreateIndex
CREATE INDEX "documents_policy_id_idx" ON "documents"("policy_id");

-- CreateIndex
CREATE INDEX "email_logs_entity_ref_created_at_idx" ON "email_logs"("entity_ref", "created_at");

-- CreateIndex
CREATE INDEX "policies_status_idx" ON "policies"("status");

-- CreateIndex
CREATE INDEX "policies_deleted_at_idx" ON "policies"("deleted_at");

-- CreateIndex
CREATE INDEX "quotations_status_idx" ON "quotations"("status");

-- CreateIndex
CREATE INDEX "quotations_deleted_at_idx" ON "quotations"("deleted_at");

-- CreateIndex
CREATE INDEX "quotations_created_by_id_idx" ON "quotations"("created_by_id");
