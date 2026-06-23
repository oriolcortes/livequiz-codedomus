"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function JoinPage() {
  const [code, setCode] = useState("");
  const router = useRouter();

  function join() {
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode) router.push(`/play/${cleanCode}`);
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <Card>
        <p className="text-sm font-semibold text-brand-600">Alumne</p>
        <h1 className="mt-2 text-3xl font-black">Entrar a una sala</h1>
        <div className="mt-6 grid gap-3">
          <Input value={code} placeholder="Codi de sala" onChange={(event) => setCode(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") join(); }} />
          <Button onClick={join}>Entrar</Button>
        </div>
      </Card>
    </div>
  );
}
