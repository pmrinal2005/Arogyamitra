import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Run on app routes but skip static assets and the public landing page.
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/onboarding/:path*",
  ],
};
