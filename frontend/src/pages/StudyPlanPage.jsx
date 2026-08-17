import { useState } from "react";
import api from "../api/axios";
import AppLayout from "../components/AppLayout";
import { CalendarClock, Loader2, Plus, X } from "lucide-react";

export default function StudyPlanPage() {
  const [subjects, setSubjects] = useState([""]);
  const [dailyHours, setDailyHours] = useState(3);
  const [examDate, setExamDate] = useState("");
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateSubject = (i, value) => {
    setSubjects((prev) => prev.map((s, idx) => (idx === i ? value : s)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/study-plan", {
        subjects: subjects.filter((s) => s.trim()),
        dailyHours: Number(dailyHours),
        examDate,
      });
      setPlan(data.plan);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-ink">Study planner</h1>
        <p className="mt-1 text-sm text-ink-soft">Get a day-by-day schedule leading up to your exam.</p>
      </div>

      <form onSubmit={handleSubmit} className="mb-8 space-y-4 rounded-xl border border-line bg-surface p-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-soft">Subjects</label>
          <div className="space-y-2">
            {subjects.map((s, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={s}
                  onChange={(e) => updateSubject(i, e.target.value)}
                  placeholder={`Subject ${i + 1}`}
                  className="flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-moss"
                />
                {subjects.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSubjects((prev) => prev.filter((_, idx) => idx !== i))}
                    className="rounded-lg p-2 text-ink-soft hover:bg-paper hover:text-danger"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSubjects((prev) => [...prev, ""])}
            className="mt-2 flex items-center gap-1 text-xs font-medium text-moss hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Add subject
          </button>
        </div>

        <div className="flex flex-wrap gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-soft">Exam date</label>
            <input
              type="date"
              required
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-moss"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-soft">Daily hours</label>
            <input
              type="number"
              min={1}
              max={16}
              value={dailyHours}
              onChange={(e) => setDailyHours(e.target.value)}
              className="w-24 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-moss"
            />
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading || !examDate}
          className="flex items-center gap-2 rounded-lg bg-moss px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-moss-dark disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
          {loading ? "Building your plan…" : "Generate plan"}
        </button>
      </form>

      {plan && (
        <div className="space-y-3">
          {plan.schedule.map((day, i) => (
            <div key={i} className="rounded-lg border border-line bg-surface p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-xs text-ink-soft">{day.date}</span>
                {day.revision && (
                  <span className="rounded-full bg-amber-light px-2 py-0.5 text-xs text-amber">Revision</span>
                )}
              </div>
              <div className="space-y-1.5">
                {day.topics.map((t, ti) => (
                  <div key={ti} className="flex items-center justify-between text-sm">
                    <span className="text-ink">
                      <span className="font-medium">{t.subject}</span> — {t.topic}
                    </span>
                    <span className="font-mono text-xs text-ink-soft">{t.hours}h</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
