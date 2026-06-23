"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { downloadJson } from "@/src/lib/quiz/download";
import { parseQuiz, sampleQuiz, type Quiz } from "@/src/lib/quiz/schema";

function emptyQuiz(): Quiz {
  return {
    title: "Nou LiveQuiz",
    questions: [
      {
        id: "q1",
        text: "Escriu aquí la pregunta",
        options: ["Opció A", "Opció B", "Opció C", "Opció D"],
        correct: 0,
        time: 20
      }
    ]
  };
}

export function QuizBuilder() {
  const [quiz, setQuiz] = useState<Quiz>(() => emptyQuiz());
  const [selectedQuestion, setSelectedQuestion] = useState(0);
  const validation = useMemo(() => parseQuiz(quiz), [quiz]);
  const question = quiz.questions[selectedQuestion];

  function updateQuestion(index: number, nextQuestion: Quiz["questions"][number]) {
    setQuiz((current) => ({
      ...current,
      questions: current.questions.map((item, itemIndex) => (itemIndex === index ? nextQuestion : item))
    }));
  }

  function addQuestion() {
    setQuiz((current) => ({
      ...current,
      questions: [
        ...current.questions,
        {
          id: crypto.randomUUID(),
          text: "Nova pregunta",
          options: ["Opció A", "Opció B", "Opció C", "Opció D"],
          correct: 0,
          time: 20
        }
      ]
    }));
    setSelectedQuestion(quiz.questions.length);
  }

  function removeQuestion(index: number) {
    setQuiz((current) => {
      if (current.questions.length <= 1) return current;
      return { ...current, questions: current.questions.filter((_, itemIndex) => itemIndex !== index) };
    });
    setSelectedQuestion((current) => Math.max(0, current - 1));
  }

  async function importJson(file: File) {
    const parsed = JSON.parse(await file.text()) as unknown;
    const result = parseQuiz(parsed);
    if (!result.success) {
      alert(result.error.issues[0]?.message ?? "JSON invàlid");
      return;
    }
    setQuiz(result.data);
    setSelectedQuestion(0);
  }

  return (
    <div className="grid gap-6 py-8 lg:grid-cols-[320px_1fr]">
      <Card>
        <h1 className="text-2xl font-black">Editor JSON</h1>
        <p className="mt-2 text-sm text-slate-600">Crea el quiz visualment i descarrega'l com a fitxer JSON.</p>

        <div className="mt-6 grid gap-3">
          <Button onClick={addQuestion}>Afegir pregunta</Button>
          <Button variant="secondary" onClick={() => setQuiz(sampleQuiz)}>Carregar exemple</Button>
          <Button variant="ghost" onClick={() => setQuiz(emptyQuiz())}>Nou quiz</Button>
          <label className="focus-ring cursor-pointer rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
            Importar JSON
            <input type="file" accept="application/json,.json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importJson(file); }} />
          </label>
          <Button disabled={!validation.success} onClick={() => downloadJson(quiz.title.toLowerCase().replaceAll(" ", "-"), quiz)}>
            Exportar JSON
          </Button>
        </div>

        <div className="mt-6 grid gap-2">
          {quiz.questions.map((item, index) => (
            <button
              key={item.id ?? index}
              className={`focus-ring rounded-2xl p-3 text-left text-sm ring-1 ${selectedQuestion === index ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-700 ring-slate-100"}`}
              onClick={() => setSelectedQuestion(index)}
            >
              <span className="font-black">{index + 1}.</span> {item.text}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Títol del quiz
          <Input value={quiz.title} onChange={(event) => setQuiz((current) => ({ ...current, title: event.target.value }))} />
        </label>

        {question ? (
          <div className="mt-8 grid gap-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Pregunta {selectedQuestion + 1}</h2>
              <Button variant="danger" onClick={() => removeQuestion(selectedQuestion)} disabled={quiz.questions.length <= 1}>Eliminar</Button>
            </div>

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Enunciat
              <Input value={question.text} onChange={(event) => updateQuestion(selectedQuestion, { ...question, text: event.target.value })} />
            </label>

            <div className="grid gap-3">
              {question.options.map((option, index) => (
                <label key={index} className="grid gap-2 text-sm font-semibold text-slate-700">
                  Opció {String.fromCharCode(65 + index)}
                  <div className="flex gap-2">
                    <Input value={option} onChange={(event) => {
                      const nextOptions = [...question.options];
                      nextOptions[index] = event.target.value;
                      updateQuestion(selectedQuestion, { ...question, options: nextOptions });
                    }} />
                    <Button variant={question.correct === index ? "primary" : "secondary"} onClick={() => updateQuestion(selectedQuestion, { ...question, correct: index })}>
                      Correcta
                    </Button>
                  </div>
                </label>
              ))}
            </div>

            <label className="grid max-w-xs gap-2 text-sm font-semibold text-slate-700">
              Temps en segons
              <Input type="number" min={5} max={120} value={question.time} onChange={(event) => updateQuestion(selectedQuestion, { ...question, time: Number(event.target.value) })} />
            </label>
          </div>
        ) : null}

        <div className="mt-8 rounded-3xl bg-slate-950 p-5 text-sm text-slate-100">
          <p className="mb-3 font-black text-accent-400">Vista JSON</p>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words">{JSON.stringify(quiz, null, 2)}</pre>
        </div>

        {!validation.success ? (
          <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            {validation.error.issues[0]?.message ?? "JSON invàlid"}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
