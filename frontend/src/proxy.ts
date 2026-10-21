import { NextResponse, type NextRequest } from "next/server";

// Chequeo optimista: si no hay cookie de sesión, ni siquiera se renderiza el dashboard.
// La validación real la hace Django en cada petición (401 si la sesión no es válida).
export function proxy(request: NextRequest) {
  if (!request.cookies.has("sessionid")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/dashboard/:path*",
};
