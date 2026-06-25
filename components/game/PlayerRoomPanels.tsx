import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { PlayerQuestionPayload } from "@/src/lib/realtime/events";

export function PlayerJoinCard({
  code,
  nickname,
  message,
  channelReady,
  onNicknameChange,
  onJoin
}: {
  code: string;
  nickname: string;
  message: string;
  channelReady: boolean;
  onNicknameChange: (value: string) => void;
  onJoin: () => void;
}) {
  return (
    <div className="mx-auto max-w-md py-10">
      <Card>
        <p className="text-sm font-semibold text-brand-600">Sala {code}</p>
        <h1 className="mt-2 text-3xl font-black">Entra al quiz</h1>
        <p className="mt-2 text-sm text-slate-600">No cal login. Escriu un nickname curt.</p>
        <div className="mt-6 grid gap-3">
          <Input value={nickname} maxLength={24} placeholder="Nickname" onChange={(event) => onNicknameChange(event.target.value)} />
          <Button onClick={onJoin} disabled={!nickname.trim() || !channelReady}>
            {channelReady ? "Entrar" : "Connectant..."}
          </Button>
        </div>
        <p className="mt-4 text-sm text-slate-500">{message}</p>
      </Card>
    </div>
  );
}

export function PlayerHeaderCard({ code, nickname, score }: { code: string; nickname: string; score: number }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-600">{nickname}</p>
          <h1 className="text-3xl font-black">Sala {code}</h1>
        </div>
        <div className="rounded-2xl bg-brand-50 px-4 py-3 text-right">
          <p className="text-xs text-slate-500">Punts</p>
          <p className="text-2xl font-black text-brand-700">{score}</p>
        </div>
      </div>
    </Card>
  );
}

export function PlayerQuestionCard({
  question,
  selected,
  remainingSeconds,
  message,
  onAnswer
}: {
  question: PlayerQuestionPayload | null;
  selected: number | null;
  remainingSeconds: number;
  message: string;
  onAnswer: (optionIndex: number) => void;
}) {
  return (
    <Card>
      {question ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-brand-600">Pregunta {question.index + 1}</p>
            <p className={`rounded-2xl px-3 py-1 text-sm font-black ${remainingSeconds <= 5 ? "bg-red-50 text-red-700" : "bg-brand-50 text-brand-700"}`}>
              {remainingSeconds}s
            </p>
          </div>
          <h2 className="mt-3 text-3xl font-black tracking-tight">{question.text}</h2>
          <div className="mt-6 grid gap-3">
            {question.options.map((option, index) => (
              <Button key={`${question.id}-${option}`} variant={selected === index ? "primary" : "secondary"} disabled={selected !== null || remainingSeconds <= 0} onClick={() => onAnswer(index)} className="justify-start py-4 text-left">
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
  );
}
