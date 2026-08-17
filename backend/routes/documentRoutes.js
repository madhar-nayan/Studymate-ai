const express = require("express");
const router = express.Router();
const {
  uploadDocument,
  getDocuments,
  getDocumentById,
  deleteDocument,
  extractDocumentText,
} = require("../controllers/documentController");
const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.use(protect);

// "file" must match the form field name the client sends
router.post("/upload", upload.single("file"), uploadDocument);
router.get("/", getDocuments);
router.get("/:id", getDocumentById);
router.post("/:id/extract", extractDocumentText);
router.delete("/:id", deleteDocument);

module.exports = router;
