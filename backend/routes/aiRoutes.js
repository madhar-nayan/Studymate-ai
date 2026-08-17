const express = require("express");
const router = express.Router();
const { summarizeDocument } = require("../controllers/aiController");
const protect = require("../middleware/authMiddleware");

router.use(protect);

router.post("/summarize/:documentId", summarizeDocument);

module.exports = router;
