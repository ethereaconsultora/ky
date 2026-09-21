import { NextResponse, type NextRequest } from "next/server";
import { esUsuarioActivo } from "@/lib/auth/activo";
import { actualizarSesion } from "@/lib/supabase/middleware";

/**
 * - Refresca la sesion de Supabase en cada navegacion.
 * - Rutas de pagina sin sesion -> /login.
 * - Con sesion pero SIN la marca de cuenta habilitada (`app_metadata.ky_activo`) -> /cuenta-pendiente.
 * - /api/*: no redirige (cada Route Handler responde 401/403 JSON por su cuenta).
 */
const PREFIJOS_PUBLICOS = ["/login", "/registro", "/recuperar", "/reset-password", "/auth"];
const SOLO_SIN_SESION = ["/login", "/registro"];

const coincide = (pathname: string, prefijos: string[]) =>
  prefijos.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export async function middleware(request: NextRequest) {
  const { response, user } = await actualizarSesion(request);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api")) return response;

  const esPublica = coincide(pathname, PREFIJOS_PUBLICOS);
  const ir = (destino: string, conNext = false) => {
    const url = request.nextUrl.clone();
    url.pathname = destino;
    url.search = "";
    if (conNext) url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  };

  if (!user) return esPublica ? response : ir("/login", true);

  const activo = esUsuarioActivo(user);

  // con sesion no tiene sentido ver ingresar / crear cuenta
  if (coincide(pathname, SOLO_SIN_SESION)) return ir(activo ? "/" : "/cuenta-pendiente");

  if (!activo && !esPublica && pathname !== "/cuenta-pendiente") return ir("/cuenta-pendiente");
  if (activo && pathname === "/cuenta-pendiente") return ir("/");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
