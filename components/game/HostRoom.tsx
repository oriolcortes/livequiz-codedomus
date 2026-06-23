"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { parseQuiz, toPlayerQuestion, type Quiz } from "@/src/lib/quiz/schema";
import { realtimeEvents, type AnswerSubmittedPayload, type RankingEntry, type StudentJoinedPayload } from "@/src/lib/realtime/events";
import { createClient } from "@/src/lib/supabase/browser";
import { endRoomAction } from "@/src/actions/rooms";
import type { Room } from "@/src/lib/supabase/types";

type StudentState = {
  studentId: string;
  nickname: string;
  score: number;
  answers: number;
  answeredCurrentQuestion?: number;
};

export function HostRoom({ room }: { room: Room }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [students, setStudents] = useState<Record<string, StudentState>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(-1);
  const [status, setStatus] = useState<"waiting" | "running" | "ended">("waiting");
  const [log, setLog] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const questionStartedAtRef = useRef<number>(0);

  const ranking = useMemo<RankingEntry[]>(() => {
    return Object.values(students)
      .map(({ studentId, nickname, score, answers }) => ({ studentId, nickname, score, answers }))
      .sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname));
  }, [students]);

  useEffect(() => {
    const channel = supabase.channel(`room:${room.code}`, {
      config: {
        broadcast: { self: false, ack: true },
        presence: { key: `host:${room.host_id}` }
      }
    });

    channel
      .on("broadcast", { event: realtimeEvents.studentJoin }, ({ payload }) => {
        const joined = payload as StudentJoinedPayload;
        setStudents((current) => {
          if (Object.keys(current).length >= room.max_students && !current[joined.studentId]) {
            void channel.send({
              type: "broadcast",
              event: realtimeEvents.studentRejected,
              payload: { studentId: joined.studentId, reason: "Sala plena" }
            });
            return current;
          }

          return {
            ...current,
            [joined.studentId]: current[joined.studentId] ?? {
              studentId: joined.studentId,
              nickname: joined.nickname,
              score: 0,
              answers: 0
            }
          };
        });
      })
      .on("broadcast", { event: realtimeEvents.roomStateRequested }, ({ payload }) => {
        const targetStudentId = (payload as { studentId?: string }).studentId;
        const currentQuestion = quiz?.questions[currentQuestionIndex];
        const playerQuestion = currentQuestion
          ? { ...toPlayerQuestion(currentQuestion, currentQuestionIndex), startedAt: questionStartedAtRef.current }
          : undefined;

        void channel.send({
          type: "broadcast",
          event: realtimeEvents.roomState,
          payload: {
            targetStudentId,
            status,
            title: quiz?.title,
            question: playerQuestion,
            ranking
          }
        });
      })
      .on("broadcast", { event: realtimeEvents.answerSubmitted }, ({ payload }) => {
        const answer = payload as AnswerSubmittedPayload;
        const currentQuestion = quiz?.questions[answer.questionIndex];

        if (!currentQuestion || answer.questionIndex !== currentQuestionIndex) return;

        setStudents((current) => {
          const student = current[answer.studentId];
          if (!student || student.answeredCurrentQuestion === answer.questionIndex) return current;

          const correct = currentQuestion.correct === answer.optionIndex;
          const elapsed = Math.max(0, Date.now() - questionStartedAtRef.current);
          const maxMs = currentQuestion.time * 1000;
          const speedBonus = Math.max(0, Math.round(800 * (1 - elapsed / maxMs)));
          const points = correct ? 200 + speedBonus : 0;

          void channel.send({
            type: "broadcast",
            event: realtimeEvents.answerResult,
            payload: {
              studentId: answer.studentId,
              questionIndex: answer.questionIndex,
              correct,
              points,
              correctOptionIndex: currentQuestion.correct
            }
          });

          return {
            ...current,
            [answer.studentId]: {
              ...student,
              score: student.score + points,
              answers: student.answers + 1,
              answeredCurrentQuestion: answer.questionIndex
            }
          };
        });
      })
      .subscribe(async (subscriptionStatus) => {
        if (subscriptionStatus === "SUBSCRIBED") {
          await channel.track({ role: "host", code: room.code, at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [currentQuestionIndex, quiz, ranking, room.code, room.host_id, room.max_students, status, supabase]);

  useEffect(() => {
    if (!channelRef.current) return;
    void channelRef.current.send({ type: "broadcast", event: realtimeEvents.rankingUpdated, payload: { entries: ranking } });
  }, [ranking]);

  async function loadQuizFile(file: File) {
    const text = await file.text();
    try {
      const parsed = JSON.parse(text) as unknown;
      const result = parseQuiz(parsed);
      if (!result.success) {
        setLog((current) => [`JSON invàlid: ${result.error.issues[0]?.message ?? "format incorrecte"}`, ...current]);
        return;
      }
      if (result.data.questions.length > room.max_questions) {
        setLog((current) => [`Aquest rol permet màxim ${room.max_questions} preguntes per quiz.`, ...current]);
        return;
      }
      setQuiz(result.data);
      localStorage.setItem(`livequiz:host:${room.code}:quiz`, JSON.stringify(result.data));
      setLog((current) => [`Quiz carregat: ${result.data.title}`, ...current]);
    } catch {
      setLog((current) => ["No s'ha pogut llegir el JSON.", ...current]);
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem(`livequiz:host:${room.code}:quiz`);
    if (!saved) return;
    const result = parseQuiz(JSON.parse(saved) as unknown);
    if (result.success) setQuiz(result.data);
  }, [room.code]);

  function startQuestion(index: number) {
    if (!quiz || !channelRef.current) return;
    const question = quiz.questions[index];
    if (!question) return;

    const startedAt = Date.now();
    questionStartedAtRef.current = startedAt;
    setCurrentQuestionIndex(index);
    setStatus("running");
    setStudents((current) => {
      const next = { ...current };
      for (const key of Object.keys(next)) {
        next[key] = { ...next[key], answeredCurrentQuestion: undefined };
      }
      return next;
    });

    void channelRef.current.send({
      type: "broadcast",
      event: realtimeEvents.questionStarted,
      payload: { ...toPlayerQuestion(question, index), startedAt }
    });
  }

  function endQuiz() {
    setStatus("ended");
    channelRef.current?.send({ type: "broadcast", event: realtimeEvents.quizEnded, payload: { entries: ranking } });
    startTransition(async () => {
      await endRoomAction(room.code);
      localStorage.removeItem(`livequiz:host:${room.code}:quiz`);
      router.refresh();
    });
  }

  const currentQuestion = quiz?.questions[currentQuestionIndex];

  return (
    <div className="grid gap-6 py-8 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="grid gap-6">
        <Card>
          <p className="text-sm font-semibold text-brand-600">Sala</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-5xl font-black tracking-[0.25em] text-slate-950">{room.code}</h1>
            <span className="rounded-full bg-accent-400/20 px-3 py-1 text-sm font-semibold text-teal-700">{status}</span>
          </div>
          <p className="mt-3 text-sm text-slate-600">Comparteix: <strong>/play/{room.code}</strong></p>
        </Card>

        <Card>
          <h2 className="text-xl font-black">Carrega el quiz JSON</h2>
          <p className="mt-2 text-sm text-slate-600">El fitxer queda al navegador del professor. No es puja a Supabase.</p>
          <input
            className="mt-4 block w-full rounded-2xl border border-dashed border-brand-200 bg-white p-4 text-sm"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void loadQuizFile(file);
            }}
          />
          {quiz ? <p className="mt-3 text-sm font-semibold text-slate-800">{quiz.title} · {quiz.questions.length} pregunta/es</p> : null}
        </Card>

        <Card>
          <h2 className="text-xl font-black">Alumnes connectats</h2>
          <p className="mt-2 text-sm text-slate-600">{Object.keys(students).length}/{room.max_students}</p>
          <div className="mt-4 grid gap-2">
            {Object.values(students).map((student) => (
              <div key={student.studentId} className="flex justify-between rounded-2xl bg-white p-3 text-sm ring-1 ring-slate-100">
                <span className="font-semibold">{student.nickname}</span>
                <span>{student.score} pts</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Control de partida</h2>
              <p className="text-sm text-slate-600">Passa pregunta manualment per mantenir control a l'aula.</p>
            </div>
            <Button variant="danger" onClick={endQuiz} disabled={pending || status === "ended"}>Finalitzar</Button>
          </div>

          {currentQuestion ? (
            <div className="mt-6 rounded-3xl bg-brand-950 p-6 text-white">
              <p className="text-sm text-brand-100">Pregunta {currentQuestionIndex + 1}</p>
              <h3 className="mt-2 text-3xl font-black">{currentQuestion.text}</h3>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {currentQuestion.options.map((option, index) => (
                  <div key={option} className={`rounded-2xl p-4 font-semibold ${index === currentQuestion.correct ? "bg-accent-500" : "bg-white/10"}`}>
                    {String.fromCharCode(65 + index)}. {option}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-3xl bg-slate-50 p-6 text-slate-600">Carrega un JSON i inicia la primera pregunta.</div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button disabled={!quiz || currentQuestionIndex + 1 >= (quiz?.questions.length ?? 0)} onClick={() => startQuestion(currentQuestionIndex + 1)}>
              {currentQuestionIndex < 0 ? "Iniciar primera pregunta" : "Següent pregunta"}
            </Button>
            <Button variant="secondary" disabled={!quiz || currentQuestionIndex < 0} onClick={() => startQuestion(currentQuestionIndex)}>
              Repetir pregunta
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-black">Rànquing</h2>
          <div className="mt-4 grid gap-2">
            {ranking.map((entry, index) => (
              <div key={entry.studentId} className="flex items-center justify-between rounded-2xl bg-white p-3 ring-1 ring-slate-100">
                <span className="font-semibold">#{index + 1} {entry.nickname}</span>
                <span className="font-black text-brand-600">{entry.score}</span>
              </div>
            ))}
          </div>
        </Card>

        {log.length ? (
          <Card>
            <h2 className="text-xl font-black">Log</h2>
            <ul className="mt-3 grid gap-1 text-sm text-slate-600">
              {log.slice(0, 5).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
