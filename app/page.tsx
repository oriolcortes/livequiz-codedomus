import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { GLOBAL_LIMITS, ROLE_LIMITS } from "@/src/config/limits";

export default function HomePage() {
  return (
    <div className="grid gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
      <section>
        <div className="mb-6 flex flex-wrap gap-2">
          <Badge>Next.js + Supabase Realtime</Badge>
          <Badge>JSON local</Badge>
          <Badge>Sense guardar respostes</Badge>
        </div>
        <h1 className="max-w-3xl text-5xl font-black tracking-tight text-slate-950 md:text-6xl">
          Quizzes en directe per classe, amb cost controlat des del primer dia.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          LiveQuiz carrega preguntes des d'un fitxer JSON, usa Supabase Broadcast per al temps real i guarda només metadades mínimes de sales i quotes.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/dashboard"><Button>Crear sala</Button></Link>
          <Link href="/join"><Button variant="secondary">Entrar com alumne</Button></Link>
          <Link href="/quiz-builder"><Button variant="ghost">Crear JSON</Button></Link>
        </div>
      </section>

      <Card className="relative overflow-hidden p-8">
        <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-accent-400/20 blur-3xl" />
        <Image src="/livequiz-logo.png" alt="LiveQuiz" width={720} height={400} priority className="mx-auto h-auto w-full max-w-lg rounded-3xl" />
        <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
            <p className="text-slate-500">Free</p>
            <p className="text-2xl font-black text-slate-950">{ROLE_LIMITS.free.quizzesPerMonth}/mes</p>
          </div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
            <p className="text-slate-500">Global actives</p>
            <p className="text-2xl font-black text-slate-950">{GLOBAL_LIMITS.maxActiveRoomsPublic}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
