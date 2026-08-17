const express = require("express");
const router = express.Router();
const { indexDocument, askQuestion } = require("../controllers/chatController");
const protect = require("../middleware/authMiddleware");

router.use(protect);

router.post("/index/:documentId", indexDocument);
router.post("/:documentId", askQuestion);

module.exports = router;
