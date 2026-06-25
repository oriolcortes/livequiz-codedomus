import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Quiz, QuizQuestion } from "@/src/lib/quiz/schema";

type ConnectedStudent = {
  studentId: string;
  nickname: string;
  score: number;
};

export function RoomSummaryCard({ code, status }: { code: string; status: string }) {
  return (
    <Card>
      <p className="text-sm font-semibold text-brand-600">Sala</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-5xl font-black tracking-[0.25em] text-slate-950">{code}</h1>
        <span className="rounded-full bg-accent-400/20 px-3 py-1 text-sm font-semibold text-teal-700">{status}</span>
      </div>
      <p className="mt-3 text-sm text-slate-600">Comparteix: <strong>/play/{code}</strong></p>
    </Card>
  );
}

export function QuizLoaderCard({
  quiz,
  onFileSelected
}: {
  quiz: Quiz | null;
  onFileSelected: (file: File) => void;
}) {
  return (
    <Card>
      <h2 className="text-xl font-black">Carrega el quiz JSON</h2>
      <p className="mt-2 text-sm text-slate-600">El fitxer queda al navegador del professor. No es puja a Supabase.</p>
      <input
        className="mt-4 block w-full rounded-2xl border border-dashed border-brand-200 bg-white p-4 text-sm"
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFileSelected(file);
        }}
      />
      {quiz ? <p className="mt-3 text-sm font-semibold text-slate-800">{quiz.title} · {quiz.questions.length} pregunta/es</p> : null}
    </Card>
  );
}

export function ConnectedStudentsCard({
  students,
  maxStudents
}: {
  students: ConnectedStudent[];
  maxStudents: number;
}) {
  return (
    <Card>
      <h2 className="text-xl font-black">Alumnes connectats</h2>
      <p className="mt-2 text-sm text-slate-600">{students.length}/{maxStudents}</p>
      <div className="mt-4 grid gap-2">
        {students.map((student) => (
          <div key={student.studentId} className="flex justify-between rounded-2xl bg-white p-3 text-sm ring-1 ring-slate-100">
            <span className="font-semibold">{student.nickname}</span>
            <span>{student.score} pts</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function HostControlCard({
  quiz,
  currentQuestion,
  currentQuestionIndex,
  remainingSeconds,
  pending,
  status,
  onEndQuiz,
  onCloseRoom,
  onStartQuestion
}: {
  quiz: Quiz | null;
  currentQuestion?: QuizQuestion;
  currentQuestionIndex: number;
  remainingSeconds: number;
  pending: boolean;
  status: "waiting" | "running" | "ended";
  onEndQuiz: () => void;
  onCloseRoom: () => void;
  onStartQuestion: (index: number) => void;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Control de partida</h2>
          <p className="text-sm text-slate-600">Passa pregunta manualment per mantenir control a l'aula.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onEndQuiz} disabled={pending || status === "ended"}>Finalitzar partida</Button>
          <Button variant="danger" onClick={onCloseRoom} disabled={pending}>Tancar sala</Button>
        </div>
      </div>

      {currentQuestion ? (
        <div className="mt-6 rounded-3xl bg-brand-950 p-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-brand-100">Pregunta {currentQuestionIndex + 1}</p>
            <p className={`rounded-2xl px-3 py-1 text-sm font-black ${remainingSeconds <= 5 ? "bg-red-500 text-white" : "bg-white/10 text-white"}`}>
              {remainingSeconds}s
            </p>
          </div>
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
        <Button disabled={status === "ended" || !quiz || currentQuestionIndex + 1 >= (quiz?.questions.length ?? 0)} onClick={() => onStartQuestion(currentQuestionIndex + 1)}>
          {currentQuestionIndex < 0 ? "Iniciar primera pregunta" : "Següent pregunta"}
        </Button>
        <Button variant="secondary" disabled={status === "ended" || !quiz || currentQuestionIndex < 0} onClick={() => onStartQuestion(currentQuestionIndex)}>
          Repetir pregunta
        </Button>
      </div>
    </Card>
  );
}

export function HostLogCard({ log }: { log: string[] }) {
  if (!log.length) return null;

  return (
    <Card>
      <h2 className="text-xl font-black">Log</h2>
      <ul className="mt-3 grid gap-1 text-sm text-slate-600">
        {log.slice(0, 5).map((item) => <li key={item}>{item}</li>)}
      </ul>
    </Card>
  );
}
