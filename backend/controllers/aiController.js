const Document = require("../models/Document");
const { summarizeText } = require("../services/aiService");

// @route  POST /api/ai/summarize/:documentId
// @desc   Generate an AI summary, key points, and key concepts from a
//         document's extracted text, and save the result on the document
exports.summarizeDocument = async (req, res) => {
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

    const { summary, keyPoints, keyConcepts } = await summarizeText(document.extractedText);

    document.summary = summary;
    document.keyPoints = keyPoints;
    document.keyConcepts = keyConcepts;
    await document.save();

    res.status(200).json({ document });
  } catch (error) {
    res.status(500).json({ message: "Summarization failed", error: error.message });
  }
};
