-- Partial unique index to prevent duplicate PENDING applications
-- for the same user, company, position, and applied date.
CREATE UNIQUE INDEX "Application_userId_company_position_appliedDate_pending_key"
  ON "Application" ("userId", "company", "position", "appliedDate")
  WHERE "status" = 'PENDING';
