-- Idempotent creation of the test and E2E databases.
-- Runs only on first container init (empty data volume).

SELECT 'CREATE DATABASE jat_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'jat_test')\gexec

SELECT 'CREATE DATABASE jat_e2e'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'jat_e2e')\gexec
