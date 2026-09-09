# Contexto Primordial — KY

> < 200 líneas. Qué es KY, para quién, por qué existe, cómo funciona.

## Visión general

**KY** es la app de tablet que usa un **Counselor de Espacio Crítico (EC)** como copiloto
durante una entrevista diagnóstica con una empresa mediana o grande. EC es la consultora
organizacional B2B del ecosistema (marca hermana de Newen, B2C — "Habitar la tensión").

La IA de KY **no habla con el entrevistado**: todo lo que genera es para que el Counselor lo
lea, use o ignore. La única conversación humana es Counselor ↔ Entrevistado.

Es la **Versión B** del método EC. La Versión A (autodiagnóstico web público) no se construye
en esta v1; el modelo de datos ya la deja prevista.

## Problema a resolver

Las empresas medianas y grandes pierden dinero por fenómenos organizacionales que nadie
cuantifica: fallas en la traducción estratégica-operativa (mandos intermedios), conflicto,
desgaste, transiciones no procesadas, ambigüedad estructural. El diagnóstico tradicional es
lento, caro y poco defendible ante un comité. KY estructura la entrevista, reconstruye el
**mecanismo de pérdida** y lo traduce a una cifra económica y a una intervención con
reversibilidad estimada — con trazabilidad completa hasta la evidencia cruda.

El foco central es la **capa de mandos intermedios**: la "posición más jodida del organigrama"
(Alemany) — el único eslabón que traduce estrategia en resultados, y por donde pasan los otros
cuatro fenómenos.

## Usuarios principales

- **Counselor de EC**: conduce la entrevista, decide qué preguntar, marca cuándo una respuesta
  está lista para analizar, aprueba la intervención final. Usa la tablet.
- **Entrevistado** (referente de la empresa): responde con naturalidad. No ve la app.
- **Admin de EC (Ari)**: gestiona counselors, textos de consentimiento, versiones de la matriz
  y del mapa de indagación, y vincula un diagnóstico con un cliente de Newen.

## Qué hace la app

- **Motor de turno** (IA, `claude-haiku-4-5`, 8–15×/diagnóstico): analiza la última respuesta,
  actualiza el estado de los 5 fenómenos y sus mecanismos, decide cerrar/saltar/profundizar y
  **sugiere 2–3 próximas preguntas** compuestas por la IA (no elegidas de una lista).
- **Captura de audio + STT en vivo**: transcripción continua; el Counselor marca "respuesta
  lista → analizar".
- **Mapa EC en construcción**: chips de los 5 fenómenos con estado, intensidad y confianza.
- **Motor de síntesis** (IA, `claude-opus-5`, 1× al cerrar): clasifica relaciones entre
  fenómenos (dominante / co-dominante / circuito), define el caso 1–4 y arma la intervención.
- **Motor económico** (código, determinístico): presentismo + rotación + pérdida total →
  reducción proyectada como **rango**, ROI. Separa "lo que sabemos / estimamos / proyectamos".
- **Entrega**: el Counselor edita, aprueba y envía el informe a la empresa.
- **Integración Newen**: el resultado alimenta la Fase 1 (Diagnóstico) del ciclo de 6 fases
  del dashboard de empresa de Newen, vía vistas de solo lectura (FDW).

## Principales flujos

1. Inicio: datos de la empresa (N, S, R) + consentimiento de audio.
2. Conversación: STT en vivo → "respuesta lista" → motor de turno → sugerencias + Mapa EC.
3. Cierre (Counselor lo marca o el motor detecta que no quedan fenómenos con evidencia pendiente).
4. Síntesis + motor económico → pantalla Resultado (Mapa EC final).
5. Intervención propuesta → editar / aprobar / enviar a la empresa.

## Stack tecnológico

- Frontend: Next.js 15 (App Router, PWA), React 19, TypeScript, Tailwind 4.
- Backend: Route Handlers de Next.js (BFF) → API de Claude.
- Base de datos: **proyecto Supabase propio de EC** (Postgres + Auth + RLS + pgcrypto).
- STT: proveedor de tiempo real es-AR (a confirmar) con token efímero server-side.
- Rate limit: Upstash Redis.
- Deploy: Vercel (proyecto separado del de Newen).
- Integración Newen: Supabase `Wrappers` / `postgres_fdw` de solo lectura.
- Seguridad: PSAI v1.3 + Protocolo Maestro (`PROTOCOLOS/`).

## Aspectos críticos

- La IA nunca le habla al entrevistado. Sólo sugiere; el Counselor decide.
- Un fenómeno se confirma **sólo** con las 4 condiciones cumplidas (evidencia, recurrencia,
  consecuencia, hipótesis plausible). Es preferible dejar "en observación" que forzar.
- Nunca declarar algo que la evidencia no sostiene. Se guarda la evidencia cruda, no sólo la
  conclusión — toda inferencia debe poder trazarse hasta la respuesta original.
- `respuesta_cruda` (transcripciones, evidencia con nombres) **nunca** sale del proyecto EC.
  Newen ve estado, pérdida e intervención — no la evidencia.
- Cifrado en reposo (`pgcrypto`) en los campos sensibles. Consentimiento de audio versionado.
- Protocolo de crisis: si alguien revela autolesión / acoso / violencia / ilícito → alerta al
  Counselor, no persistir el fragmento en claro.
- La "reducción estimada" y el ROI se muestran **siempre como rango**, marcados "sin validar" —
  nunca como conclusión del diagnóstico.

## Alcance inicial (v1)

- Sólo Versión B. Motor de turno + síntesis + económico + entrega + integración Newen.
- Auth propio de EC (email + OTP). 3–5 counselors.
- STT en tiempo real (requisito de la v1) con fallback a captura manual.

## Entregables inmediatos

`ARCHITECTURE.md` · `SECURITY.md` · `SECURITY_SUMMARY.md` · `DESIGN_SYSTEM.md` ·
`spec/` (SDD completo) · `spec/PLAN_APROBADO.md` · `lib/diagnostico/` (núcleo de dominio).

## Criterio de éxito

- Un Counselor puede correr un diagnóstico completo en 8–15 preguntas y salir con un Mapa EC
  trazable, una cifra económica defendible y una intervención propuesta.
- El resultado aparece en el dashboard de Newen sin exponer evidencia cruda.
- Cada conclusión de la IA se puede auditar hasta la respuesta que la sustenta.
