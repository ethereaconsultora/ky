-- ============================================================
-- Rol de solo lectura para el FDW del proyecto Newen.
-- NO es una migración: se ejecuta a mano una sola vez, en el
-- proyecto Supabase de EC, reemplazando la contraseña por una real
-- (larga y aleatoria; se guarda sólo en el user mapping del FDW de Newen).
-- ============================================================

-- 1. Crear el rol con login y límites duros.
create role newen_reader login password 'REEMPLAZAR_POR_PASSWORD_REAL'
  nosuperuser nocreatedb nocreaterole noinherit connection limit 5;

-- Sólo lectura y consultas acotadas, aunque alguien intente otra cosa por esa conexión.
alter role newen_reader set default_transaction_read_only = on;
alter role newen_reader set statement_timeout = '10s';

-- 2. Acceso EXCLUSIVO al esquema de vistas. Nunca a public.
revoke all on schema public from newen_reader;
grant usage on schema ec_publico to newen_reader;
grant select on all tables in schema ec_publico to newen_reader;
alter default privileges in schema ec_publico grant select on tables to newen_reader;

-- 3. Verificación (correr en el SQL Editor de EC, una por una):
--   set role newen_reader;
--   select count(*) from ec_publico.v_diagnostico;        -- OK
--   select * from public.respuesta_cruda limit 1;         -- ERROR: permission denied
--   select * from public.fenomeno_detectado limit 1;      -- ERROR: permission denied
--   insert into ec_publico.v_diagnostico default values;  -- ERROR: read-only
--   reset role;

-- Revocar (si hay que rotar la credencial):
--   drop owned by newen_reader;
--   drop role newen_reader;
