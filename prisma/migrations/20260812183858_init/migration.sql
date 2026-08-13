-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('SACCO', 'CHURCH', 'CHAMA', 'SME', 'EMPLOYER', 'OTHER');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('PRINCIPAL', 'SPOUSE', 'CHILD', 'PARENT', 'PARENT_IN_LAW');

-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('INDIVIDUAL', 'NUCLEAR_FAMILY', 'EXTENDED_FAMILY', 'GROUP_PLAN_A', 'GROUP_PLAN_B');

-- CreateEnum
CREATE TYPE "QuotationType" AS ENUM ('INDIVIDUAL', 'GROUP');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'GENERATED', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CONVERTED_TO_POLICY');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'LAPSED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MPESA', 'BANK', 'CASH', 'CHEQUE', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('QUOTATION', 'POLICY');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "id_number" TEXT,
    "kra_pin" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "agent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group_type" "GroupType" NOT NULL,
    "registration_number" TEXT,
    "kra_pin" TEXT,
    "contact_person" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "agent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "client_id" TEXT,
    "group_id" TEXT,
    "full_name" TEXT NOT NULL,
    "id_number" TEXT,
    "dob" TIMESTAMP(3) NOT NULL,
    "phone" TEXT,
    "eligible" BOOLEAN NOT NULL DEFAULT true,
    "ineligibility_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dependants" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "relationship" "RelationshipType" NOT NULL,
    "full_name" TEXT NOT NULL,
    "id_number" TEXT,
    "dob" TIMESTAMP(3) NOT NULL,
    "eligible" BOOLEAN NOT NULL DEFAULT true,
    "ineligibility_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dependants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "code" "PlanCode" NOT NULL,
    "name" TEXT NOT NULL,
    "is_group" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefit_options" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "option_number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "benefit_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_versions" (
    "id" TEXT NOT NULL,
    "benefit_option_id" TEXT NOT NULL,
    "version_label" TEXT NOT NULL,
    "principal_benefit" DECIMAL(14,2) NOT NULL,
    "spouse_benefit" DECIMAL(14,2) NOT NULL,
    "child_benefit" DECIMAL(14,2) NOT NULL,
    "parent_benefit" DECIMAL(14,2) NOT NULL,
    "parent_in_law_benefit" DECIMAL(14,2) NOT NULL,
    "max_children" INTEGER NOT NULL,
    "annual_rate" DECIMAL(14,2) NOT NULL,
    "additional_child_rate" DECIMAL(14,2) NOT NULL,
    "min_group_size" INTEGER NOT NULL DEFAULT 1,
    "min_age" INTEGER NOT NULL,
    "max_age" INTEGER NOT NULL,
    "waiting_period_days" INTEGER NOT NULL,
    "claims_limit_notes" TEXT,
    "requires_approval_below_min" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT,

    CONSTRAINT "rate_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" TEXT NOT NULL,
    "reference_code" TEXT NOT NULL,
    "type" "QuotationType" NOT NULL,
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "client_id" TEXT,
    "group_id" TEXT,
    "plan_id" TEXT NOT NULL,
    "benefit_option_id" TEXT NOT NULL,
    "rate_version_id" TEXT NOT NULL,
    "num_contributors" INTEGER NOT NULL DEFAULT 1,
    "num_spouses" INTEGER NOT NULL DEFAULT 0,
    "num_children" INTEGER NOT NULL DEFAULT 0,
    "num_additional_children" INTEGER NOT NULL DEFAULT 0,
    "num_parents" INTEGER NOT NULL DEFAULT 0,
    "num_parents_in_law" INTEGER NOT NULL DEFAULT 0,
    "base_premium" DECIMAL(14,2) NOT NULL,
    "additional_child_premium" DECIMAL(14,2) NOT NULL,
    "total_premium" DECIMAL(14,2) NOT NULL,
    "min_group_size_met" BOOLEAN NOT NULL DEFAULT true,
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "current_version_number" INTEGER NOT NULL DEFAULT 1,
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_versions" (
    "id" TEXT NOT NULL,
    "quotation_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "reference_suffix" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "reason" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotation_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_members" (
    "id" TEXT NOT NULL,
    "quotation_id" TEXT NOT NULL,
    "relationship" "RelationshipType" NOT NULL,
    "full_name" TEXT NOT NULL,
    "id_number" TEXT,
    "dob" TIMESTAMP(3),
    "benefit_amount" DECIMAL(14,2) NOT NULL,
    "eligible" BOOLEAN NOT NULL DEFAULT true,
    "ineligibility_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotation_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" TEXT NOT NULL,
    "reference_code" TEXT NOT NULL,
    "quotation_id" TEXT NOT NULL,
    "quotation_version_id" TEXT NOT NULL,
    "type" "QuotationType" NOT NULL,
    "status" "PolicyStatus" NOT NULL DEFAULT 'PENDING',
    "client_id" TEXT,
    "group_id" TEXT,
    "plan_id" TEXT NOT NULL,
    "benefit_option_id" TEXT NOT NULL,
    "rate_version_id" TEXT NOT NULL,
    "premium_paid" DECIMAL(14,2) NOT NULL,
    "cover_start" TIMESTAMP(3) NOT NULL,
    "cover_end" TIMESTAMP(3) NOT NULL,
    "issued_by_id" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_members" (
    "id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "member_id" TEXT,
    "relationship" "RelationshipType" NOT NULL,
    "full_name" TEXT NOT NULL,
    "id_number" TEXT,
    "dob" TIMESTAMP(3),
    "benefit_amount" DECIMAL(14,2) NOT NULL,
    "eligible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "quotation_id" TEXT,
    "policy_id" TEXT,
    "amount_invoiced" DECIMAL(14,2) NOT NULL,
    "amount_paid" DECIMAL(14,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "mpesa_code" TEXT,
    "bank_reference" TEXT,
    "receipt_number" TEXT,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "outstanding_balance" DECIMAL(14,2) NOT NULL,
    "recorded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "reference_code" TEXT NOT NULL,
    "quotation_id" TEXT,
    "policy_id" TEXT,
    "file_path" TEXT NOT NULL,
    "generated_by_id" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_sequences" (
    "id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_ref" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "reason" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "to_address" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "entity_ref" TEXT,
    "status" "EmailStatus" NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "products_name_key" ON "products"("name");

-- CreateIndex
CREATE UNIQUE INDEX "plans_product_id_code_key" ON "plans"("product_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "benefit_options_plan_id_option_number_key" ON "benefit_options"("plan_id", "option_number");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_reference_code_key" ON "quotations"("reference_code");

-- CreateIndex
CREATE UNIQUE INDEX "quotation_versions_quotation_id_version_number_key" ON "quotation_versions"("quotation_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "policies_reference_code_key" ON "policies"("reference_code");

-- CreateIndex
CREATE UNIQUE INDEX "policies_quotation_id_key" ON "policies"("quotation_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_sequences_prefix_year_key" ON "document_sequences"("prefix", "year");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependants" ADD CONSTRAINT "dependants_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_options" ADD CONSTRAINT "benefit_options_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_versions" ADD CONSTRAINT "rate_versions_benefit_option_id_fkey" FOREIGN KEY ("benefit_option_id") REFERENCES "benefit_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_benefit_option_id_fkey" FOREIGN KEY ("benefit_option_id") REFERENCES "benefit_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_rate_version_id_fkey" FOREIGN KEY ("rate_version_id") REFERENCES "rate_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_versions" ADD CONSTRAINT "quotation_versions_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_members" ADD CONSTRAINT "quotation_members_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_quotation_version_id_fkey" FOREIGN KEY ("quotation_version_id") REFERENCES "quotation_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_benefit_option_id_fkey" FOREIGN KEY ("benefit_option_id") REFERENCES "benefit_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_rate_version_id_fkey" FOREIGN KEY ("rate_version_id") REFERENCES "rate_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_members" ADD CONSTRAINT "policy_members_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_members" ADD CONSTRAINT "policy_members_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_generated_by_id_fkey" FOREIGN KEY ("generated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
