-- Migration: 003_add_sort_order_to_issues.sql
-- Add sort_order column for kanban board within-column ordering.
-- Uses IF NOT EXISTS so it's safe to run on every deploy (migrations
-- run as part of the startCommand on Render).

ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_issues_sort_order ON "issues"("status", "sort_order");
