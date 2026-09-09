import { NextResponse, type NextRequest } from "next/server";
import { actualizarSesion } from "@/lib/supabase/middleware";

/**
 * - Refresca la sesion de Supabase en cada navegacion.
 * - Rutas de pagina sin sesion -> /login.
 * - /api/*: no redirige (cada Route Handler responde 401 JSON por su cuenta).
 */
const PREFIJOS_PUBLICOS = ["/login", "/auth"];

export async function middleware(request: NextRequest) {
  const { response, user } = await actualizarSesion(request);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api")) return response;

  const esPublica = PREFIJOS_PUBLICOS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!user && !esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
