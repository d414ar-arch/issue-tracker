-- Migration: 007_add_sort_order_to_issues.sql
-- Add sort_order column for kanban board within-column ordering.

ALTER TABLE issues ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_issues_sort_order ON issues(status, sort_order);
