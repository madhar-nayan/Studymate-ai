import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDocuments } from "../redux/slices/documentsSlice";
import api from "../api/axios";
import AppLayout from "../components/AppLayout";
import { Send, MessageCircle, Loader2, FileSearch } from "lucide-react";

export default function ChatPage() {
  const dispatch = useDispatch();
  const { items: documents } = useSelector((state) => state.documents);
  const [selectedDoc, setSelectedDoc] = useState("");
  const [indexed, setIndexed] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]); // { role: 'user'|'assistant', text, sources? }
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    dispatch(fetchDocuments());
  }, [dispatch]);

  useEffect(() => {
    setIndexed(false);
    setMessages([]);
  }, [selectedDoc]);

  const handleIndex = async () => {
    setIndexing(true);
    setError("");
    try {
      await api.post(`/chat/index/${selectedDoc}`);
      setIndexed(true);
    } catch (err) {
      setError(err.response?.data?.message || "Indexing failed");
    } finally {
      setIndexing(false);
    }
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim() || !selectedDoc) return;

    const userMessage = { role: "user", text: question };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setAsking(true);
    setError("");

    try {
      const { data } = await api.post(`/chat/${selectedDoc}`, { question: userMessage.text });
      setMessages((prev) => [...prev, { role: "assistant", text: data.answer, sources: data.sources }]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to get an answer");
    } finally {
      setAsking(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-ink">Ask your notes</h1>
        <p className="mt-1 text-sm text-ink-soft">Pick a document, index it once, then ask anything grounded in it.</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          value={selectedDoc}
          onChange={(e) => setSelectedDoc(e.target.value)}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-moss"
        >
          <option value="">Select a document…</option>
          {documents.map((doc) => (
            <option key={doc._id} value={doc._id}>
              {doc.fileName}
            </option>
          ))}
        </select>

        {selectedDoc && !indexed && (
          <button
            onClick={handleIndex}
            disabled={indexing}
            className="flex items-center gap-2 rounded-lg bg-moss px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-moss-dark disabled:opacity-60"
          >
            {indexing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
            {indexing ? "Indexing…" : "Index document"}
          </button>
        )}
        {indexed && <span className="text-xs font-medium text-moss">Ready to chat ✓</span>}
      </div>

      {error && <p className="mb-4 rounded-lg bg-amber-light px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="mb-4 min-h-[300px] space-y-4 rounded-xl border border-line bg-surface p-5">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center py-16 text-center">
            <MessageCircle className="mb-2 h-6 w-6 text-ink-soft" strokeWidth={1.5} />
            <p className="text-sm text-ink-soft">
              {selectedDoc ? "Ask a question about this document." : "Select and index a document to start."}
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                m.role === "user" ? "bg-moss text-white" : "bg-paper text-ink"
              }`}
            >
              <p>{m.text}</p>
              {m.sources?.length > 0 && (
                <p className="mt-2 font-mono text-xs text-ink-soft">
                  Sourced from {m.sources.length} excerpt{m.sources.length > 1 ? "s" : ""} in your notes
                </p>
              )}
            </div>
          </div>
        ))}

        {asking && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-xl bg-paper px-4 py-2.5 text-sm text-ink-soft">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={!indexed}
          placeholder={indexed ? "Ask something about your notes…" : "Index a document first"}
          className="flex-1 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm text-ink outline-none focus:border-moss focus:ring-2 focus:ring-moss-light disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!indexed || asking || !question.trim()}
          className="flex items-center gap-2 rounded-lg bg-moss px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-moss-dark disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </AppLayout>
  );
}
