const Document = require("../models/Document");
const cloudinary = require("../config/cloudinary");
const { extractTextFromBuffer, extractTextFromFile } = require("../services/pdfService");
const { Readable } = require("stream");

// Maps a mimetype to a short label stored on the Document
const mimeToType = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
};

// Streams a file buffer to Cloudinary
const uploadToCloudinary = (buffer, filename) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "studymate-ai/documents",
        resource_type: "raw",
        public_id: `${Date.now()}-${filename}`,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    const stream = Readable.from(buffer);
    stream.pipe(uploadStream);
  });
};

// @route  POST /api/documents/upload
// @desc   Upload a document (PDF/DOCX/TXT) — parses text in-memory and uploads to Cloudinary
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileType = mimeToType[req.file.mimetype] || "unknown";

    // 1. Extract text in-memory directly from buffer (fast, no external download needed)
    let extractedText = "";
    if (["pdf", "txt", "docx"].includes(fileType)) {
      try {
        extractedText = await extractTextFromBuffer(req.file.buffer, fileType);
      } catch (extractError) {
        console.error(`In-memory text extraction failed: ${extractError.message}`);
      }
    }

    // 2. Stream the file to Cloudinary for permanent storage
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, req.file.originalname);

    // 3. Save the document in MongoDB
    const document = await Document.create({
      user: req.user.id,
      fileName: req.file.originalname,
      fileType,
      fileUrl: cloudinaryResult.secure_url,
      cloudinaryId: cloudinaryResult.public_id,
      extractedText,
    });

    res.status(201).json({ document });
  } catch (error) {
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
};

// @route  GET /api/documents
// @desc   List all documents belonging to the logged-in user
exports.getDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ documents });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch documents", error: error.message });
  }
};

// @route  GET /api/documents/:id
// @desc   Get a single document by id (only if it belongs to the requester)
exports.getDocumentById = async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, user: req.user.id });
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    res.status(200).json({ document });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch document", error: error.message });
  }
};

// @route  POST /api/documents/:id/extract
// @desc   (Re-)run text extraction for a document — useful if the automatic
//         extraction on upload failed, or to refresh extractedText
exports.extractDocumentText = async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, user: req.user.id });
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (!["pdf", "txt", "docx"].includes(document.fileType)) {
      return res.status(400).json({ message: "Text extraction currently supports PDF, DOCX, and TXT files only" });
    }

    const text = await extractTextFromFile(document.fileUrl, document.fileType);
    document.extractedText = text;
    await document.save();

    res.status(200).json({ document });
  } catch (error) {
    res.status(500).json({ message: "Text extraction failed", error: error.message });
  }
};

// @route  DELETE /api/documents/:id
// @desc   Delete a document from both MongoDB and Cloudinary
exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, user: req.user.id });
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Remove from Cloudinary first — resource_type must match how it was uploaded
    await cloudinary.uploader.destroy(document.cloudinaryId, { resource_type: "raw" });
    await document.deleteOne();

    res.status(200).json({ message: "Document deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete document", error: error.message });
  }
};
