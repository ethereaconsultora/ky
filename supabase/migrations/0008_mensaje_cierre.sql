-- ============================================================
-- 0008 — Mensaje de cierre del diagnóstico
-- El motor lo redacta al cerrar (lo lee la empresa; sin cifras ni jerga). Se guarda para
-- que la pantalla de Resultado no tenga que volver a llamar al modelo.
-- ============================================================

alter table public.diagnostico add column if not exists mensaje_cierre text;
