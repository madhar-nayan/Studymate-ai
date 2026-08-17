const Document = require("../models/Document");
const Quiz = require("../models/Quiz");
const { generateQuiz } = require("../services/aiService");

// @route  POST /api/quizzes/generate/:documentId
// @desc   Generate an AI quiz from a document's extracted text and save it
// @body   { numQuestions?: number }  (defaults to 5)
exports.generateQuizFromDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.documentId,
      user: req.user.id,
    });

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (!document.extractedText) {
      if (["pdf", "txt", "docx"].includes(document.fileType)) {
        try {
          const { extractTextFromFile } = require("../services/pdfService");
          document.extractedText = await extractTextFromFile(document.fileUrl, document.fileType);
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

    const numQuestions = req.body.numQuestions || 5;
    const questions = await generateQuiz(document.extractedText, numQuestions);

    const quiz = await Quiz.create({
      user: req.user.id,
      document: document._id,
      title: `Quiz: ${document.fileName}`,
      questions,
    });

    res.status(201).json({ quiz });
  } catch (error) {
    res.status(500).json({ message: "Quiz generation failed", error: error.message });
  }
};

// @route  GET /api/quizzes
// @desc   List all quizzes belonging to the logged-in user
exports.getQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ user: req.user.id })
      .select("-questions.answer -questions.explanation") // hide answers in list view
      .sort({ createdAt: -1 });
    res.status(200).json({ quizzes });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch quizzes", error: error.message });
  }
};

// @route  GET /api/quizzes/:id
// @desc   Get a single quiz including questions, options, answers, and explanations
exports.getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, user: req.user.id });
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }
    res.status(200).json({ quiz });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch quiz", error: error.message });
  }
};

// @route  DELETE /api/quizzes/:id
exports.deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }
    res.status(200).json({ message: "Quiz deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete quiz", error: error.message });
  }
};
