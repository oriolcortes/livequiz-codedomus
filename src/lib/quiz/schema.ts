import * as z from "zod";

export const quizQuestionSchema = z.object({
  id: z.string().min(1).optional(),
  text: z.string().min(3, "La pregunta ha de tenir com a mínim 3 caràcters."),
  options: z.array(z.string().min(1)).min(2).max(6),
  correct: z.number().int().min(0),
  time: z.number().int().min(5).max(120).default(20)
}).refine((question) => question.correct < question.options.length, {
  message: "La resposta correcta ha d'apuntar a una opció existent.",
  path: ["correct"]
});

export const quizSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(280).optional(),
  questions: z.array(quizQuestionSchema).min(1).max(40)
});

export type Quiz = z.infer<typeof quizSchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

export const sampleQuiz: Quiz = {
  title: "HTML Bàsic",
  description: "Exemple mínim compatible amb LiveQuiz.",
  questions: [
    {
      id: "q1",
      text: "Quina etiqueta crea un enllaç?",
      options: ["<div>", "<a>", "<img>", "<span>"],
      correct: 1,
      time: 20
    },
    {
      id: "q2",
      text: "Quin atribut indica la URL d'una imatge?",
      options: ["href", "src", "alt", "target"],
      correct: 1,
      time: 20
    }
  ]
};

export function parseQuiz(input: unknown) {
  return quizSchema.safeParse(input);
}

export function toPlayerQuestion(question: QuizQuestion, index: number) {
  return {
    id: question.id ?? `q-${index + 1}`,
    index,
    text: question.text,
    options: question.options,
    time: question.time
  };
}
