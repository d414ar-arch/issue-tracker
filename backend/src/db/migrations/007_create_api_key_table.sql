-- API key table for @better-auth/api-key (better-auth 1.6.x schema).
-- NOTE: better-auth 1.3.x used a different apikey schema (userId column, no
-- configId/referenceId). If upgrading a database created with better-auth
-- 1.3.x, drop the old table first — old keys are not portable:
--   DROP TABLE IF EXISTS "apiKey";
--   DROP TABLE IF EXISTS "apikey";

create table if not exists "apikey" ("id" text not null primary key, "configId" text not null, "name" text, "start" text, "referenceId" text not null, "prefix" text, "key" text not null, "refillInterval" integer, "refillAmount" integer, "lastRefillAt" date, "enabled" integer, "rateLimitEnabled" integer, "rateLimitTimeWindow" integer, "rateLimitMax" integer, "requestCount" integer, "remaining" integer, "lastRequest" date, "expiresAt" date, "createdAt" date not null, "updatedAt" date not null, "permissions" text, "metadata" text);

create index if not exists "apikey_configId_idx" on "apikey" ("configId");
create index if not exists "apikey_referenceId_idx" on "apikey" ("referenceId");
create index if not exists "apikey_key_idx" on "apikey" ("key");
