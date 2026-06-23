import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/src/lib/supabase/env";
import type { Database } from "@/src/lib/supabase/types";

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

function redirectWithoutCache(path: string, origin: string) {
  const response = NextResponse.redirect(new URL(path, origin));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = getSafeNextPath(url.searchParams.get("next"));

  if (!code) {
    return redirectWithoutCache("/login?error=missing_code", url.origin);
  }

  const response = redirectWithoutCache(next, url.origin);
  const { url: supabaseUrl, key } = getSupabaseEnv();
  const supabase = createServerClient<Database>(supabaseUrl, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      }
    }
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirectWithoutCache(`/login?error=${encodeURIComponent(error.message)}`, url.origin);
  }

  return response;
}
