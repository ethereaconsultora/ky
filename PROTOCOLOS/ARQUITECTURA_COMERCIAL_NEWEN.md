# ARQUITECTURA_COMERCIAL_NEWEN.md
### Jerarquía de planes, módulo transversal y modelo híbrido de monetización
Versión 1.0 — Reemplaza el modelo de planes de `PORTAL_PAGOS_STANDARD.md` §2-3 (de 3 planes simples + combos, pasa a 5 niveles + módulo transversal + comisión por transacción). Se apoya en `NEWEN_ARQUITECTURA_ACCESOS_STANDARD.md` (el `Entitlement` sigue siendo el mecanismo de acceso; lo que cambia acá es cuántos niveles y cómo se combinan).

---

## 0. Objetivo

Pasar de "tres áreas que se venden por separado" a una **progresión clara**: alguien puede entrar a Newen sin pagar nada, quedarse ahí el tiempo que quiera, y subir de nivel solo cuando lo necesita. Campus deja de ser "una tercera área más" y pasa a ser una capacidad que se activa sobre cualquier nivel. Institucional es la puerta de entrada B2B de mayor escala, con trato distinto al resto.

Mensaje central del negocio: **Newen no vende software, vende una progresión.**

---

## 1. La arquitectura de niveles

```
FREE ─▶ PROFESIONAL ─▶ PROFESIONAL PRO ─▶ EMPRESA ─▶ INSTITUCIONAL
                              │
                     (en cualquier punto)
                              ▼
                           CAMPUS  ← módulo transversal, no un nivel más
```

- Los primeros cinco son una **escalera** — cada uno es un paso más allá del anterior, no una opción alternativa.
- Campus es **ortogonal** a la escalera: se activa solo, o sobre cualquier escalón, sin obligar a subir de nivel para tenerlo.
- El modelo de comisión por transacción (§6) corre **por debajo de todo**, independiente del nivel — es la manera de monetizar incluso a quien está en Free.

---

## 2. Tabla de niveles

| Nivel | Precio | Frase de valor | Quién lo usa |
|---|---|---|---|
| **Free** | US$0/mes | "Para formar parte de Newen." | Cualquier profesional que quiere presencia sin compromiso |
| **Profesional** | US$12/mes | "Tu espacio profesional dentro de Newen." | Profesional que ya trabaja con clientes y necesita herramientas reales |
| **Profesional Pro** | US$19/mes | "Más herramientas para hacer crecer tu práctica." | Profesional consolidado que quiere métricas y automatización |
| **Empresa** | Desde US$39/mes (escalado por usuarios) | "Un espacio digital para tu organización." | Organización con equipo propio |
| **Institucional** | Soluciones desde US$150/mes | "Newen para comunidades profesionales e instituciones." | Clínicas, universidades, colegios profesionales, mutuales, ONG |
| **Campus** *(transversal)* | Desde US$29/mes + créditos de evento | "Creá y gestioná experiencias de aprendizaje." | Cualquiera de los anteriores que quiera dictar cursos/cohortes |

---

## 3. Detalle por nivel

### 3.1 Free
- Perfil profesional básico, presencia dentro de Newen, visibilidad en la red profesional, acceso a contenidos públicos, recepción de contactos/consultas.
- Sin costo de suscripción. Sin tarjeta requerida.
- Objetivo comercial: bajar la barrera de entrada a cero. No es un plan "recortado para presionar el upgrade" — tiene que sentirse completo para lo que promete (presencia, no gestión).

### 3.2 Profesional
- Mi Consultorio, agenda profesional, historia/registro profesional, videollamada 1:1 integrada, pagos integrados, perfil profesional completo, muro y contenidos, talleres.
- Sin permanencia — se comunica explícitamente para bajar la fricción de decisión.
- Es el **punto de entrada comercial real** (a diferencia de Free, que es solo presencia).

### 3.3 Profesional Pro
- Todo lo de Profesional + herramientas avanzadas, estadísticas y métricas, mayor personalización de perfil, automatizaciones, gestión avanzada de contenidos y talleres.
- Funciona como **ancla de valor**: su existencia hace que Profesional se vea accesible sin devaluarlo.

### 3.4 Empresa
- Espacio y perfil de empresa, vidriera pública personalizable, dashboard completo, múltiples usuarios con roles y permisos, gestión de equipos, herramientas para programas internos.
- Escalado por cantidad de usuarios:

| Usuarios | Precio |
|---|---|
| Hasta 20 | US$39/mes |
| Hasta 50 | US$59/mes |
| Hasta 100 | US$89/mes |
| Más de 100 | Consultar |

### 3.5 Institucional
- No es una suscripción estándar — es una conversación comercial.
- Incluye: gestión de múltiples profesionales, espacios institucionales, usuarios y roles, Campus incluido, videollamadas, gestión de contenidos, servicios profesionales, configuración personalizada, escalabilidad según usuarios/profesionales.
- Precio de referencia ("desde US$150/mes") funciona como ancla, no como tarifa cerrada — el cierre real es siempre "Hablar con Newen".

### 3.6 Campus (módulo transversal)
- Cohortes, LMS, gestión de docentes y alumnos, cursos, certificados, videollamada masiva (Jitsi+OBS), eventos.
- Estructura híbrida ya definida en `PORTAL_PAGOS_STANDARD.md` §2.1: base mensual + créditos de evento masivo, comprados aparte.
- Se activa como **add-on** sobre Free, Profesional, Pro, Empresa o como parte incluida de Institucional — nunca requiere "subir de nivel" en la escalera principal para acceder a él.

---

## 4. Combinaciones (combos)

No son un sexto nivel — son descuentos por activar Campus junto a un nivel de la escalera. Se muestran, pero siempre aclarando que cada área funciona sola:

| Combinación | Precio |
|---|---|
| Profesional + Campus | Desde US$41/mes |
| Profesional Pro + Campus | Desde US$48/mes |
| Profesional + Empresa + Campus | Desde US$80/mes |

Regla: el combo nunca se presenta como obligatorio ni como la opción "por defecto" — es un ahorro para quien de todos modos iba a usar ambas cosas.

---

## 5. Modelo de datos actualizado

Extiende el `Plan` de `PORTAL_PAGOS_STANDARD.md` §3 con el concepto de nivel y de add-on:

```typescript
interface Plan {
  id: string;
  tier: 'free' | 'profesional' | 'profesional-pro' | 'empresa' | 'institucional';
  isAddon: boolean;                 // true solo para Campus
  name: string;
  billingType: 'free' | 'recurring' | 'usage' | 'hybrid' | 'custom';
  priceMonthly?: number;
  usageUnit?: 'evento' | 'asistente' | 'hora';
  usagePrice?: number;

  // Solo para tier "empresa"
  seatTiers?: { maxUsers: number; priceMonthly: number }[];

  // Solo para tier "institucional"
  isCustomQuote?: boolean;          // true → no hay precio cerrado, deriva a contacto comercial

  includesAreas: ('profesional' | 'empresa' | 'campus')[];
  requiresTier?: Plan['tier'];      // para add-ons que solo aplican sobre cierto nivel mínimo (si corresponde)
}

// Combos: no son un Plan nuevo, son una regla de precio sobre dos Subscriptions activas
interface ComboDiscount {
  id: string;
  tiers: Plan['tier'][];            // ej: ["profesional"] + Campus
  includesCampus: true;
  discountedPriceMonthly: number;   // precio final combinado, ya con el descuento aplicado
}
```

### 5.1 Modelo de comisión por transacción

```typescript
interface TransactionFee {
  id: string;
  context: 'consulta' | 'taller' | 'curso';
  percentage: number;               // no se muestra públicamente en la pantalla de precios
  appliesRegardlessOfTier: true;    // corre incluso en el nivel Free
}
```

Este modelo corre **en paralelo** a las suscripciones — no depende del `Entitlement` de área, depende de que la transacción se haya cobrado a través de Newen (integración de pagos ya definida en `PORTAL_PAGOS_STANDARD.md`).

---

## 6. Jerarquía visual para la pantalla de precios

Orden de importancia visual (no de lectura de arriba a abajo, sino de peso/protagonismo):

1. Profesional — card destacada, borde de acento
2. Profesional Pro — etiqueta "Recomendado", segundo en peso
3. Free — card discreta, borde punteado, sin competir con Profesional
4. Empresa — una sola card con tabla de escalado integrada
5. Campus — franja horizontal completa, fuera de la grilla de planes, con la etiqueta "Módulo transversal"
6. Institucional — panel propio, visualmente distinto de las cards (no es una suscripción más)
7. Combos — banda final, borde punteado, tono de "opcional"

---

## 7. Reglas de copy

**Evitar:** "Oferta", "¡Comprá ahora!", "Última oportunidad", "El mejor precio", "Oferta exclusiva" — cualquier lenguaje de presión o urgencia artificial.

**Usar:** "Comenzar", "Activar", "Elegir", "Explorar", "Hablar con Newen" — verbos que transmiten autonomía y decisión propia del usuario, no persuasión.

El tono general comunica progresión y modularidad: la persona decide cuándo crecer, Newen no la empuja.

---

## 8. Instrucciones para Copilot / DeepSeek

```
Actualizá el modelo de planes descrito en PORTAL_PAGOS_STANDARD.md
según la nueva arquitectura de ARQUITECTURA_COMERCIAL_NEWEN.md.

Cambios sobre lo ya implementado:
1. Agregar el tier "free" (sin Invoice ni Subscription real, solo un
   Entitlement(area:"profesional", status:"active") con flag
   isFreeTier:true que limita las funcionalidades visibles).
2. Agregar el tier "profesional-pro" como Plan separado de
   "profesional", no como un flag sobre el mismo — deben poder
   coexistir como Subscriptions distintas para permitir upgrade/downgrade.
3. Agregar seatTiers[] al Plan de tier "empresa" — el checkout debe
   permitir elegir el tramo de usuarios y recalcular el precio.
4. Agregar isCustomQuote a "institucional" — el CTA de ese plan no
   lleva a checkout, lleva a un formulario de contacto comercial.
5. Campus pasa a marcarse como isAddon:true — debe poder combinarse
   con cualquier tier sin requerir uno específico, salvo que
   Institucional ya lo incluya por defecto.
6. Implementar ComboDiscount como regla de precio, no como Plan nuevo
   — se aplica quen la cuenta tiene activas dos Subscriptions que
   matchean un combo definido.
7. Implementar TransactionFee, aplicado en el flujo de cobro de
   consultas/talleres/cursos independientemente del tier del usuario.

Antes de entregar código, generá la entrada para CHANGELOG.md y el
archivo logs/FECHA-arquitectura-comercial-vX.X.X.md como siempre.
```

---

*Fin del documento. Jerarquía completa: `ETHEREA_UI_STANDARD.md` → `NEWEN_ARQUITECTURA_ACCESOS_STANDARD.md` → `ARQUITECTURA_COMERCIAL_NEWEN.md` (este archivo, reemplaza el modelo de planes de `PORTAL_PAGOS_STANDARD.md` §2-3) → `PLANTILLAS_ESPACIO_COMERCIAL_EMPRESA.md` / `PLANTILLAS_ESPACIO_COMERCIAL_CAMPUS.md`.*
