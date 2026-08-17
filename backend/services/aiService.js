const OpenAI = require("openai");
const { GoogleGenAI } = require("@google/genai");

// Helper to call either Gemini or OpenAI depending on configured environment variables
const callAI = async (prompt, temperature = 0.3) => {
  if (process.env.GEMINI_API_KEY) {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: { temperature },
    });
    return (response.text || "").trim();
  }

  if (process.env.OPENAI_API_KEY) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature,
    });
    return response.choices[0].message.content.trim();
  }

  throw new Error("Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured in .env");
};

// Builds the prompt sent to the model. Asking for strict JSON keeps the
// response parseable instead of having to scrape free-form text.
const buildSummaryPrompt = (text) => `
You are a study assistant. Read the study notes below and respond with
ONLY a JSON object (no markdown fences, no preamble) in this exact shape:

{
  "summary": "a short paragraph (3-5 sentences) summarizing the notes",
  "keyPoints": ["point 1", "point 2", "..."],
  "keyConcepts": ["concept 1", "concept 2", "..."]
}

Study notes:
"""
${text.slice(0, 12000)}
"""
`;

// Calls the LLM and returns a structured summary.
const summarizeText = async (text) => {
  if (!text || !text.trim()) {
    throw new Error("No text provided to summarize");
  }

  const raw = await callAI(buildSummaryPrompt(text), 0.3);

  // Defensive parsing: strip markdown code fences if the model added them anyway
  const cleaned = raw.replace(/^```json\s*|^```\s*|```$/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`AI response was not valid JSON: ${cleaned.slice(0, 200)}`);
  }
};

// Builds the prompt for quiz generation.
const buildQuizPrompt = (text, numQuestions) => `
You are a study assistant. Read the study notes below and generate exactly
${numQuestions} multiple-choice questions to test understanding of them.

Respond with ONLY a JSON object (no markdown fences, no preamble) in this
exact shape:

{
  "questions": [
    {
      "question": "the question text",
      "options": ["option A", "option B", "option C", "option D"],
      "answer": "the option text that is correct (must exactly match one of the options)",
      "explanation": "why this answer is correct, 1-2 sentences",
      "difficulty": "easy"
    }
  ]
}

Study notes:
"""
${text.slice(0, 12000)}
"""
`;

// Calls the LLM and returns an array of MCQ questions.
const generateQuiz = async (text, numQuestions = 5) => {
  if (!text || !text.trim()) {
    throw new Error("No text provided to generate a quiz from");
  }

  const raw = await callAI(buildQuizPrompt(text, numQuestions), 0.5);
  const cleaned = raw.replace(/^```json\s*|^```\s*|```$/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`AI response was not valid JSON: ${cleaned.slice(0, 200)}`);
  }

  for (const q of parsed.questions || []) {
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      throw new Error(`AI returned a question without exactly 4 options: "${q.question}"`);
    }
    if (!q.options.includes(q.answer)) {
      throw new Error(`AI answer doesn't match any option for question: "${q.question}"`);
    }
  }

  return parsed.questions;
};

// Computes the number of days between today and the exam date (inclusive)
const daysUntil = (examDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(examDate);
  const diffMs = exam - today;
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
};

const buildStudyPlanPrompt = (subjects, dailyHours, examDate, numDays) => `
You are a study planner. Create a day-by-day revision schedule.

Exam date: ${examDate} (${numDays} days from today, inclusive)
Subjects: ${subjects.join(", ")}
Available study time per day: ${dailyHours} hours

Rules:
- Distribute subjects across the available days based on priority — assume
  subjects listed first are higher priority unless the topics themselves
  suggest otherwise.
- Reserve the final 10-15% of days before the exam primarily for revision
  (set "revision": true and keep "topics" light or focused on weak areas).
- Each day's total hours across all topics should not exceed ${dailyHours}.
- Use today's date plus 1 day as the first schedule date, in "YYYY-MM-DD" format,
  incrementing one calendar day at a time.

Respond with ONLY a JSON object (no markdown fences, no preamble) in this
exact shape:

{
  "schedule": [
    {
      "date": "YYYY-MM-DD",
      "topics": [
        { "subject": "Math", "topic": "Calculus - derivatives", "hours": 2, "priority": "high" }
      ],
      "revision": false
    }
  ]
}
`;

// Generates a full study schedule from exam date, subjects, and daily hours.
const generateStudyPlan = async (subjects, dailyHours, examDate) => {
  if (!subjects || subjects.length === 0) {
    throw new Error("At least one subject is required");
  }
  if (!dailyHours || dailyHours <= 0) {
    throw new Error("dailyHours must be a positive number");
  }

  const numDays = daysUntil(examDate);
  const raw = await callAI(buildStudyPlanPrompt(subjects, dailyHours, examDate, numDays), 0.4);
  const cleaned = raw.replace(/^```json\s*|^```\s*|```$/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`AI response was not valid JSON: ${cleaned.slice(0, 200)}`);
  }

  if (!Array.isArray(parsed.schedule) || parsed.schedule.length === 0) {
    throw new Error("AI did not return a valid schedule");
  }

  // Sanitize schedule items for database schema compatibility
  const validPriorities = ["high", "medium", "low"];
  const sanitizedSchedule = parsed.schedule.map((day) => ({
    date: day.date || "2026-08-18",
    revision: Boolean(day.revision),
    topics: Array.isArray(day.topics)
      ? day.topics.map((t) => ({
          subject: String(t.subject || subjects[0] || "General"),
          topic: String(t.topic || "Review"),
          hours: Number(t.hours) || Math.max(1, Math.round(dailyHours / (day.topics.length || 1))),
          priority: validPriorities.includes(String(t.priority).toLowerCase())
            ? String(t.priority).toLowerCase()
            : "medium",
        }))
      : [],
  }));

  return sanitizedSchedule;
};

module.exports = { summarizeText, generateQuiz, generateStudyPlan };
