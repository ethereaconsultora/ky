-- ============================================================
-- 0007 — Alta automática en public.users al crear un usuario de Supabase Auth.
--
-- Flujo de acceso (equipo chico, 3–5 counselors):
--   1. Un admin da de alta al counselor en Supabase → Authentication → Users.
--   2. Este trigger le crea la fila en public.users (rol counselor por defecto).
--   3. El counselor entra con OTP (la app usa shouldCreateUser=false → no hay
--      auto-registro desde el login).
-- Para hacer admin a alguien: update public.users set rol='admin' where email=...
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, nombre)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data->>'nombre', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: cualquier usuario de Auth que ya exista y no tenga fila.
insert into public.users (id, email, nombre)
select u.id, u.email, split_part(u.email, '@', 1)
from auth.users u
left join public.users pu on pu.id = u.id
where pu.id is null;
