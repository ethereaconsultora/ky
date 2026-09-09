# USER STORIES — KY

Formato: **ID · Como <rol> quiero <necesidad> para <valor>** + criterios de aceptación (Gherkin
resumido en `ACCEPTANCE_CRITERIA.md`).

## Counselor — durante la entrevista

- **US-01** · Como Counselor quiero **cargar los datos de la empresa (N, S, R) y registrar el
  consentimiento de audio** antes de empezar, para que el motor tenga contexto y la captura sea
  legal.
- **US-02** · Como Counselor quiero **ver la transcripción en vivo** de lo que dice el
  entrevistado, para no tener que tomar notas mientras converso.
- **US-03** · Como Counselor quiero **marcar cuándo una respuesta terminó** ("respuesta lista →
  analizar"), para que el motor procese el fragmento correcto.
- **US-04** · Como Counselor quiero **ver 2–3 sugerencias de próxima pregunta que exploren hilos
  distintos** (no variantes de la misma), para elegir hacia dónde llevar la charla.
- **US-05** · Como Counselor quiero **ver el Mapa EC actualizándose** (fenómenos con estado,
  intensidad y confianza), para saber qué falta indagar.
- **US-06** · Como Counselor quiero **que la app funcione aunque se corte la señal** en la
  planta del cliente, y sincronice después, para no perder la entrevista.
- **US-07** · Como Counselor quiero **un aviso discreto si el entrevistado revela algo grave**
  (autolesión, acoso, violencia), para poder contenerlo y derivar.
- **US-08** · Como Counselor quiero **cerrar el diagnóstico cuando yo decida**, no sólo cuando
  el motor lo proponga.

## Counselor — al cierre

- **US-09** · Como Counselor quiero **ver el Mapa EC final con la relación entre fenómenos**
  (dominante / co-dominante / circuito) y su representación visual, para entender el mecanismo
  de pérdida.
- **US-10** · Como Counselor quiero **ver la pérdida económica separada en 3 capas** (lo que
  sabemos / estimamos / proyectamos), con la proyección siempre como rango marcado "sin
  validar", para poder defenderla ante la empresa.
- **US-11** · Como Counselor quiero **editar la propuesta de intervención antes de aprobarla**,
  porque la última palabra es mía, no de la IA.
- **US-12** · Como Counselor quiero **aprobar y enviar el informe a la empresa** y que quede
  registrado cuándo se envió.

## Counselor — trazabilidad

- **US-13** · Como Counselor quiero **poder ver de qué respuestas salió cada conclusión**, para
  responder "¿por qué EC dice esto?".

## Admin (Ari)

- **US-14** · Como Admin quiero **gestionar los textos de consentimiento y sus versiones**, para
  cumplir con lo legal.
- **US-15** · Como Admin quiero **vincular un diagnóstico con un cliente de Newen**
  (`organization_client_id`), para que el resultado aparezca en el dashboard de empresa.
- **US-16** · Como Admin quiero **ver qué versión de la matriz / del mapa de indagación / del
  prompt produjo cada diagnóstico**, para calibrar con casos reales.
- **US-17** · Como Admin quiero **que Newen lea sólo el resultado (no la evidencia cruda)**,
  para proteger a las personas nombradas en la entrevista.

## Fuera de alcance v1 (anotado)

- Versión A (autodiagnóstico web público).
- Módulo de SEGUIMIENTO post-intervención.
- Migración A → B en vivo (el modelo lo permite, la UI no en v1).
