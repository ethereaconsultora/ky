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

-- 3. Verificación (correr en el SQL Editor de EC; se lee en la columna `resultado`):
--   select 'puede leer las vistas públicas (debe ser true)' as prueba,
--          has_table_privilege('newen_reader','ec_publico.v_diagnostico','select')::text as resultado
--   union all select 'puede leer las respuestas de la entrevista (debe ser false)',
--          has_table_privilege('newen_reader','public.respuesta_cruda','select')::text
--   union all select 'puede leer los fenómenos detectados (debe ser false)',
--          has_table_privilege('newen_reader','public.fenomeno_detectado','select')::text
--   union all select 'puede leer la tabla de diagnósticos (debe ser false)',
--          has_table_privilege('newen_reader','public.diagnostico','select')::text
--   union all select 'puede escribir en las vistas (debe ser false)',
--          has_table_privilege('newen_reader','ec_publico.v_diagnostico','insert')::text
--   union all select 'configuración del rol',
--          (select array_to_string(rolconfig, ' | ') from pg_roles where rolname = 'newen_reader');
--   (No se usa `set role`: en Supabase el usuario del editor puede no tener permiso de asumir el rol.)

-- Revocar (si hay que rotar la credencial):
--   drop owned by newen_reader;
--   drop role newen_reader;
