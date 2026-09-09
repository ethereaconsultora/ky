import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La app corre como PWA instalable en la tablet del Counselor.
  // El service worker y el manifest se agregan en la Fase 3 (shell).
  // El repo `ky` vive dentro de `app ecosistema/`, que tiene su propio lockfile:
  // fijamos la raíz de tracing a este proyecto para evitar la ambigüedad.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
