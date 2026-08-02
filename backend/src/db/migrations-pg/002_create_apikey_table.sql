CREATE TABLE IF NOT EXISTS "apikey" (
  "id" TEXT PRIMARY KEY,
  "configId" TEXT NOT NULL DEFAULT 'default',
  "name" TEXT,
  "start" TEXT,
  "referenceId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "prefix" TEXT,
  "key" TEXT NOT NULL,
  "refillInterval" INTEGER,
  "refillAmount" INTEGER,
  "lastRefillAt" TIMESTAMP,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "rateLimitEnabled" BOOLEAN NOT NULL DEFAULT true,
  "rateLimitTimeWindow" INTEGER,
  "rateLimitMax" INTEGER,
  "requestCount" INTEGER NOT NULL DEFAULT 0,
  "remaining" INTEGER,
  "lastRequest" TIMESTAMP,
  "expiresAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "permissions" TEXT,
  "metadata" TEXT
);

CREATE INDEX IF NOT EXISTS idx_apikey_reference ON "apikey"("referenceId");
CREATE INDEX IF NOT EXISTS idx_apikey_config ON "apikey"("configId");
CREATE INDEX IF NOT EXISTS idx_apikey_key ON "apikey"("key");
