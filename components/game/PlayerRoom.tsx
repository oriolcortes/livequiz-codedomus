"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/src/lib/supabase/browser";
import { realtimeEvents, type AnswerResultPayload, type PlayerQuestionPayload, type RankingEntry, type RoomStatePayload } from "@/src/lib/realtime/events";
import type { Room } from "@/src/lib/supabase/types";

function createStudentId() {
  const existing = sessionStorage.getItem("livequiz:studentId");
  if (existing) return existing;
  const id = crypto.randomUUID();
  sessionStorage.setItem("livequiz:studentId", id);
  return id;
}

export function PlayerRoom({ room }: { room: Pick<Room, "code" | "max_students" | "expires_at"> }) {
  const supabase = useMemo(() => createClient(), []);
  const [studentId, setStudentId] = useState<string>("");
  const [nickname, setNickname] = useState("");
  const [joined, setJoined] = useState(false);
  const [question, setQuestion] = useState<PlayerQuestionPayload | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("Espera que el professor iniciï la partida.");
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    setStudentId(createStudentId());
    setNickname(sessionStorage.getItem(`livequiz:${room.code}:nickname`) ?? "");
  }, [room.code]);

  useEffect(() => {
    if (!studentId) return;

    const channel = supabase.channel(`room:${room.code}`, {
      config: {
        broadcast: { self: false, ack: true },
        presence: { key: `student:${studentId}` }
      }
    });

    channel
      .on("broadcast", { event: realtimeEvents.studentRejected }, ({ payload }) => {
        const data = payload as { studentId: string; reason: string };
        if (data.studentId === studentId) {
          setJoined(false);
          setMessage(data.reason);
        }
      })
      .on("broadcast", { event: realtimeEvents.questionStarted }, ({ payload }) => {
        setQuestion(payload as PlayerQuestionPayload);
        setSelected(null);
        setMessage("Respon abans que acabi el temps.");
      })
      .on("broadcast", { event: realtimeEvents.answerResult }, ({ payload }) => {
        const data = payload as AnswerResultPayload;
        if (data.studentId !== studentId) return;
        setScore((current) => current + data.points);
        setMessage(data.correct ? `Correcte! +${data.points} punts` : "Incorrecte");
      })
      .on("broadcast", { event: realtimeEvents.rankingUpdated }, ({ payload }) => {
        setRanking((payload as { entries: RankingEntry[] }).entries ?? []);
      })
      .on("broadcast", { event: realtimeEvents.roomState }, ({ payload }) => {
        const data = payload as RoomStatePayload & { targetStudentId?: string };
        if (data.targetStudentId && data.targetStudentId !== studentId) return;
        if (data.question) setQuestion(data.question);
        if (data.ranking) setRanking(data.ranking);
        if (data.status === "ended") setMessage("Partida finalitzada.");
      })
      .on("broadcast", { event: realtimeEvents.quizEnded }, ({ payload }) => {
        setRanking((payload as { entries: RankingEntry[] }).entries ?? []);
        setQuestion(null);
        setMessage("Partida finalitzada.");
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ role: "student", studentId, at: new Date().toISOString() });
          await channel.send({ type: "broadcast", event: realtimeEvents.roomStateRequested, payload: { studentId } });
        }
      });

    channelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [room.code, studentId, supabase]);

  async function joinRoom() {
    const cleanNickname = nickname.trim().slice(0, 24);
    if (!cleanNickname || !channelRef.current) return;

    sessionStorage.setItem(`livequiz:${room.code}:nickname`, cleanNickname);
    setJoined(true);
    setMessage("Connectat. Espera la pregunta.");

    await channelRef.current.send({
      type: "broadcast",
      event: realtimeEvents.studentJoin,
      payload: { studentId, nickname: cleanNickname }
    });
  }

  async function answer(optionIndex: number) {
    if (!question || !channelRef.current || selected !== null) return;
    setSelected(optionIndex);
    setMessage("Resposta enviada.");

    await channelRef.current.send({
      type: "broadcast",
      event: realtimeEvents.answerSubmitted,
      payload: {
        studentId,
        nickname,
        questionIndex: question.index,
        optionIndex,
        sentAt: Date.now()
      }
    });
  }

  if (!joined) {
    return (
      <div className="mx-auto max-w-md py-10">
        <Card>
          <p className="text-sm font-semibold text-brand-600">Sala {room.code}</p>
          <h1 className="mt-2 text-3xl font-black">Entra al quiz</h1>
          <p className="mt-2 text-sm text-slate-600">No cal login. Escriu un nickname curt.</p>
          <div className="mt-6 grid gap-3">
            <Input value={nickname} maxLength={24} placeholder="Nickname" onChange={(event) => setNickname(event.target.value)} />
            <Button onClick={joinRoom} disabled={!nickname.trim()}>Entrar</Button>
          </div>
          <p className="mt-4 text-sm text-slate-500">{message}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-6 py-8">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-brand-600">{nickname}</p>
            <h1 className="text-3xl font-black">Sala {room.code}</h1>
          </div>
          <div className="rounded-2xl bg-brand-50 px-4 py-3 text-right">
            <p className="text-xs text-slate-500">Punts</p>
            <p className="text-2xl font-black text-brand-700">{score}</p>
          </div>
        </div>
      </Card>

      <Card>
        {question ? (
          <>
            <p className="text-sm font-semibold text-brand-600">Pregunta {question.index + 1} · {question.time}s</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">{question.text}</h2>
            <div className="mt-6 grid gap-3">
              {question.options.map((option, index) => (
                <Button key={`${question.id}-${option}`} variant={selected === index ? "primary" : "secondary"} disabled={selected !== null} onClick={() => answer(index)} className="justify-start py-4 text-left">
                  {String.fromCharCode(65 + index)}. {option}
                </Button>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-3xl bg-slate-50 p-8 text-center text-slate-600">{message}</div>
        )}
        <p className="mt-4 text-sm font-semibold text-slate-600">{message}</p>
      </Card>

      <Card>
        <h2 className="text-xl font-black">Rànquing</h2>
        <div className="mt-4 grid gap-2">
          {ranking.slice(0, 8).map((entry, index) => (
            <div key={entry.studentId} className="flex justify-between rounded-2xl bg-white p-3 ring-1 ring-slate-100">
              <span className="font-semibold">#{index + 1} {entry.nickname}</span>
              <span className="font-black text-brand-600">{entry.score}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
