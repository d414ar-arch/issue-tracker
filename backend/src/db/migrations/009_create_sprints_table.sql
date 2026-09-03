-- Migration: 009_create_sprints_table.sql
-- Create sprints table for time-boxed iterations.

CREATE TABLE IF NOT EXISTS sprints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    goal TEXT,
    start_date TEXT,
    end_date TEXT,
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sprints_start_date ON sprints(start_date);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status);