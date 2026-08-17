jest.mock("../models/Document");
jest.mock("../models/Quiz");
jest.mock("../services/aiService");

process.env.JWT_SECRET = "test_secret_for_jest";

const request = require("supertest");
const jwt = require("jsonwebtoken");
const Document = require("../models/Document");
const Quiz = require("../models/Quiz");
const aiService = require("../services/aiService");
const app = require("../app");

const token = jwt.sign({ id: "652f1f77bcf86cd799439011" }, process.env.JWT_SECRET);
const authHeader = `Bearer ${token}`;

describe("AI summarization", () => {
  afterEach(() => jest.clearAllMocks());

  it("returns 400 if the document has no extracted text", async () => {
    Document.findOne.mockResolvedValue({ _id: "doc1", extractedText: "" });

    const res = await request(app).post("/api/ai/summarize/doc1").set("Authorization", authHeader);

    expect(res.status).toBe(400);
  });

  it("summarizes and saves the result", async () => {
    const doc = {
      _id: "doc1",
      extractedText: "Some long study notes about operating systems.",
      save: jest.fn().mockResolvedValue({}),
    };
    Document.findOne.mockResolvedValue(doc);
    aiService.summarizeText.mockResolvedValue({
      summary: "A short summary.",
      keyPoints: ["Point A", "Point B"],
      keyConcepts: ["Deadlock", "Scheduling"],
    });

    const res = await request(app).post("/api/ai/summarize/doc1").set("Authorization", authHeader);

    expect(res.status).toBe(200);
    expect(doc.save).toHaveBeenCalled();
    expect(doc.summary).toBe("A short summary.");
  });
});

describe("AI quiz generation", () => {
  afterEach(() => jest.clearAllMocks());

  it("returns 400 if the document has no extracted text", async () => {
    Document.findOne.mockResolvedValue({ _id: "doc1", extractedText: "" });

    const res = await request(app)
      .post("/api/quizzes/generate/doc1")
      .set("Authorization", authHeader);

    expect(res.status).toBe(400);
  });

  it("generates a quiz and saves it", async () => {
    Document.findOne.mockResolvedValue({
      _id: "doc1",
      fileName: "os-notes.pdf",
      extractedText: "Notes about deadlocks and scheduling.",
    });

    const fakeQuestions = [
      {
        question: "What is a deadlock?",
        options: ["A", "B", "C", "D"],
        answer: "A",
        explanation: "Because...",
        difficulty: "medium",
      },
    ];
    aiService.generateQuiz.mockResolvedValue(fakeQuestions);
    Quiz.create.mockResolvedValue({ _id: "quiz1", questions: fakeQuestions });

    const res = await request(app)
      .post("/api/quizzes/generate/doc1")
      .set("Authorization", authHeader)
      .send({ numQuestions: 1 });

    expect(res.status).toBe(201);
    expect(res.body.quiz.questions).toHaveLength(1);
    expect(aiService.generateQuiz).toHaveBeenCalledWith(
      "Notes about deadlocks and scheduling.",
      1
    );
  });

  it("propagates an aiService validation error as a 500 with a clear message", async () => {
    Document.findOne.mockResolvedValue({
      _id: "doc1",
      fileName: "os-notes.pdf",
      extractedText: "Some notes.",
    });
    aiService.generateQuiz.mockRejectedValue(
      new Error('AI returned a question without exactly 4 options: "What is a deadlock?"')
    );

    const res = await request(app)
      .post("/api/quizzes/generate/doc1")
      .set("Authorization", authHeader);

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/exactly 4 options/);
  });
});
