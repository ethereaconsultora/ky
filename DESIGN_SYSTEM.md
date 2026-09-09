# DESIGN SYSTEM — KY

> Basado en **Etherea Design System v1.0** (`ARCH BASE ORIGINALES/ETHEREA_DESIGN_SYSTEM.md`),
> adaptado a la identidad de Espacio Crítico: **institucional, arquitectónica, fría**.
> Slogan: "Habitar la tensión."

---

## Identidad EC

- Estética institucional/arquitectónica — NO cálida, NO clínica. Densidad media-alta (el usuario
  es un profesional trabajando, no un consumidor).
- Paleta tomada de `espacio-critico-maqueta.html` y de los bocetos del método.
- Tipografía: serif editorial (Cormorant Garamond / Georgia) en títulos y citas; sans (DM Sans)
  en UI y cuerpo.
- Target primario: **tablet en horizontal** (la usa el Counselor durante la entrevista).
  Funcionar también en desktop. No es una app mobile-first de una columna.

---

## Tokens

```css
:root {
  /* Grises / superficies (de más oscuro a más claro) */
  --g0:#0a0806; --g1:#100e0a; --g2:#1a1710; --g3:#231f18; --g4:#2e2820; --g5:#3e3528;

  /* Texto */
  --t0:#f2ede4;  /* primario */
  --t1:#b8ae9c;  /* secundario */
  --t2:#7a7060;  /* muted / labels */

  /* Acento (la firma) */
  --ac:#c4a87e; --ac2:#9e8860; --sand:#d6c09a;

  /* Estados */
  --ok:#8fae86;     /* confirmado / éxito */
  --warn:#c48e6a;   /* en observación / atención */
  --err:#c0625a;    /* error / alerta de seguridad */

  /* Bordes y radios */
  --border: rgba(196,168,126,0.12);
  --border-strong: rgba(196,168,126,0.28);
  --radius-sm:4px; --radius-md:8px; --radius-lg:14px; --radius-xl:18px;

  /* Espaciado */
  --gap-xs:4px; --gap-sm:8px; --gap-md:12px; --gap-lg:16px; --gap-xl:24px; --gap-2xl:32px;

  /* Tipografía */
  --font-body:'DM Sans', system-ui, sans-serif;
  --font-display:'Cormorant Garamond', Georgia, serif;
}
```

Fondo base de la app: `--g0`. Paneles: `--g1` / `--g2`. Cards: `--g2` con `--border`.

---

## Componentes base (a construir en la Fase 3)

| Componente | Variantes |
|---|---|
| `Button` | `primary` (fondo `--ac`, texto `--g0`, uppercase, letter-spacing) · `secondary` (borde `--ac2`, texto `--ac`, fondo transparente) · `ghost` (borde `--g5`, texto `--t1`) · `danger` (borde/texto `--err`) |
| `Field` | label uppercase `--t2` + input fondo `--g2` borde `--g4`, focus `--ac2` |
| `Card` | base · `accent-left` (borde izquierdo 2px de estado) para chips de fenómeno |
| `FenChip` | estado: `confirmado` (borde-izq `--ok`) · `observacion` (borde-izq `--warn`, opacidad 0.75) · `sin-evidencia` (opacidad 0.4) — con intensidad y confianza como barras |
| `PillRow` | sugerencias de próxima pregunta (pills clickeables) |
| `MetricBar` | `intensidad` (fill `--ac`) · `confianza` (fill `--ok`) |
| `LayerBlock` | "Lo que sabemos / estimamos / proyectamos" — la de "proyectamos" con borde **dashed** y nota "sin validar" |
| `Toast` | success / error / warning — top |
| `Stepper` | Inicio · Conversación · Resultado · Intervención |

Citas del entrevistado / preguntas: `--font-display` en *itálica*, `--t0`.

---

## Reglas que no se rompen (heredadas de Etherea + propias de EC)

1. El acento dorado (`--ac`) es la firma — no reemplazar por otro color.
2. Labels de campo en MAYÚSCULAS con letter-spacing.
3. Serif sólo en títulos, citas y preguntas — cuerpo y UI siempre en sans.
4. Un solo botón primario por pantalla.
5. Sin librerías de gráficos — barras y grafos del Mapa EC con SVG y divs puros.
6. La cifra de "reducción / ROI" SIEMPRE se muestra como **rango**, en un bloque marcado
   visualmente como proyección (borde dashed + nota). Nunca como número categórico.
7. Intensidad y confianza se muestran en B (nunca en A).
8. Nada de rojo para acciones normales — `--err` sólo para error real o alerta de seguridad.

---

## Mapa EC — las 4 visualizaciones de caso (a diseñar en la Fase 7)

| Caso | Representación |
|---|---|
| 1 — Dominante | un nodo destacado + fenómenos secundarios atenuados |
| 2 — Co-dominante (A ⊥ B) | dos nodos del mismo peso, conector `⊥`, sin flecha |
| 3 — Circuito hipotético (A ↔ B) | dos nodos, flecha doble punteada, badge "hipótesis" + punto de accesibilidad |
| 4 — Circuito confirmado (A ⇄ B) | dos nodos, flecha doble sólida + punto de accesibilidad marcado |
