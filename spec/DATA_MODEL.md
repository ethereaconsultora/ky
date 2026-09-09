# DATA MODEL — KY

> Implementa `metodo-ec/modelo-datos-ec-v1.md` con los ajustes de `PLAN_APROBADO.md` Parte 3.
> KY sólo escribe la Versión B; los campos de la Versión A existen pero quedan nulos.
> Nombres de tabla/columna en `snake_case`. Todo en el **proyecto Supabase de EC**.

## Jerarquía

```
empresa
  └── diagnostico (diagnostico_origen_id → diagnostico, nullable)
        ├── datos_economicos            (1:1)
        ├── consentimiento              (1:1, si modo_captura = audio_transcrito)
        ├── respuesta_cruda             (1:N)
        ├── fenomeno_detectado          (1:5)
        ├── relacion_fenomeno           (0:N)
        ├── reversibilidad              (0:N)
        ├── perdida_economica           (1:1 al cierre)
        ├── intervencion_propuesta      (1:1 al cierre)
        └── llamada_ia                  (1:N, auditoría)
consentimiento_textos                   (catálogo global, versionado)
users                                   (Supabase Auth; rol counselor | admin)
```

## Tablas

### `empresa`
| Campo | Tipo | Generado por | Notas |
|---|---|---|---|
| id | uuid pk | cálculo | |
| nombre | text not null | consultor | |
| sector | text | consultor | contexto para el motor |
| tamano_n | int | consultor | N — insumo motor económico |
| organization_client_id | uuid null | admin | **FK lógico al proyecto Newen** — se completa cuando el prospecto se vuelve cliente (ajuste del plan) |
| fecha_alta | timestamptz default now() | cálculo | |

### `diagnostico`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| empresa_id | uuid fk → empresa | |
| version | text check in ('A','B') default 'B' | |
| diagnostico_origen_id | uuid fk → diagnostico null | migración A→B |
| resultado_tipo | text check in ('DOMINANTE_CONFIRMED','DOMINANTE_AMBIGUOUS','DOMINANTE_DEBIL','SIN_EVIDENCIA_SUFICIENTE') null | **`DOMINANTE_DEBIL` agregado** (B3 del plan) |
| caso | int check between 1 and 4 null | resultado de la síntesis |
| counselor_id | uuid fk → users | |
| modo_captura | text check in ('manual','audio_transcrito') default 'audio_transcrito' | |
| prompt_version | text | **auditoría** (gap 6) |
| mapa_indagacion_version | text | **auditoría** (Parte 1.E) |
| estado | text check in ('en_curso','cerrado','pausado') default 'en_curso' | |
| fecha_inicio | timestamptz default now() | |
| fecha_cierre | timestamptz null | |
| paused_at / expires_at / resume_token | timestamptz / timestamptz / text | sólo si pausado |

### `datos_economicos`
| Campo | Tipo | Notas |
|---|---|---|
| diagnostico_id | uuid pk fk → diagnostico | |
| n_empleados | numeric not null | |
| s_salario_mensual | numeric not null | |
| r_rotacion_anual | numeric not null | 0–1 |
| eje_1 / eje_2 / eje_3 | numeric null | **opcionales** (B1 del plan): 3 ejes de fricción |
| factor_friccion_derivado | numeric null | **calculado desde fenómenos confirmados** al cierre (B1) |

### `consentimiento`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| diagnostico_id | uuid fk → diagnostico | |
| texto_id | uuid fk → consentimiento_textos | qué versión se mostró |
| aceptado_por | text | nombre/rol del entrevistado |
| aceptado_at | timestamptz | |

### `consentimiento_textos` (catálogo)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| version | text unique | ej. `audio-v1` |
| cuerpo | text | texto legal mostrado al entrevistado |
| vigente_desde / vigente_hasta | timestamptz | |

### `respuesta_cruda` — entidad de trazabilidad
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| diagnostico_id | uuid fk → diagnostico | |
| fenomeno_asociado | text null | a qué fenómeno aporta evidencia (IA) |
| mecanismo_asociado | text null | **a qué hilo de la mapa de indagación aporta** (Parte 1.E) |
| tipo_pregunta | text check in ('deteccion','evidencia','consecuencia','confirmacion','puente') | |
| pregunta_texto | text | qué se preguntó exactamente |
| modalidad | text check in ('texto','audio') | |
| texto_cifrado | bytea null | **pgcrypto** — evidencia verbatim (si modalidad=texto) |
| transcripcion_cifrada | bytea null | **pgcrypto** — materia prima real del motor (si modalidad=audio) |
| audio_ref | text null | opcional, gobernado por retención |
| consentimiento_id | uuid fk → consentimiento null | sellado en cada respuesta de audio (I8 del plan) |
| alerta_seguridad | boolean default false | **protocolo de crisis** (gap 2) — si true, el fragmento sensible no se guarda en claro |
| ts | timestamptz default now() | orden cronológico |

### `fenomeno_detectado`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| diagnostico_id | uuid fk → diagnostico | |
| fenomeno_tipo | text check in ('mandos_medios','clima_vinculos','desgaste','transicion','estructura') | |
| cond_evidencia / cond_recurrencia / cond_consecuencia / cond_hipotesis | boolean | 4 condiciones |
| nota_condicion | text null | **el "parcial"** (I1 del plan) |
| estado | text check in ('confirmado','en_observacion','descartado') | |
| intensidad | text check in ('leve','moderado','severo','critico') null | sólo si confirmado |
| confianza | text check in ('baja','media','alta') null | sólo si confirmado |
| mecanismo_organizacional | text null | |
| consecuencia_operativa | text null | |
| indicador_economico | text check in ('presentismo','rotacion','horas_improductivas','friccion') null | |
| mecanismos | jsonb default '[]' | **nivel 2 de la Mapa de Indagación** — hilos detectados con su evidencia (Parte 1.E) |
| perfil_mando | text null | **lectura tipo FAUNA** emergente (Parte 1.E) |
| razonamiento | text null | por qué se llegó a este estado (mejora del plan) |

### `relacion_fenomeno` (sólo B)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| diagnostico_id | uuid fk → diagnostico | |
| fenomeno_a / fenomeno_b | text | par relacionado |
| tipo_relacion | text check in ('A_B','B_A','A_HIP_B','A_CONF_B','A_PERP_B','A_ABIERTO_B') | → / ← / ↔ / ⇄ / ⊥ / ? |
| evidencia_soporte | text | razonamiento auditable |
| requirio_pregunta_puente | boolean default false | |
| punto_accesibilidad_sugerido | text null | sólo si circuito |

### `reversibilidad` (sólo B)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| diagnostico_id | uuid fk → diagnostico | |
| aplica_a | text | `fenomeno:<tipo>` \| `relacion:<id>` \| `circuito` |
| grado_temprano | numeric | 0–1 (6 meses) |
| grado_tardio | numeric | 0–1 (24 meses) |
| peso_atribucion | numeric null | sólo co-dominante |
| alcance | numeric null | sólo circuito |
| factor_confianza_circuito | numeric null | 0.5 hipotético / 1.0 confirmado |
| plazo_aparicion_efecto | text check in ('inmediato','corto','medio','largo') | **renombrado** (I6 del plan) |
| justificacion | text | |

### `perdida_economica`
| Campo | Tipo | Notas |
|---|---|---|
| diagnostico_id | uuid pk fk → diagnostico | |
| presentismo / rotacion / perdida_total | numeric | |
| reduccion_base | numeric | 40 % flat |
| reversibilidad_id | uuid fk → reversibilidad null | sólo B |
| reduccion_ajustada_min / reduccion_ajustada_max | numeric null | **rango** (regla de presentación de la matriz) |
| roi_min / roi_max | numeric null | **rango** |
| horizonte_proyeccion | text check in ('6m','12m','24m') null | **renombrado** (I6) |

### `intervencion_propuesta`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| diagnostico_id | uuid fk → diagnostico | |
| caso | int check between 1 and 4 | |
| fenomenos_objetivo | text[] | |
| descripcion | text | |
| traduccion_humana | text | |
| reversibilidad_id | uuid fk → reversibilidad | |
| horizonte_proyeccion | text check in ('6m','12m','24m') | |
| aprobada_por_consultor | boolean default false | |
| aprobada_at | timestamptz null | **gap 8** |
| enviada_at | timestamptz null | **gap 8** |
| artefacto_url | text null | **gap 8** — PDF/enlace que recibe la empresa |

### `llamada_ia` (auditoría — nueva, gap 6)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| diagnostico_id | uuid fk → diagnostico | |
| tipo | text check in ('turno','sintesis','mensaje') | |
| modelo | text | ej. `claude-haiku-4-5` |
| prompt_version / mapa_indagacion_version | text | |
| tokens_in / tokens_out | int | |
| latencia_ms | int | |
| ts | timestamptz default now() | |

## RLS (resumen — el SQL completo en `init_schema.sql`)

- `empresa`, `diagnostico` y todas las hijas: un `counselor` sólo ve las filas de sus propios
  diagnósticos (`diagnostico.counselor_id = auth.uid()`); `admin` ve todo.
- `respuesta_cruda`: además, sólo `counselor` dueño o `admin`. Nunca legible por `newen_reader`.
- `consentimiento_textos`: lectura para todos los autenticados; escritura sólo `admin`.

## Vistas para el FDW (`ec_publico` schema)

- `ec_publico.v_diagnostico` — id, empresa (nombre + `organization_client_id`), estado,
  `resultado_tipo`, `caso`, fecha_cierre, fenómeno dominante + mecanismo (sin evidencia cruda).
- `ec_publico.v_perdida_economica` — `perdida_total`, `reduccion_ajustada_min/max` (rango),
  `roi_min/max`, `horizonte_proyeccion`.
- `ec_publico.v_intervencion_propuesta` — `caso`, `descripcion`, `traduccion_humana`,
  `horizonte_proyeccion`, `aprobada_por_consultor`, `enviada_at`.
- **Ninguna vista expone `respuesta_cruda` ni campos con personas nombradas.**

## Config versionada (NO en DB — en `lib/diagnostico/`)

- Tabla de normalización `intensidad/confianza → 0–1` + umbrales `0.60/0.15` (B2/B3).
- Tabla `fenómeno → Δfactor_fricción` (B1).
- `mapa-indagacion.config` — hilos por fenómeno (Parte 1.E).
