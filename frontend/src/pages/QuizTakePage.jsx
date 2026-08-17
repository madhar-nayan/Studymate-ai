import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { fetchQuizById } from "../redux/slices/quizSlice";
import AppLayout from "../components/AppLayout";
import { CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

export default function QuizTakePage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { active: quiz, status } = useSelector((state) => state.quizzes);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    dispatch(fetchQuizById(id));
  }, [dispatch, id]);

  if (status === "loading" || !quiz) {
    return (
      <AppLayout>
        <p className="text-sm text-ink-soft">Loading…</p>
      </AppLayout>
    );
  }

  const score = quiz.questions.filter((q, i) => answers[i] === q.answer).length;

  return (
    <AppLayout>
      <button
        onClick={() => navigate("/quizzes")}
        className="mb-6 flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to quizzes
      </button>

      <h1 className="mb-1 font-display text-2xl text-ink">{quiz.title}</h1>
      <p className="mb-8 text-sm text-ink-soft">{quiz.questions.length} questions</p>

      <div className="space-y-6">
        {quiz.questions.map((q, i) => {
          const userAnswer = answers[i];
          const isCorrect = userAnswer === q.answer;

          return (
            <div key={i} className="rounded-xl border border-line bg-surface p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-ink">
                  {i + 1}. {q.question}
                </p>
                <span className="shrink-0 rounded-full bg-moss-light px-2 py-0.5 font-mono text-xs text-moss-dark">
                  {q.difficulty}
                </span>
              </div>

              <div className="space-y-2">
                {q.options.map((opt) => {
                  const isSelected = userAnswer === opt;
                  const showCorrect = submitted && opt === q.answer;
                  const showWrong = submitted && isSelected && opt !== q.answer;

                  return (
                    <button
                      key={opt}
                      disabled={submitted}
                      onClick={() => setAnswers((prev) => ({ ...prev, [i]: opt }))}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                        showCorrect
                          ? "border-moss bg-moss-light text-moss-dark"
                          : showWrong
                          ? "border-danger bg-amber-light text-danger"
                          : isSelected
                          ? "border-moss bg-moss-light text-moss-dark"
                          : "border-line bg-paper text-ink hover:border-moss"
                      }`}
                    >
                      {opt}
                      {showCorrect && <CheckCircle2 className="h-4 w-4" />}
                      {showWrong && <XCircle className="h-4 w-4" />}
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <p className="mt-3 text-sm text-ink-soft">
                  <span className={isCorrect ? "font-medium text-moss" : "font-medium text-danger"}>
                    {isCorrect ? "Correct. " : "Not quite. "}
                  </span>
                  {q.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center gap-4">
        {!submitted ? (
          <button
            onClick={() => setSubmitted(true)}
            disabled={Object.keys(answers).length < quiz.questions.length}
            className="rounded-lg bg-moss px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-moss-dark disabled:opacity-60"
          >
            Submit answers
          </button>
        ) : (
          <p className="font-display text-lg text-ink">
            Score: {score} / {quiz.questions.length}
          </p>
        )}
      </div>
    </AppLayout>
  );
}
