-- ============================================================
-- 0001 — Extensiones
-- Proyecto Supabase de ESPACIO CRÍTICO (KY). Idempotente.
-- ============================================================

-- pgcrypto: cifrado en reposo de los campos sensibles de respuesta_cruda
-- (pgp_sym_encrypt / pgp_sym_decrypt en el backend con EC_PGCRYPTO_KEY).
create extension if not exists pgcrypto;
