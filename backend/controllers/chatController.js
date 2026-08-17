const Document = require("../models/Document");
const Chunk = require("../models/Chunk");
const { chunkText, generateEmbedding, generateEmbeddings } = require("../services/embeddingService");
const { findRelevantChunks, findRelevantChunksAtlas, generateAnswer } = require("../services/ragService");
const { extractTextFromFile } = require("../services/pdfService");

// @route  POST /api/chat/index/:documentId
// @desc   Step 1 of RAG: chunk the document's extracted text, embed each
//         chunk, and store them. Must run once before asking questions.
//         Safe to re-run — it clears old chunks first.
exports.indexDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.documentId,
      user: req.user.id,
    });

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Auto-extract text if it was not extracted previously
    if (!document.extractedText) {
      if (["pdf", "txt", "docx"].includes(document.fileType)) {
        try {
          const text = await extractTextFromFile(document.fileUrl, document.fileType);
          document.extractedText = text;
          await document.save();
        } catch (extractErr) {
          return res.status(400).json({
            message: `Text extraction failed: ${extractErr.message}`,
          });
        }
      } else {
        return res.status(400).json({
          message: "This document has no extracted text yet. Run text extraction first.",
        });
      }
    }

    // Remove any previous chunks for this document so re-indexing doesn't
    // leave stale/duplicate vectors behind
    await Chunk.deleteMany({ document: document._id });

    const textChunks = chunkText(document.extractedText);
    const embeddings = await generateEmbeddings(textChunks);

    const chunkDocs = textChunks.map((text, i) => ({
      document: document._id,
      user: req.user.id,
      chunkIndex: i,
      text,
      embedding: embeddings[i],
    }));

    await Chunk.insertMany(chunkDocs);

    res.status(201).json({
      message: "Document indexed successfully",
      chunkCount: chunkDocs.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Indexing failed", error: error.message });
  }
};

// @route  POST /api/chat/:documentId
// @desc   Step 2 of RAG: embed the question, retrieve the most relevant
//         chunks, and generate an answer grounded in them
// @body   { question: string }
exports.askQuestion = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ message: "A question is required" });
    }

    const document = await Document.findOne({
      _id: req.params.documentId,
      user: req.user.id,
    });
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const chunks = await Chunk.find({ document: document._id });
    if (chunks.length === 0) {
      return res.status(400).json({
        message: "This document hasn't been indexed yet. Call /api/chat/index/:documentId first.",
      });
    }

    // 1. Embed the incoming question
    const queryEmbedding = await generateEmbedding(question);

    // 2. Retrieve top-K relevant chunks using cosine similarity
    const relevantChunks = findRelevantChunks(queryEmbedding, chunks, 4);

    // 3. Send the question + retrieved context to the LLM for a grounded answer
    const answer = await generateAnswer(question, relevantChunks);

    res.status(200).json({
      answer,
      sources: relevantChunks.map((c) => ({ chunkIndex: c.chunkIndex, text: c.text })),
    });
  } catch (error) {
    res.status(500).json({ message: "Chat failed", error: error.message });
  }
};
