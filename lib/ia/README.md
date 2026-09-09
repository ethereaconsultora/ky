# lib/ia/ — Capa de IA (BFF)

Orquestación de los motores de Claude. Separa la lógica (pura, testeable con un doble)
de la llamada real al SDK.

| Archivo | Rol | Importa el SDK |
|---|---|---|
| `tipos.ts` | `ClienteModelo` (interfaz inyectable), `UsoModelo`, `ErrorIA`. | no |
| `validar.ts` | Zod de las 3 salidas — contraparte ejecutable de `../diagnostico/schemas.ts`. | no |
| `normalizar.ts` | Higiene de la transcripción (PSAI B1) + saneo de salida (PSAI B4). | no |
| `motor-turno.ts` | `ejecutarTurno()` — arma prompts, llama al `ClienteModelo`, sanea, devuelve salida + `meta`. | no |
| `cliente.ts` | `clienteAnthropic()` — única implementación real. `messages.create` + `output_config.format`. | **sí** |
| `index.ts` | Barrel. No importar desde el browser ni desde tests de dominio. | vía `cliente.ts` |

## Regla de dependencias

`motor-turno.ts` **no** importa `cliente.ts`. El Route Handler `/api/turno` (Fase 4) hace:

```ts
import { ejecutarTurno } from "@/lib/ia/motor-turno";
import { clienteAnthropic } from "@/lib/ia/cliente";
const { salida, meta } = await ejecutarTurno(entrada, clienteAnthropic());
// persistir: respuesta_cruda (cifrada), fenomeno_detectado, llamada_ia(meta)
```

Los tests (`node --test`) importan `motor-turno.ts` directamente con un `ClienteModelo` falso
→ no cargan el SDK.

## Pendiente

- Smoke test de `cliente.ts` contra la API real (modelos `claude-haiku-4-5` / `claude-opus-5`,
  `thinking`, `effort`) — Fase 4, requiere `ANTHROPIC_API_KEY`.
- Eval de amplitud/profundidad del Motor de Turno con Ari (transcripciones tipo Alemany).
- `/api/turno`, `/api/sintesis`, `/api/sintesis/mensaje` (Route Handlers + rate limit + persistencia).
