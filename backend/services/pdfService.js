const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

const downloadFile = async (fileUrl) => {
  const response = await fetch(fileUrl);

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
};

// Extracts text directly from an in-memory buffer
const extractTextFromBuffer = async (buffer, fileType) => {
  switch (fileType) {
    case "pdf": {
      if (typeof pdfParse === "function") {
        const data = await pdfParse(buffer);
        return (data.text || "").trim();
      } else if (pdfParse.PDFParse) {
        const parser = new pdfParse.PDFParse({ data: buffer });
        const data = await parser.getText();
        await parser.destroy();
        return (data.text || "").trim();
      }
      throw new Error("Unable to parse PDF with installed pdf-parse version");
    }
    case "txt":
      return buffer.toString("utf8").trim();
    case "docx": {
      const result = await mammoth.extractRawText({ buffer });
      return (result.value || "").trim();
    }
    default:
      throw new Error(`Unsupported file type for text extraction: ${fileType}`);
  }
};

// Downloads a PDF/DOCX/TXT from its URL and extracts its raw text
const extractTextFromFile = async (fileUrl, fileType) => {
  const buffer = await downloadFile(fileUrl);
  return extractTextFromBuffer(buffer, fileType);
};

const extractTextFromPdf = async (fileUrl) => extractTextFromFile(fileUrl, "pdf");
const extractTextFromTxt = async (fileUrl) => extractTextFromFile(fileUrl, "txt");
const extractTextFromDocx = async (fileUrl) => extractTextFromFile(fileUrl, "docx");

module.exports = {
  extractTextFromBuffer,
  extractTextFromFile,
  extractTextFromPdf,
  extractTextFromTxt,
  extractTextFromDocx,
};
