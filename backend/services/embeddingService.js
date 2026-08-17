const OpenAI = require("openai");
const { GoogleGenAI } = require("@google/genai");

// Splits text into overlapping chunks by character count.
const chunkText = (text, chunkSize = 1500, overlap = 200) => {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end).trim());
    start += chunkSize - overlap;
  }

  return chunks.filter((c) => c.length > 0);
};

// Generates an embedding vector for a single piece of text.
const generateEmbedding = async (text) => {
  if (process.env.GEMINI_API_KEY) {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: text,
    });
    return response.embeddings[0].values;
  }

  if (process.env.OPENAI_API_KEY) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  }

  throw new Error("Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured in .env");
};

// Batches embedding requests in single API calls (up to 50 chunks per request)
const generateEmbeddings = async (texts) => {
  if (process.env.GEMINI_API_KEY) {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const batchSize = 50;
    const allEmbeddings = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const res = await ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: batch,
      });
      allEmbeddings.push(...res.embeddings.map((e) => e.values));
    }
    return allEmbeddings;
  }

  if (process.env.OPENAI_API_KEY) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });
    return response.data.map((d) => d.embedding);
  }

  throw new Error("Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured in .env");
};

module.exports = { chunkText, generateEmbedding, generateEmbeddings };
