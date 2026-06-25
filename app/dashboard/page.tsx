import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CreateRoomButton } from "@/components/dashboard/CreateRoomButton";
import { createClient } from "@/src/lib/supabase/server";
import { GLOBAL_LIMITS, getRoleLimits } from "@/src/config/limits";

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) redirect("/login");

  const [{ data: profile }, { data: activeRooms }, { count: quizzesToday }, { count: quizzesThisMonth }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userData.user.id).maybeSingle(),
    supabase
      .from("rooms")
      .select("*")
      .eq("host_id", userData.user.id)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
    supabase
      .from("rooms")
      .select("id", { count: "exact", head: true })
      .eq("host_id", userData.user.id)
      .gte("created_at", startOfToday()),
    supabase
      .from("rooms")
      .select("id", { count: "exact", head: true })
      .eq("host_id", userData.user.id)
      .gte("created_at", startOfMonth())
  ]);

  const role = profile?.role ?? "free";
  const limits = getRoleLimits(role);
  const activeRoomCount = activeRooms?.length ?? 0;
  const dailyQuizCount = quizzesToday ?? 0;
  const monthlyQuizCount = quizzesThisMonth ?? 0;

  return (
    <div className="grid gap-6 py-8">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Badge>Rol: {role}</Badge>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">Dashboard professor</h1>
          <p className="mt-2 max-w-2xl text-slate-600">Crea una sala, carrega el JSON localment i comparteix el codi amb els alumnes.</p>
        </div>
        <CreateRoomButton />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Quizzes/dia</p>
          <p className="mt-2 text-3xl font-black">{dailyQuizCount}/{limits.quizzesPerDay}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Et queden {Math.max(0, limits.quizzesPerDay - dailyQuizCount)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Quizzes/mes</p>
          <p className="mt-2 text-3xl font-black">{monthlyQuizCount}/{limits.quizzesPerMonth}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Et queden {Math.max(0, limits.quizzesPerMonth - monthlyQuizCount)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Sales actives</p>
          <p className="mt-2 text-3xl font-black">{activeRoomCount}/{limits.maxActiveRooms}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{limits.maxStudentsPerRoom} alumnes/sala</p>
        </Card>
      </section>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Sales actives</h2>
            <p className="text-sm text-slate-500">Límit global públic: {GLOBAL_LIMITS.maxActiveRoomsPublic} sales simultànies.</p>
          </div>
          <Link href="/quiz-builder" className="text-sm font-semibold text-brand-600 hover:text-brand-700">Crear JSON</Link>
        </div>

        {activeRooms?.length ? (
          <div className="grid gap-3">
            {activeRooms.map((room) => (
              <Link key={room.id} href={`/host/${room.code}`} className="focus-ring flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 hover:border-brand-200">
                <div>
                  <p className="text-lg font-black tracking-[0.25em] text-slate-950">{room.code}</p>
                  <p className="text-sm text-slate-500">Caduca: {new Date(room.expires_at).toLocaleString("ca-ES")}</p>
                </div>
                <span className="text-sm font-semibold text-brand-600">Obrir</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">Encara no tens sales actives.</p>
        )}
      </Card>
    </div>
  );
}
