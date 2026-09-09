-- ============================================================
-- Rol de solo lectura para el FDW del proyecto Newen.
-- NO es una migración: se ejecuta a mano una sola vez, en el
-- proyecto Supabase de EC, reemplazando la contraseña por una real
-- (generada aparte, guardada sólo en el server FDW de Newen).
-- ============================================================

-- 1. Crear el rol con login.
create role newen_reader login password 'REEMPLAZAR_POR_PASSWORD_REAL';

-- 2. Acceso EXCLUSIVO al esquema de vistas. Nunca a public.
grant usage on schema ec_publico to newen_reader;
grant select on all tables in schema ec_publico to newen_reader;
alter default privileges in schema ec_publico grant select on tables to newen_reader;

-- 3. Verificación: esto debe fallar (rol sin permiso sobre public).
--   set role newen_reader;
--   select * from public.respuesta_cruda limit 1;   -- ERROR: permission denied
--   reset role;

-- Revocar (si hay que rotar la credencial):
--   drop owned by newen_reader;
--   drop role newen_reader;
