# ESPACIO_EMPRESA_STANDARD.md
### Sistema del panel de administración interno de cada empresa (Newen OS)
Versión 1.0 — Formalizado a partir de `espacio-critico-maqueta.html` (VISTA 2 · Dashboard Admin Multicliente). Complementa a `ETHEREA_UI_STANDARD.md` (marca base) y a `NEWEN_ARQUITECTURA_ACCESOS_STANDARD.md` (quién ve qué). Este documento cubre el **panel interno** que cada empresa (ej. Espacio Crítico) usa para gestionar a sus clientes. La **página comercial pública** está cubierta por `PLANTILLA_COMERCIAL_EMPRESA_STANDARD.md`.

---

## 0. Objetivo y alcance

Cada empresa que compra un espacio en Newen necesita un **panel de administración multicliente**: un lugar donde gestiona a las organizaciones que atiende (sus "clientes"), con KPIs, sistemas en ejecución, informes, agenda, seguimiento y empleados.

Igual que la página pública, el panel **debe sentirse de la empresa**, no un template genérico. La misma idea de `PLANTILLA_COMERCIAL_EMPRESA_STANDARD.md` aplica acá pero en forma más contenida:

1. **Un `TenantConfig` de administración** por empresa (paleta, tipografía, marca, layout del shell).
2. **Cero colores/fuentes/radios hardcodeados** en componentes del panel — todo vía variables CSS (`--ec-*` en la maqueta; `--tenant-*` en el sistema).
3. **Sin tocar código** para cambiar apariencia.

Regla dura: **el panel interno y la página pública comparten la paleta de la empresa** (misma marca), pero cada uno tiene su propio `config` (público vs. admin) y su propio layout.

---

## 1. Paleta (design tokens del panel)

Basada en la maqueta de Espacio Crítico (oscura/dorada). Cada empresa puede cambiarla desde su `TenantConfig`.

| Token | Valor (Espacio Crítico) | Uso |
|---|---|---|
| `--tenant-bg-dark` | `#0a0908` | Fondo general del panel |
| `--tenant-panel-bg` | `#13110e` | Fondo de paneles/áreas |
| `--tenant-panel-border` | `#26201a` | Bordes de paneles |
| `--tenant-card-bg` | `#1a1612` | Fondo de tarjetas internas |
| `--tenant-card-border` | `#332b22` | Bordes de tarjetas |
| `--tenant-accent` | `#c4a87e` (dorado) | Acento: acciones, títulos, activo, KPIs |
| `--tenant-accent-hover` | `#d6be98` | Hover del acento |
| `--tenant-accent-dim` | `rgba(196,168,126,0.12)` | Fondo de estados activos |
| `--tenant-text-main` | `#f0eae1` | Texto principal |
| `--tenant-text-muted` | `#9e9382` | Texto secundario |
| `--tenant-text-dim` | `#6e6454` | Labels/metadata |
| `--tenant-status-active` | `#5a8a62` | Estados positivos / fases completadas |
| `--tenant-danger` | `#c0392b` | Acciones destructivas |
| `--tenant-serif` | `Georgia, 'Times New Roman', serif` | Títulos del panel |
| `--tenant-sans` | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` | Cuerpo y UI |
| `--tenant-radius` | `6px` (paneles 8–12px) | Radios |
| `--tenant-shadow` | `none` o sutil | Sombras planas |

Principio visual: **panel oscuro con acento dorado**, superficies planas, bordes de 1px que separan (sin sombras pesadas). Es la identidad "gobierno" de Newen OS.

---

## 2. Estructura del shell

```
┌──────────────────────────────────────────────────────────────┐
│ top-admin-bar (sticky)                                        │
│  🛡️ PANEL DE ADMINISTRACIÓN — <EMPRESA>   Cliente ▾          │
│  [+ Cargar Cliente] [Campus] [Sitio público] [PDF Ejecutivo] │
├──────────────┬───────────────────────────────────────────────┤
│ aside (250px) │ header-container                              │
│  NEWEN OS     │   h1 <cliente> · subtítulo (sistema en curso) │
│  ──────────── │   [Ficha] [Editar] [Archivar]                 │
│  Empresa Activa│ ──────────────────────────────────────────── │
│   Workspace   │ tabs-nav (6 tabs)                             │
│  Gestión Global│ ──────────────────────────────────────────── │
│   Clientes     │ content-container (tab activo)               │
│   Archivados   │   grid-3 KPIs / panels / tablas / etc.       │
│   Bitácora     │                                              │
│   Sistemas     │                                              │
│  Accesos rápidos│                                             │
│   Campus / Web │                                              │
└──────────────┴───────────────────────────────────────────────┘
```

### 2.1 Topbar de administración (`top-admin-bar`)
- **Badge**: `🛡️ PANEL DE ADMINISTRACIÓN — <EMPRESA>` (dorado, tracking amplio).
- **Selector de cliente** (`client-dropdown`): el área es multicliente; se elige qué organización atender. Select con borde dorado.
- **Acciones**: `+ Cargar Cliente` (dorado), `Campus` (link), `Sitio público` (link a `/e/slug`), `Descargar Informe Ejecutivo PDF` (dorado).

### 2.2 Sidebar (`aside`)
- **Marca**: `brand-logo-icon` (inicial, gradiente dorado) + `NEWEN OS`.
- **Grupos de navegación** (`nav-group-title`): títulos chicos en mayúscula y tenue.
  - `Empresa Activa`: Workspace del Cliente (activo).
  - `Gestión Admin Global`: Ver todos los clientes · Clientes Archivados · Bitácora Global · Configurar Nuevos Sistemas.
  - `Accesos rápidos`: Campus Virtual · Ver Sitio Público.
- **Item** (`nav-item`): ícono + label; hover `rgba(255,255,255,0.03)`; **activo**: fondo `--accent-dim`, texto dorado, `border-left: 3px solid` dorado.

### 2.3 Cabecera de cliente (`header-container`)
- `h1` serif con el nombre del cliente activo + subtítulo "Sistema en Ejecución: …".
- Acciones contextuales: `Ficha del Cliente` · `Editar` · `Archivar` (danger en hover).

### 2.4 Tabs (`tabs-nav`)
Barra de pestañas con `border-bottom: 2px` dorado en la activa. Las 6 pestañas del panel:

| # | Tab | Contenido |
|---|---|---|
| 1 | **Visión General & KPIs** | `grid-3` de KPIs (`stat-label` + `stat-number` grande serif dorado) + Resumen Ejecutivo para C-Level con botón PDF |
| 2 | **Sistemas en Ejecución (6 Fases)** | Timeline de 6 fases (Diagnóstico → Intervención → Medición → Seguimiento → Consolidación → Mantenimiento) con círculos completed/active + controles de admin |
| 3 | **Informes & Diagnósticos (PDFs)** | Lista de entregables (`report-row`) con botón `Descargar PDF` + cargar nuevo informe |
| 4 | **Agenda de Talleres & Counseling** | `grid-2`: Próximos Talleres + Bitácora/Solicitudes de Counseling, cada uno con botón de acción |
| 5 | **Seguimiento & Tareas** | Lista de tareas (`task-item`) con estado (`encurso/pendiente/completada`), anotaciones (`anno-item`) y agregar nota |
| 6 | **Empleados** | `emp-grid` de fichas (`emp-card`) con nombre, meta, `progressbar` de avance y acciones |

---

## 3. Componentes reutilizables del panel

Todos con variantes del `TenantConfig` (vía `var(--tenant-*)`), nunca valores sueltos.

| Componente | Clases (maqueta) | Uso |
|---|---|---|
| Panel | `panel-card` + `panel-card-header` | Contenedor base; título serif dorado |
| Grillas | `grid-2`, `grid-3` | Disposición de paneles |
| KPI | `stat-label` + `stat-number` | Métrica grande serif dorada + label |
| Timeline | `phases-timeline`, `phase-step`, `phase-circle` | Ciclo de 6 fases del sistema |
| Caja de control | `admin-controls-box` + `admin-label` | Controles de admin dentro de un panel |
| Fila de reporte | `report-row` + `btn-pdf` | Entregable + descarga |
| Item de agenda | `agenda-item` (fuerte + `.when` dorado) | Taller/sesión programada |
| Tarea | `task-item`, `task-head`, `task-state` | Seguimiento con estado |
| Ficha de empleado | `emp-card`, `emp-meta`, `progressbar` | Persona atendida con avance |
| Modal | `modal-overlay`, `modal-box`, `modal-head`, `modal-body` | Ficha/editar/derivar/archivar/nuevo cliente |
| Formulario | `form-grid`, `field`, `field.full` | Inputs sobre fondo `#0d0b09`, focus dorado |
| Checkbox | `checkbox-grid`, `checkbox-row` | Multi-selección (servicios, temas) |
| Ficha cliente | `ficha-grid`, `ficha-item` (k/v) | Detalle del cliente |
| Chips | `serv-chip` | Servicios del cliente |
| Mensajería | `chat-layout`, `chat-thread`, `bubble.espacio/.profesional`, `chat-compose` | Conversación espacio ↔ profesional |
| Toast | `toast` | Notificaciones (dorado, abajo al centro) |
| Archivos | `archived-row` | Clientes archivados |
| Derivación | `deriv-topic`, `deriv-counselor` | Derivar persona a un counselor |

Botones base:
- `btn-gold` — sólido dorado, texto oscuro (acción principal).
- `btn-outline` — transparente con borde; hover dorado; `.danger` hover rojo.
- `btn-secondary` / `topbar-link` — link/botón secundario con borde.
- `export-pdf-global` — dorado, para el informe ejecutivo.

Estados semánticos (`task-state`): `pendiente` (tenue), `encurso` (fondo dorado-dim + texto dorado), `completada` (verde `--status-active`).

---

## 4. Configurabilidad (`TenantConfig` admin)

Igual que la página pública usa `TenantSiteConfig` (§3 de `PLANTILLA_COMERCIAL_EMPRESA_STANDARD.md`), el panel usa un `TenantConfig` de administración más acotado:

```typescript
interface TenantConfig {
  id: string;                 // slug de la org
  displayName: string;
  colors: {                   // tokens de §1
    bgDark: string; panelBg: string; panelBorder: string;
    cardBg: string; cardBorder: string;
    accent: string; accentHover: string; accentDim: string;
    textMain: string; textMuted: string; textDim: string;
    statusActive: string; danger: string;
  };
  typography: { serif: string; sans: string };
  brand: { logoIcon?: string; logoText?: string };  // marca del panel (NEWEN OS por defecto)
  radius: string;
}
```

**Reglas:**
- Ningún componente del panel hardcodea color/fuente/radio: todo `var(--tenant-*)`.
- Si falta un token → fallback al default de Espacio Crítico (§1). Ninguna empresa queda rota.
- El panel y la página pública comparten `accent`/`colors` base (misma marca) pero se guardan en configs separados (`site_config` público + `panel_config` admin).

---

## 5. Planes desbloqueables (conexión con accesos)

El panel está sujeto al modelo de `NEWEN_ARQUITECTURA_ACCESOS_STANDARD.md`:

- **Entitlement `empresa`** → habilita el panel.
- **Entitlement `campus`** → habilita la pestaña/área Campus (la maqueta lo muestra como **"🔒 Requiere plan Campus"**).
- Las **áreas del sidebar y tabs se desbloquean según plan** del cliente. Un área bloqueada se muestra con badge de candado y CTA de upgrade, nunca oculta silenciosamente.
- El **selector de cliente** del topbar cambia el contexto: qué cliente se ve, qué fases/sistemas/tareas se gestionan (RLS: solo clientes de la org).

---

## 6. Instrucciones para Copilot / DeepSeek

```
Implementá el panel de administración interno descrito en
ESPACIO_EMPRESA_STANDARD.md (formalizado desde espacio-critico-maqueta.html).

Reglas no negociables:
1. Shell oscuro/dorado con TenantConfig admin (tokens var(--tenant-*)).
   Ningún color/fuente/radio hardcodeado en componentes del panel.
2. Estructura: top-admin-bar (badge + selector de cliente + acciones),
   aside (marca NEWEN OS + grupos de nav), main (cabecera de cliente +
   6 tabs + content-container).
3. Las 6 tabs: Visión General & KPIs, Sistemas (6 Fases), Informes &
   Diagnósticos, Agenda de Talleres & Counseling, Seguimiento & Tareas,
   Empleados — data-driven desde las tablas organization_* existentes.
4. Planes desbloqueables: sidebar/tabs según Entitlement (campus bloqueado
   = badge candado + CTA upgrade), sin romper RLS.
5. Integrar con la barra de contexto (NEWEN_ARQUITECTURA_ACCESOS §6) y
   el Hub; el panel convive con la página pública y el campus.
6. Antes de entregar código, generá la entrada para CHANGELOG.md y el
   archivo logs/FECHA-feature-vX.X.X.md como siempre.
```

---

*Fin del documento. Jerarquía: `ETHEREA_UI_STANDARD.md` (marca base) → `NEWEN_ARQUITECTURA_ACCESOS_STANDARD.md` (quién ve qué) → `ESPACIO_EMPRESA_STANDARD.md` (panel interno, este archivo) → `PLANTILLA_COMERCIAL_EMPRESA_STANDARD.md` (página pública).*
