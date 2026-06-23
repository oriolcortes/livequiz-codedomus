import { redirect } from "next/navigation";
import { SignInButtons } from "@/components/auth/SignInButtons";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/src/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-md py-12">
      <Card>
        <p className="mb-2 text-sm font-semibold text-brand-600">Accés professor</p>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Inicia sessió</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          El login només és per professors. Els alumnes entren amb codi de sala i nickname.
        </p>
        <div className="mt-8">
          <SignInButtons />
        </div>
      </Card>
    </div>
  );
}
