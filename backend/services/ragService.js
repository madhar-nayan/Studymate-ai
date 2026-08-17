const OpenAI = require("openai");
const { GoogleGenAI } = require("@google/genai");
const Chunk = require("../models/Chunk");

// Standard cosine similarity between two equal-length vectors.
const cosineSimilarity = (a, b) => {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

// Brute-force nearest-neighbor search: scores every chunk against the
// query embedding and returns the top K.
const findRelevantChunks = (queryEmbedding, chunks, topK = 4) => {
  const scored = chunks.map((chunk) => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((s) => s.chunk);
};

// Production-scale retrieval using MongoDB Atlas Vector Search
const findRelevantChunksAtlas = async (queryEmbedding, documentId, userId, topK = 4) => {
  const results = await Chunk.aggregate([
    {
      $vectorSearch: {
        index: "vector_index",
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: 100,
        limit: topK,
        filter: {
          document: documentId,
          user: userId,
        },
      },
    },
    {
      $project: {
        text: 1,
        chunkIndex: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);

  return results;
};

// Sends the user's question plus retrieved context chunks to the LLM,
// instructed to answer ONLY from that context.
const generateAnswer = async (question, contextChunks) => {
  const context = contextChunks
    .map((c, i) => `[Excerpt ${i + 1}]\n${c.text}`)
    .join("\n\n");

  const prompt = `You are a study assistant answering questions using ONLY the excerpts below,
which come from the user's own notes. If the excerpts don't contain enough
information to answer, say so plainly instead of guessing.

Excerpts:
"""
${context}
"""

Question: ${question}

Answer clearly and concisely, referencing which excerpt(s) support your answer.`;

  if (process.env.GEMINI_API_KEY) {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: { temperature: 0.2 },
    });
    return (response.text || "").trim();
  }

  if (process.env.OPENAI_API_KEY) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });
    return response.choices[0].message.content.trim();
  }

  throw new Error("Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured in .env");
};

module.exports = { cosineSimilarity, findRelevantChunks, findRelevantChunksAtlas, generateAnswer };
