-- Migration: 005_create_sprints_table.sql
-- Create sprints table for time-boxed iterations (Postgres).

CREATE TABLE IF NOT EXISTS "sprints" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "goal" TEXT,
  "start_date" TEXT,
  "end_date" TEXT,
  "status" TEXT NOT NULL DEFAULT 'planned' CHECK ("status" IN ('planned', 'active', 'completed')),
  "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sprints_start_date ON "sprints"("start_date");
CREATE INDEX IF NOT EXISTS idx_sprints_status ON "sprints"("status");