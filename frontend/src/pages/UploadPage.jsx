import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDocuments, uploadDocument, deleteDocument } from "../redux/slices/documentsSlice";
import api from "../api/axios";
import AppLayout from "../components/AppLayout";
import { Upload, FileText, Trash2, Sparkles, Loader2 } from "lucide-react";

export default function UploadPage() {
  const dispatch = useDispatch();
  const { items: documents, status } = useSelector((state) => state.documents);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [summarizingId, setSummarizingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    dispatch(fetchDocuments());
  }, [dispatch]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    const result = await dispatch(uploadDocument(file));
    setUploading(false);
    if (uploadDocument.rejected.match(result)) {
      setUploadError(result.payload || "Upload failed");
    }
    e.target.value = "";
  };

  const handleSummarize = async (doc) => {
    setSummarizingId(doc._id);
    try {
      await api.post(`/ai/summarize/${doc._id}`);
      await dispatch(fetchDocuments());
      setExpandedId(doc._id);
    } catch (err) {
      setUploadError(err.response?.data?.message || "Summarization failed");
    } finally {
      setSummarizingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">Your documents</h1>
          <p className="mt-1 text-sm text-ink-soft">Upload notes as PDF, DOCX, or TXT — max 10MB each</p>
        </div>
        <button
          onClick={() => fileInputRef.current.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-lg bg-moss px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-moss-dark disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {uploadError && (
        <p className="mb-4 rounded-lg bg-amber-light px-3 py-2 text-sm text-danger">{uploadError}</p>
      )}

      {status === "loading" && <p className="text-sm text-ink-soft">Loading…</p>}

      {status !== "loading" && documents.length === 0 && (
        <div className="rounded-xl border border-dashed border-line bg-surface p-10 text-center">
          <FileText className="mx-auto mb-2 h-6 w-6 text-ink-soft" strokeWidth={1.5} />
          <p className="text-sm text-ink-soft">Nothing uploaded yet.</p>
        </div>
      )}

      <div className="space-y-3">
        {documents.map((doc) => (
          <div key={doc._id} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-ink-soft" strokeWidth={1.75} />
                <div>
                  <p className="text-sm font-medium text-ink">{doc.fileName}</p>
                  <p className="font-mono text-xs uppercase text-ink-soft">{doc.fileType}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSummarize(doc)}
                  disabled={summarizingId === doc._id}
                  className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-moss transition-colors hover:bg-moss-light disabled:opacity-60"
                >
                  {summarizingId === doc._id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {doc.summary ? "Re-summarize" : "Summarize"}
                </button>
                <button
                  onClick={() => dispatch(deleteDocument(doc._id))}
                  className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-paper hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {doc.summary && expandedId === doc._id && (
              <div className="mt-4 space-y-3 border-t border-line pt-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-amber">Summary</p>
                  <p className="mt-1 text-sm text-ink-soft">{doc.summary}</p>
                </div>
                {doc.keyPoints?.length > 0 && (
                  <div>
                    <p className="font-mono text-xs uppercase tracking-wider text-amber">Key points</p>
                    <ul className="mt-1 list-inside list-disc text-sm text-ink-soft">
                      {doc.keyPoints.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {doc.keyConcepts?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {doc.keyConcepts.map((c, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-moss-light px-2.5 py-1 text-xs text-moss-dark"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {doc.summary && expandedId !== doc._id && (
              <button
                onClick={() => setExpandedId(doc._id)}
                className="mt-2 text-xs text-moss hover:underline"
              >
                Show summary
              </button>
            )}
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
