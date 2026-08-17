const express = require("express");
const router = express.Router();
const {
  generateQuizFromDocument,
  getQuizzes,
  getQuizById,
  deleteQuiz,
} = require("../controllers/quizController");
const protect = require("../middleware/authMiddleware");

router.use(protect);

router.post("/generate/:documentId", generateQuizFromDocument);
router.get("/", getQuizzes);
router.get("/:id", getQuizById);
router.delete("/:id", deleteQuiz);

module.exports = router;
