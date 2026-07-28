-- Extensoes necessarias ao modulo. Idempotente.
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists vector;     -- busca por similaridade (pgvector)
