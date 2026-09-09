# Protocolo de Seguridad de Arquitectura IA (PSAI)
### Versión 1.3 — Revisión post-auditoría de vulnerabilidades

*Scope:* Anima · Lexar · Pipeline de Podcast · Toda app futura
*Fecha:* Mayo 2026
*Estado:* Documento vivo — someter a revisión antes de cada release a producción

## Changelog v1.0 → v1.3

### v1.0 → v1.1
- B1A: Agregada capa de normalización de texto previa al regex
- B1B: Reemplazado clasificador LLM externo por LlamaGuard 3 local
- B2: Corregida validación SSRF — string matching reemplazado por DNS resolution
- B3: Implementado cifrado AES-256 con break-glass protocol para logs forenses
- Nuevo: Bloque 4 — Validación de outputs
- Nuevo: Rate limiting con granularidad por sesión
- Nuevo: Bloque de cumplimiento legal (HIPAA / GDPR / BAA)
- Anima: Deshabilitado rendering de Markdown con links/imágenes externos
- Lexar: Clasificador B1B parametrizable por dominio legal

### v1.1 → v1.2
- B1A: Limitada recursividad de decodificación Base64 a 2 niveles + try-except estricto
- B2: Corregida vulnerabilidad TOCTOU/DNS Rebinding — IP resuelta una vez y fijada en la llamada HTTP con header Host original
- B4: Política cambiada de bloqueo total a sanitización — outputs con contenido prohibido llegan al usuario con el elemento reemplazado, no bloqueados completos
- Rate Limiter: Contadores migrados a clúster Redis aislado para persistencia entre reinicios del Gateway

### v1.2 → v1.3
- Bug crítico: Corregida desconexión fatal en validador Pydantic B2 — NameError por llamada a función obsoleta validar_url_ssrf
- B1A: Agregada detección de espaciado intencional entre caracteres (s u p e r v i s o r → supervisor)
- B4: Sanitización refactorizada a pasada única sobre texto original — elimina riesgo de contaminación entre iteraciones y corrupción de JSON
- Rate Limiter: Migrado de Sorted Sets a INCR+EXPIRE atómico — elimina OOM por sesiones efímeras y colisión de timestamps en el mismo milisegundo
- B1B: Corregido formato de prompt para LlamaGuard 3 usando apply_chat_template() nativo
- B3: Campo patron_detectado renombrado a patron_id con identificador opaco — previene exposición accidental de texto del usuario

---

## Filosofía de diseño

Este protocolo no es una capa que se agrega al final. Es el esqueleto sobre el que se construye cada aplicación.

Tres principios inamovibles:

**Security by design** — La seguridad se diseña antes del primer endpoint, no después del primer incidente.

**Zero trust** — Todo input es sospechoso por defecto. Ningún dato que venga del exterior — usuario, archivo, memoria, base de datos — se procesa sin pasar por el Gateway.

**Defense in depth** — Ninguna capa confía en que la anterior fue suficiente. Cada bloque es independiente y funcional aunque los otros fallen.

---

## Mapa de amenazas — Superficie de ataque para apps LLM

### Grupo 1 — Inyección de instrucciones

| Amenaza | Descripción | Riesgo |
|---|---|---|
| Prompt injection directa | El usuario embebe instrucciones en su mensaje para modificar el comportamiento del modelo | Alto |
| Prompt injection indirecta | Instrucciones maliciosas llegan vía fuentes externas: archivos, Drive, DB, respuestas de APIs | Muy alto |
| Jailbreaking | Secuencia de mensajes construida para romper las restricciones del system prompt | Alto |
| Manipulación de contexto | El usuario construye conversación lentamente para llevar al modelo a revelar o modificar datos | Alto |
| Memory poisoning | Se inyectan instrucciones en el sistema de memoria para que afecten sesiones futuras | Muy alto |
| Inyección por ofuscación | Evasión de filtros usando Unicode, Base64, Zero-Width Spaces, separación de caracteres | Alto |

### Grupo 2 — Exfiltración de datos

| Amenaza | Descripción | Riesgo |
|---|---|---|
| Extracción vía modelo | El modelo se usa como intermediario para acceder a datos de otros usuarios | Alto |
| Leak del system prompt | El usuario logra que el modelo revele el system prompt | Medio |
| Escalado de privilegios | Un usuario accede a funciones o datos de otro nivel de acceso | Alto |
| Exfiltración por canal lateral | Tags de imagen o links en Markdown filtran datos a servidores externos silenciosamente | Muy alto |

### Grupo 3 — Inyección a nivel de datos

| Amenaza | Descripción | Riesgo |
|---|---|---|
| SQL injection via output | El modelo genera SQL malicioso que se ejecuta en la DB | Muy alto |
| NoSQL injection | Similar al anterior para MongoDB, Firebase, etc. | Alto |
| SSRF via tool calls | Se manipulan herramientas del agente para hacer requests a IPs internas | Alto |
| SSRF por representación alternativa | IPs internas representadas en decimal, octal o hex para evadir filtros de string | Muy alto |
| Path traversal | Input diseñado para acceder a rutas de archivos fuera del directorio permitido | Medio |

### Grupo 4 — Abuso de recursos

| Amenaza | Descripción | Riesgo |
|---|---|---|
| Token flooding | Inputs diseñados para consumir el máximo de tokens y escalar costos | Medio |
| Loop injection | Se induce al agente a ejecutar ciclos infinitos | Medio |
| DoS autoinfligido | El propio gateway bloquea requests legítimos por dependencia de servicio externo caído | Alto |
| Rate abuse | Automatización masiva de requests para degradar el servicio | Medio |

### Grupo 5 — Vulnerabilidades de output

| Amenaza | Descripción | Riesgo |
|---|---|---|
| Output malicioso | El modelo manipulado genera URLs, código o referencias a archivos externos en su respuesta | Alto |
| Code injection en output | El output contiene código ejecutable que la app renderiza o evalúa | Muy alto |
| Markdown exfiltration | Links o imágenes en el output del modelo filtran información al renderizarse | Alto |

---

## Arquitectura del Gateway de Seguridad

El Gateway es un **servicio independiente en servidor dedicado aislado**. No comparte proceso, memoria ni servidor con ninguna app.

```
┌──────────────────────────────────────────────────────────────┐
│                   APP (Anima / Tutor / etc.)                 │
└────────────────────────┬─────────────────────────────────────┘
                         │  Todo input pasa por aquí
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                   GATEWAY DE SEGURIDAD                        │
│                   (servidor dedicado aislado)                 │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ BLOQUE 1 │  │ BLOQUE 2 │  │ BLOQUE 3 │  │  BLOQUE 4  │  │
│  │Detección │→ │Validación│→ │Auditoría │→ │Validación  │  │
│  │de intenc.│  │de schema │  │cifrada   │  │de outputs  │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
│                                                              │
│  INPUT/OUTPUT RECHAZADO → Log cifrado + Alerta               │
└────────────────────────┬─────────────────────────────────────┘
                         │  Solo pasa lo que pasó los 4 bloques
                         ▼
           ┌──────────────────────────┐
           │  Anthropic API / DB /    │
           │  Servidor / Herramientas │
           └──────────────────────────┘
```

**Regla de oro:** Si el Gateway falla o no responde, la app no procesa el request. El default es bloquear, nunca permitir.

**Por qué servidor dedicado:** Si el Gateway corre en el mismo servidor que la app, un ataque de Remote Code Execution (RCE) en la app comprometería el Gateway de inmediato. El aislamiento no es opcional.

---

## Bloque 1 — Detección de intención maliciosa

### Sub-capa 1A — Normalización + filtro de patrones

La normalización de texto es **obligatoria** antes del regex. Sin ella, el filtro es eludible con Unicode, Base64, Zero-Width Spaces o separación de caracteres.

Patrones base bloqueados:
- Instrucciones de override: "ignora las instrucciones", "olvida lo anterior", "actúa como si"
- Intentos de exfiltración: "muéstrame tu prompt", "revela"
- SQL Injection: DROP, DELETE, UNION SELECT, comentarios SQL (--), /**/ 
- Path traversal: ../, ..\\, %2e%2e
- Protocolos internos: file://

### Sub-capa 1B — Clasificador local (LlamaGuard 3)

LlamaGuard 3 corre **localmente**. No se envía input a servicio externo para la capa de seguridad crítica.

Contextos por dominio:
- **default**: sin contexto adicional
- **legal**: lenguaje agresivo, términos penales y cláusulas coercitivas son normales en documentos legales
- **clinico**: clasifica UNSAFE si intenta alterar el comportamiento del sistema o acceder a datos de otros pacientes

---

## Bloque 2 — Validación de schema estricta

### Corrección SSRF — DNS resolution, no string matching

La validación de SSRF se hace **resolviendo DNS y bloqueando rangos RFC 1918**, no buscando strings.

Previene:
- http://127.1/ (octal)
- http://2130706433/ (decimal)
- http://0x7f000001/ (hex)

**DNS Rebinding mitigation:**
- IP resuelta una sola vez en el Gateway
- IP fijada en los parámetros de la llamada HTTP
- Header Host enviado con el hostname original para TLS y routing
- La herramienta no resuelve DNS de nuevo

Schemas con validación:
- EntradaDB: id_usuario, tipo_accion, contenido, timestamp
- ArchivoExterno: nombre, extension, tamaño_max_bytes

---

## Bloque 3 — Auditoría cifrada con break-glass protocol

### Cifrado AES-256 en reposo

Input completo se cifra con AES-256 (via Fernet).
La llave maestra nunca toca el disco de los servidores de la app.

### Break-glass protocol

1. **SOLICITUD** — Responsable técnico documenta incidente y justifica acceso
2. **APROBACIÓN** — Oficial de seguridad aprueba por escrito (email firmado o 2FA)
3. **ACCESO TEMPORAL** — Se genera llave con TTL de 4 horas
4. **AUDITORÍA POST-ACCESO** — El acceso se registra en log inmutable separado
5. **REVOCACIÓN** — Llave expira automáticamente al TTL

### Formato de log

```json
{
  "timestamp":           "2026-05-25T03:14:22.441Z",
  "app":                 "tutor-universitario",
  "version_gateway":     "1.3.0",
  "sesion_id":           "abc123",
  "usuario_hash":        "sha256:e3b0c44...",
  "tipo_evento":         "INPUT_BLOQUEADO_B1A",
  "bloque":              "B1A",
  "patron_id":           "B1A_SQL_003",
  "input_hash":          "sha256:a9f3c2...",
  "input_cifrado":       "<AES-256 blob>",
  "accion_tomada":       "RECHAZADO",
  "dominio_app":         "educativo",
  "latencia_ms":         14,
  "ip_origen_hash":      "sha256:...",
  "alerta_recurrencia":  false
}
```

Retención mínima: **5 años** para app educativo

---

## Bloque 4 — Validación de outputs

Sanitiza el output del modelo antes de enviarlo al usuario.

**Política v1.3:** Pasada única sobre texto original. Cada fase opera sobre una copia del input, no sobre el output de la fase anterior.

Elementos bloqueados/sanitizados:
- Patrones peligrosos: `<script>`, `javascript:`, `data:text/html`, `eval()`, `exec()`, `__import__`, `subprocess`
- Imágenes Markdown externas: `![alt](https://)`
- Links externos no whitelisted

Whitelisted domains: docs.anthropic.com, (agregar por app)

**Etiquetas de sanitización:**
- `[CONTENIDO BLOQUEADO POR POLÍTICA DE SEGURIDAD]`
- `[IMAGEN BLOQUEADA POR POLÍTICA DE SEGURIDAD]`

---

## Rate Limiting — Granularidad por sesión

Límites calibrados por perfil de uso:

| App | Requests | Ventana |
|---|---|---|
| anima | 60 | 60 seg |
| tutor-universitario | 40 | 60 seg |
| lexar | 100 | 600 seg |
| pipeline | 10 | 3600 seg |
| default | 20 | 60 seg |

**Implementación v1.3:** INCR+EXPIRE atómico en Redis dedicado

---

## Cumplimiento legal por app

### Tutor Universitario

- [ ] Consentimiento informado del estudiante sobre uso de IA
- [ ] Aviso de privacidad visible antes del primer uso
- [ ] Proceso documentado de eliminación de datos a solicitud del usuario
- [ ] Logs con retención mínima de 5 años
- [ ] Para apps con menores (Sofi, 13 años): consentimiento parental o autorización educativa

---

## Checklist de integración — antes de producción

**Infraestructura:**
- [ ] Gateway en servidor dedicado aislado
- [ ] Variable GATEWAY_URL configurada
- [ ] Timeout del gateway: 3 segundos → bloquear si no responde
- [ ] Health check del gateway antes de procesar cualquier request
- [ ] LlamaGuard 3 descargado y corriendo localmente en el servidor del Gateway

**Bloque 1:**
- [ ] Función de normalización implementada y testeada
- [ ] Patrones base del protocolo importados
- [ ] Patrones específicos del dominio de la app agregados
- [ ] Dominio del clasificador B1B configurado (educativo para Tutor)

**Bloque 2:**
- [ ] Schema definido para cada tipo de dato que llega a la DB
- [ ] Validación SSRF por DNS resolution implementada
- [ ] Schema para cada herramienta externa
- [ ] Whitelist de extensiones de archivo definida

**Bloque 3:**
- [ ] Log en sistema separado (SIEM o append-only)
- [ ] Cifrado AES-256 activo en reposo
- [ ] Break-glass protocol documentado y asignado a responsable
- [ ] Retención mínima configurada según normativa de la app
- [ ] Alerta de patrón recurrente activa (3+ bloqueos / 10 min)

**Bloque 4:**
- [ ] Validación de output activa antes de enviar al usuario
- [ ] Whitelist de dominios permitidos en output definida
- [ ] Markdown con links externos deshabilitado en la UI

**Rate limiting:**
- [ ] Límites por sesión definidos y configurados
- [ ] Granularidad correcta para el contexto de la app

**Cumplimiento legal:**
- [ ] Checklist legal completado
- [ ] Consentimiento de menores de edad si aplica

**Tests de seguridad:**
- [ ] Test de prompt injection directa con y sin ofuscación Unicode
- [ ] Test de prompt injection indirecta (vía archivo/memoria)
- [ ] Test de SSRF con IP decimal, octal y hex
- [ ] Test de SQL injection con comentarios en línea
- [ ] Test de path traversal
- [ ] Test de output con Markdown exfiltration
- [ ] Test de input por encima del límite de tamaño
- [ ] Test de schema con campos extra
- [ ] Test de fallo del gateway (verificar que bloquea, no que deja pasar)
- [ ] Test de rate limiting por sesión

---

PSAI v1.3 — Mayo 2026
