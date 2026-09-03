-- Migration: 004_create_epics_table.sql
-- Create epics table for long-lived scope groupings (Postgres).

CREATE TABLE IF NOT EXISTS "epics" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "color" TEXT NOT NULL DEFAULT '#6366f1',
  "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_epics_name ON "epics"("name");