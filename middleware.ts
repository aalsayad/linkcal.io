import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "./utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Process the session update for all other paths
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Apply middleware to all paths except:
     * - _next/static, _next/image (Next.js assets)
     * - favicon.ico
     * - Next Auth endpoints (like /api/auth)
     * - /login page
     * - Image files (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/auth|login|api/webhooks/calendar|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
