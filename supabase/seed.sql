-- ============================================================
-- Seed de desarrollo. NO correr en producción tal cual.
-- El cuerpo del consentimiento es un PLACEHOLDER — requiere
-- redacción y aprobación legal antes del deploy (pendiente #6).
-- ============================================================

insert into public.consentimiento_textos (version, cuerpo)
values (
  'audio-v0-borrador',
  'PLACEHOLDER — texto de consentimiento de grabación y transcripción de audio. '
  || 'Pendiente de redacción legal. No usar en entrevistas reales.'
)
on conflict (version) do nothing;
