jest.mock("../models/Document");
jest.mock("../config/cloudinary", () => ({
  uploader: { destroy: jest.fn().mockResolvedValue({}) },
}));
jest.mock("../services/pdfService", () => ({
  extractTextFromPdf: jest.fn(),
  extractTextFromFile: jest.fn(),
}));

process.env.JWT_SECRET = "test_secret_for_jest";

const request = require("supertest");
const jwt = require("jsonwebtoken");
const Document = require("../models/Document");
const { extractTextFromFile } = require("../services/pdfService");
const app = require("../app");

const token = jwt.sign({ id: "652f1f77bcf86cd799439011" }, process.env.JWT_SECRET);
const authHeader = `Bearer ${token}`;

describe("Document routes", () => {
  afterEach(() => jest.clearAllMocks());

  describe("GET /api/documents", () => {
    it("requires authentication", async () => {
      const res = await request(app).get("/api/documents");
      expect(res.status).toBe(401);
    });

    it("returns the user's documents", async () => {
      Document.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([{ _id: "doc1", fileName: "notes.pdf" }]),
      });

      const res = await request(app).get("/api/documents").set("Authorization", authHeader);

      expect(res.status).toBe(200);
      expect(res.body.documents).toHaveLength(1);
    });
  });

  describe("POST /api/documents/:id/extract", () => {
    it("extracts text for a txt document", async () => {
      const save = jest.fn().mockResolvedValue();
      Document.findOne.mockResolvedValue({
        _id: "doc1",
        user: "652f1f77bcf86cd799439011",
        fileType: "txt",
        fileUrl: "https://example.com/notes.txt",
        extractedText: "",
        save,
      });
      extractTextFromFile.mockResolvedValue("hello world");

      const res = await request(app).post("/api/documents/doc1/extract").set("Authorization", authHeader);

      expect(res.status).toBe(200);
      expect(extractTextFromFile).toHaveBeenCalledWith("https://example.com/notes.txt", "txt");
      expect(save).toHaveBeenCalled();
    });
  });

  describe("DELETE /api/documents/:id", () => {
    it("returns 404 for a document that doesn't belong to the user", async () => {
      Document.findOne.mockResolvedValue(null);

      const res = await request(app).delete("/api/documents/doc1").set("Authorization", authHeader);

      expect(res.status).toBe(404);
    });

    it("deletes a document the user owns", async () => {
      Document.findOne.mockResolvedValue({
        _id: "doc1",
        cloudinaryId: "studymate-ai/documents/123-notes.pdf",
        deleteOne: jest.fn().mockResolvedValue({}),
      });

      const res = await request(app).delete("/api/documents/doc1").set("Authorization", authHeader);

      expect(res.status).toBe(200);
    });
  });
});
