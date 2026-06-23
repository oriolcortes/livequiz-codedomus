"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/src/lib/supabase/env";
import type { Database } from "@/src/lib/supabase/types";

export function createClient() {
  const { url, key } = getSupabaseEnv();
  return createBrowserClient<Database>(url, key);
}
