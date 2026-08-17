import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { fetchDocuments } from "../redux/slices/documentsSlice";
import AppLayout from "../components/AppLayout";
import { FileText, Upload, MessageCircle, Brain, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { items: documents, status } = useSelector((state) => state.documents);
  const user = useSelector((state) => state.auth.user);

  useEffect(() => {
    dispatch(fetchDocuments());
  }, [dispatch]);

  return (
    <AppLayout>
      <div className="lamp-glow mb-10">
        <div className="relative z-10">
          <p className="font-mono text-xs uppercase tracking-wider text-amber">Welcome back</p>
          <h1 className="mt-1 font-display text-3xl text-ink">{user?.name?.split(" ")[0]}'s desk</h1>
          <p className="mt-2 max-w-lg text-sm text-ink-soft">
            Upload your notes, then summarize, quiz, or chat with them — everything stays grounded in what you actually wrote.
          </p>
        </div>
      </div>

      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          to="/upload"
          className="group rounded-xl border border-line bg-surface p-5 transition-colors hover:border-moss"
        >
          <Upload className="mb-3 h-5 w-5 text-moss" strokeWidth={1.75} />
          <p className="font-medium text-ink">Upload notes</p>
          <p className="mt-1 text-sm text-ink-soft">PDF, DOCX, or TXT</p>
        </Link>
        <Link
          to="/chat"
          className="group rounded-xl border border-line bg-surface p-5 transition-colors hover:border-moss"
        >
          <MessageCircle className="mb-3 h-5 w-5 text-moss" strokeWidth={1.75} />
          <p className="font-medium text-ink">Ask a question</p>
          <p className="mt-1 text-sm text-ink-soft">Chat grounded in your notes</p>
        </Link>
        <Link
          to="/quizzes"
          className="group rounded-xl border border-line bg-surface p-5 transition-colors hover:border-moss"
        >
          <Brain className="mb-3 h-5 w-5 text-moss" strokeWidth={1.75} />
          <p className="font-medium text-ink">Generate a quiz</p>
          <p className="mt-1 text-sm text-ink-soft">Test what you remember</p>
        </Link>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg text-ink">Recent documents</h2>
        <Link to="/upload" className="flex items-center gap-1 text-sm text-moss hover:underline">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {status === "loading" && <p className="text-sm text-ink-soft">Loading…</p>}

      {status !== "loading" && documents.length === 0 && (
        <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center">
          <FileText className="mx-auto mb-2 h-6 w-6 text-ink-soft" strokeWidth={1.5} />
          <p className="text-sm text-ink-soft">No documents yet. Upload your first set of notes to get started.</p>
        </div>
      )}

      <div className="space-y-2">
        {documents.slice(0, 5).map((doc) => (
          <div
            key={doc._id}
            className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-ink-soft" strokeWidth={1.75} />
              <span className="text-sm text-ink">{doc.fileName}</span>
            </div>
            <span className="font-mono text-xs uppercase text-ink-soft">{doc.fileType}</span>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
