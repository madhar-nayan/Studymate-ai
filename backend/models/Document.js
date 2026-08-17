const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String, // pdf | docx | txt
      required: true,
    },
    fileUrl: {
      type: String, // Cloudinary secure_url
      required: true,
    },
    cloudinaryId: {
      type: String, // needed to delete the file from Cloudinary later
      required: true,
    },
    extractedText: {
      type: String, // filled in by the PDF text extraction service (Step 8)
      default: "",
    },
    summary: {
      type: String, // AI-generated summary (Step 9)
      default: "",
    },
    keyPoints: {
      type: [String],
      default: [],
    },
    keyConcepts: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", documentSchema);
