import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchDocuments } from "../redux/slices/documentsSlice";
import { fetchQuizzes, generateQuiz } from "../redux/slices/quizSlice";
import AppLayout from "../components/AppLayout";
import { Brain, Loader2, ChevronRight } from "lucide-react";

export default function QuizListPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items: documents } = useSelector((state) => state.documents);
  const { items: quizzes, status, error } = useSelector((state) => state.quizzes);
  const [selectedDoc, setSelectedDoc] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);

  useEffect(() => {
    dispatch(fetchDocuments());
    dispatch(fetchQuizzes());
  }, [dispatch]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!selectedDoc) return;
    const result = await dispatch(generateQuiz({ documentId: selectedDoc, numQuestions: Number(numQuestions) }));
    if (generateQuiz.fulfilled.match(result)) {
      navigate(`/quizzes/${result.payload._id}`);
    }
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-ink">Quizzes</h1>
        <p className="mt-1 text-sm text-ink-soft">Generate multiple-choice questions from any indexed document.</p>
      </div>

      <form
        onSubmit={handleGenerate}
        className="mb-8 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-5"
      >
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1.5 block text-xs font-medium text-ink-soft">Document</label>
          <select
            value={selectedDoc}
            onChange={(e) => setSelectedDoc(e.target.value)}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-moss"
          >
            <option value="">Select a document…</option>
            {documents.map((doc) => (
              <option key={doc._id} value={doc._id}>
                {doc.fileName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-soft">Questions</label>
          <input
            type="number"
            min={1}
            max={15}
            value={numQuestions}
            onChange={(e) => setNumQuestions(e.target.value)}
            className="w-20 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-moss"
          />
        </div>
        <button
          type="submit"
          disabled={!selectedDoc || status === "generating"}
          className="flex items-center gap-2 rounded-lg bg-moss px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-moss-dark disabled:opacity-60"
        >
          {status === "generating" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          {status === "generating" ? "Generating…" : "Generate Quiz"}
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      <div className="space-y-2">
        {quizzes.map((quiz) => (
          <button
            key={quiz._id}
            onClick={() => navigate(`/quizzes/${quiz._id}`)}
            className="flex w-full items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-moss"
          >
            <div>
              <p className="text-sm font-medium text-ink">{quiz.title}</p>
              <p className="mt-0.5 text-xs text-ink-soft">{quiz.questions?.length} questions</p>
            </div>
            <ChevronRight className="h-4 w-4 text-ink-soft" />
          </button>
        ))}
      </div>
    </AppLayout>
  );
}
