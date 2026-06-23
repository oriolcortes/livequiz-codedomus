"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/src/lib/supabase/browser";

export function SignInButtons() {
  const [loadingProvider, setLoadingProvider] = useState<"google" | "azure" | null>(null);

  async function signIn(provider: "google" | "azure") {
    setLoadingProvider(provider);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        queryParams: provider === "google" ? { access_type: "offline", prompt: "consent" } : undefined
      }
    });

    if (error) {
      setLoadingProvider(null);
      alert(error.message);
    }
  }

  return (
    <div className="grid gap-3">
      <Button onClick={() => signIn("google")} disabled={loadingProvider !== null} className="w-full">
        {loadingProvider === "google" ? "Obrint Google..." : "Entrar amb Google"}
      </Button>
      <Button onClick={() => signIn("azure")} disabled={loadingProvider !== null} variant="secondary" className="w-full">
        {loadingProvider === "azure" ? "Obrint Microsoft..." : "Entrar amb Microsoft / Outlook"}
      </Button>
    </div>
  );
}
