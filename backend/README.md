# StudyMate AI — Backend Foundation

Covers Steps 2–5 of the roadmap: project structure, backend setup, MongoDB connection, and JWT authentication.

## Folder structure

```
backend/
├── config/
│   ├── database.js           # MongoDB connection via Mongoose
│   ├── cloudinary.js         # Cloudinary SDK config
│   └── atlasVectorSearchIndex.json # Index definition to create in Atlas UI (Step 12)
├── models/
│   ├── User.js              # User schema, password hashing (bcrypt)
│   ├── Document.js          # Uploaded document schema
│   ├── Quiz.js               # Generated quiz schema (questions, options, answers)
│   ├── Chunk.js               # Document chunk + embedding, used for RAG retrieval
│   └── StudyPlan.js           # AI-generated day-by-day study schedule
├── controllers/
│   ├── authController.js    # register / login / getMe logic
│   ├── userController.js    # profile get / update / delete
│   ├── documentController.js # upload / list / get / delete / extract documents
│   ├── aiController.js       # AI summarization
│   ├── quizController.js     # AI quiz generation / list / get / delete
│   ├── chatController.js     # RAG: index document, ask question
│   └── studyPlanController.js # AI study planner
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── documentRoutes.js
│   ├── aiRoutes.js
│   ├── quizRoutes.js
│   ├── chatRoutes.js
│   └── studyPlanRoutes.js
├── middleware/
│   ├── authMiddleware.js    # verifies JWT on protected routes
│   └── uploadMiddleware.js  # Multer + Cloudinary storage, file type/size validation
├── utils/
│   └── generateToken.js     # signs JWTs
├── services/
│   ├── pdfService.js         # extractTextFromPdf(url) — downloads + parses a PDF in-memory
│   ├── aiService.js           # summarizeText, generateQuiz, generateStudyPlan — calls OpenAI
│   ├── embeddingService.js    # chunkText() + generateEmbedding(s)() — calls OpenAI embeddings
│   └── ragService.js          # cosine similarity, brute-force + Atlas Vector Search retrieval, generateAnswer
├── app.js                    # Express app: security, CORS, routes, error handling
├── server.js                  # entry point: loads env, connects DB, starts server
└── .env.example
```

## Setup

1. `cd backend && npm install`
2. Copy `.env.example` to `.env` and fill in:
   - `MONGO_URI` — from MongoDB Atlas (free tier works)
   - `JWT_SECRET` — any long random string (e.g. `openssl rand -hex 32`)
3. `npm run dev` (requires `nodemon`, already in devDependencies)

Server starts on `http://localhost:5000`. Health check: `GET /api/health`.

## Auth endpoints

| Method | Route              | Auth required | Body                              |
|--------|---------------------|----------------|-------------------------------------|
| POST   | /api/auth/register  | No             | `{ name, email, password }`        |
| POST   | /api/auth/login      | No             | `{ email, password }`              |
| GET    | /api/auth/me          | Yes (Bearer)   | —                                    |

**Example: register**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alex","email":"alex@example.com","password":"secret123"}'
```

**Example: access a protected route**
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <token from register/login response>"
```

## Profile endpoints (Step 6)

| Method | Route              | Auth required | Body                               |
|--------|----------------------|----------------|--------------------------------------|
| GET    | /api/users/profile    | Yes            | —                                     |
| PUT    | /api/users/profile    | Yes            | `{ name?, email?, password? }`      |
| DELETE | /api/users/profile    | Yes            | —                                     |

All fields in `PUT` are optional — only send what you want to change. Changing the email checks that no other account already uses it.

## Document upload endpoints (Step 7)

| Method | Route                  | Auth required | Body                          |
|--------|--------------------------|----------------|----------------------------------|
| POST   | /api/documents/upload    | Yes            | multipart/form-data, field `file` |
| GET    | /api/documents            | Yes            | —                                  |
| GET    | /api/documents/:id        | Yes            | —                                  |
| DELETE | /api/documents/:id        | Yes            | —                                  |

Accepts PDF, DOCX, and TXT only, max 10MB. Requires Cloudinary credentials in `.env` (free tier works: cloudinary.com/console).

**Example: upload a file**
```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/notes.pdf"
```

### File upload flow
1. Client sends a `multipart/form-data` request with the file under the `file` field.
2. `uploadMiddleware` (Multer + `multer-storage-cloudinary`) validates the mimetype, enforces the 10MB limit, and streams the file directly to Cloudinary — no local disk write.
3. Cloudinary returns a `secure_url` and `public_id`, attached to `req.file` by the storage engine.
4. `documentController.uploadDocument` saves a `Document` record in MongoDB linking the file to `req.user.id`.
5. If the file is a PDF, text extraction runs automatically right after (Step 8, below) — the upload still succeeds even if extraction fails.
6. Deleting a document removes it from both Cloudinary (`cloudinary.uploader.destroy`) and MongoDB, in that order — so nothing orphans in cloud storage.

## PDF text extraction (Step 8)

| Method | Route                      | Auth required | Notes                                  |
|--------|-------------------------------|----------------|-------------------------------------------|
| POST   | /api/documents/:id/extract    | Yes            | (Re-)runs extraction; PDF only for now   |

### How PDF processing works
1. `pdfService.extractTextFromPdf(fileUrl)` downloads the PDF from its Cloudinary URL using the built-in `fetch`, entirely in memory — nothing touches local disk.
2. The downloaded buffer is passed to `pdf-parse`, which reads the PDF's internal text layer and returns it as a plain string (`data.text`), along with metadata like page count if you need it later.
3. The extracted text is saved to `Document.extractedText` in MongoDB.
4. This runs **automatically right after upload** for PDFs. If it fails (e.g. a scanned/image-only PDF with no text layer, or a transient network issue), the upload itself still succeeds — you can retry via `POST /api/documents/:id/extract`.
5. `extractedText` is what Step 9 (AI summarization) and Step 10 (AI quiz) will feed into the LLM prompt as context.

**Note**: `pdf-parse` only extracts text that's actually embedded in the PDF (selectable text). Scanned documents with no text layer will return an empty string — that needs OCR, which isn't in scope for this step.

## AI summarization (Step 9)

| Method | Route                             | Auth required | Notes                          |
|--------|--------------------------------------|----------------|-----------------------------------|
| POST   | /api/ai/summarize/:documentId    | Yes            | Requires the document already has `extractedText` |

Requires `OPENAI_API_KEY` in `.env` (from platform.openai.com/api-keys).

**Example**
```bash
curl -X POST http://localhost:5000/api/ai/summarize/<documentId> \
  -H "Authorization: Bearer <token>"
```

Response adds three fields to the document:
```json
{
  "document": {
    "summary": "a short paragraph summarizing the notes",
    "keyPoints": ["...", "..."],
    "keyConcepts": ["...", "..."]
  }
}
```

### How the prompt is built and the response handled
1. `aiService.summarizeText` wraps the document's `extractedText` in a prompt that instructs the model to return **only JSON** — no markdown, no commentary — in a fixed shape (`summary`, `keyPoints`, `keyConcepts`). This makes the response directly parseable instead of needing to scrape free text.
2. Text is truncated to ~12,000 characters to stay within a reasonable token budget. Longer documents will need chunking — that's what Steps 11-12 (RAG + vector search) solve properly.
3. The raw model response is defensively cleaned (strips ` ```json ` fences in case the model adds them anyway) before `JSON.parse`. If parsing still fails, the error surfaces the raw response so you can see what went wrong instead of the server crashing.
4. `aiController.summarizeDocument` saves the three fields onto the `Document` record so the summary persists — no need to regenerate it every time the user views the document.

## AI quiz generator (Step 10)

| Method | Route                          | Auth required | Body                          |
|--------|------------------------------------|----------------|-----------------------------------|
| POST   | /api/quizzes/generate/:documentId | Yes            | `{ numQuestions? }` (default 5)  |
| GET    | /api/quizzes                        | Yes            | — (answers/explanations hidden)  |
| GET    | /api/quizzes/:id                      | Yes            | — (full quiz with answers)         |
| DELETE | /api/quizzes/:id                      | Yes            | —                                    |

**Example**
```bash
curl -X POST http://localhost:5000/api/quizzes/generate/<documentId> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"numQuestions": 5}'
```

Each question is saved in this shape:
```json
{
  "question": "What causes a deadlock?",
  "options": ["...", "...", "...", "..."],
  "answer": "the exact text of the correct option",
  "explanation": "why that answer is correct",
  "difficulty": "medium"
}
```

### Complete flow: button click → backend → AI → database → display
1. **Client** calls `POST /api/quizzes/generate/:documentId` (the "Generate Quiz" button).
2. **`quizController.generateQuizFromDocument`** looks up the document, confirms it belongs to the requester and already has `extractedText` (from Step 8).
3. **`aiService.generateQuiz`** sends the text to OpenAI with a strict-JSON prompt asking for an array of MCQs. Same defensive parsing as summarization (strips markdown fences, throws with the raw text if parsing fails).
4. Before saving, the service **validates each question**: exactly 4 options, and the `answer` field must exactly match one of them. A model output that doesn't satisfy this throws immediately rather than silently corrupting a quiz — this is on top of the same check enforced at the Mongoose schema level.
5. A new **`Quiz`** document is saved in MongoDB, linked to both the user and the source document.
6. **`GET /api/quizzes`** returns the list without answers/explanations (safe to show before attempting); **`GET /api/quizzes/:id`** returns the full quiz for grading/review once the user has answered.

## RAG-based chat with documents (Step 11)

| Method | Route                       | Auth required | Body                        |
|--------|---------------------------------|----------------|---------------------------------|
| POST   | /api/chat/index/:documentId  | Yes            | — (run once per document, or after updating it) |
| POST   | /api/chat/:documentId         | Yes            | `{ question: string }`         |

**Example**
```bash
# Step 1: index the document (chunk + embed) — do this once
curl -X POST http://localhost:5000/api/chat/index/<documentId> \
  -H "Authorization: Bearer <token>"

# Step 2: ask a question grounded in that document
curl -X POST http://localhost:5000/api/chat/<documentId> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"question": "Explain deadlock from my OS notes"}'
```

Response:
```json
{
  "answer": "A deadlock occurs when... (Excerpt 2)",
  "sources": [{ "chunkIndex": 1, "text": "..." }]
}
```

### RAG architecture, step by step

1. **Chunking** — `embeddingService.chunkText` splits `Document.extractedText` into ~1000-character windows with 150 characters of overlap between consecutive chunks. The overlap matters: without it, a sentence or idea that straddles a chunk boundary gets cut in half and loses meaning in both pieces.

2. **Embeddings** — each chunk is sent to OpenAI's `text-embedding-3-small` model, which returns a 1536-dimensional vector: numbers that place the chunk's *meaning* in a coordinate space, so semantically similar text ends up numerically close together, regardless of exact wording.

3. **Vector storage** — each chunk plus its embedding is saved as a `Chunk` document in MongoDB, linked to the source `Document` and the user. Re-indexing a document deletes its old chunks first, so there's no duplication.

4. **Similarity search** — when a question comes in, it's embedded the same way. `ragService.findRelevantChunks` computes cosine similarity between the question's vector and every stored chunk's vector, and returns the top 4 closest matches. This is brute-force (checks every chunk) — fine at the scale of one document's chunks, but it's exactly what Step 12 replaces with MongoDB Atlas Vector Search so it stays fast across many documents and users at once.

5. **Context assembly** — the top-matching chunks are formatted as labeled excerpts (`[Excerpt 1]`, `[Excerpt 2]`, ...) and inserted into the prompt.

6. **Answer generation** — the LLM is instructed to answer *only* from the provided excerpts and to say so plainly if they don't contain enough information, rather than making something up. This is what keeps the chat "grounded" in the user's actual notes instead of the model's general knowledge.

7. The response includes both the answer and the `sources` used, so the UI can show the user exactly which part of their notes the answer came from.

## Vector search upgrade (Step 12)

Step 11's retrieval was brute-force — every chunk gets pulled into Node and scored one by one. That's fine for a handful of chunks but doesn't scale. Step 12 swaps in **MongoDB Atlas Vector Search**, which runs the nearest-neighbor search server-side using an approximate algorithm (HNSW) instead of a linear scan.

### One-time setup (required — this can't be done from code)
1. In Atlas, open your cluster → **Search** tab → **Create Search Index** → JSON Editor.
2. Target the `chunks` collection.
3. Paste the contents of `config/atlasVectorSearchIndex.json` as the index definition.
4. Name it `vector_index` (or update the `index` value in `ragService.findRelevantChunksAtlas` if you name it differently).
5. Wait for the index to finish building (a few minutes) before testing chat.

### What changed in code
- `ragService.findRelevantChunksAtlas(queryEmbedding, documentId, userId, topK)` runs a `$vectorSearch` aggregation stage against the `chunks` collection, filtered to the requesting user and document.
- `chatController.askQuestion` now **tries Atlas Search first**, and falls back to the Step 11 brute-force method if the index isn't set up yet (e.g. you haven't done the Atlas setup above) or Atlas Search isn't available on your cluster tier. This means the chat feature works immediately in local dev, and gets faster automatically once you configure the index — no code changes needed to "turn it on."

### What are embeddings, again
An embedding is a list of numbers (1536 of them here) that represents the *meaning* of a piece of text as a point in space. Text with similar meaning ends up as nearby points, regardless of exact wording — "car" and "automobile" land close together even though they share no letters.

### How vector search improves answers
Brute-force cosine similarity and Atlas Vector Search compute the *same* similarity metric — the difference is purely about **how the search is executed**, not the quality of an individual match:
- Brute-force checks every single chunk, one at a time, in application memory. Cost grows linearly with the number of chunks — fine for one document, slow across thousands of documents shared by many users.
- Atlas Vector Search uses an index (HNSW graph) built ahead of time, so a query only touches a small fraction of the total vectors to find the approximate nearest neighbors — sub-linear cost, and it runs inside the database rather than pulling every vector across the network into your server first.

The practical effect: as StudyMate AI accumulates more documents and users, chat responses stay fast with Atlas Search, whereas the brute-force path would get progressively slower.

## AI study planner (Step 13)

| Method | Route              | Auth required | Body                                                        |
|--------|-----------------------|----------------|-------------------------------------------------------------|
| POST   | /api/study-plan     | Yes            | `{ subjects: string[], dailyHours: number, examDate: "YYYY-MM-DD" }` |
| GET    | /api/study-plan       | Yes            | —                                                              |
| GET    | /api/study-plan/:id    | Yes            | —                                                              |
| DELETE | /api/study-plan/:id    | Yes            | —                                                              |

**Example**
```bash
curl -X POST http://localhost:5000/api/study-plan \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"subjects": ["Operating Systems", "DBMS", "Networks"], "dailyHours": 4, "examDate": "2026-09-15"}'
```

Response schedule shape (one entry per day):
```json
{
  "date": "2026-08-16",
  "topics": [
    { "subject": "Operating Systems", "topic": "Process scheduling", "hours": 2, "priority": "high" },
    { "subject": "DBMS", "topic": "Normalization", "hours": 2, "priority": "medium" }
  ],
  "revision": false
}
```

### Logic
1. **Day count** — `aiService.daysUntil(examDate)` computes the exact number of days between today and the exam, inclusive, in plain JS date math. This is handed to the model as a number rather than asking the LLM to compute it itself — models are unreliable at date arithmetic, so doing it in code removes an entire class of errors.
2. **Prompting** — the model receives the subject list, daily hour budget, and exact day count, with explicit rules: don't exceed the daily hour budget, front-load priority based on subject order, and reserve the final ~10–15% of days for revision rather than new topics.
3. **Validation** — same defensive JSON parsing as the other AI features (strips markdown fences, throws with the raw response if parsing fails), plus a check that `schedule` is a non-empty array before saving.
4. The plan is saved to a `StudyPlan` document linked to the user, so it persists and can be revisited without regenerating it.

## How the pieces fit together (JWT flow)

1. `authController.register` creates a `User` — the model's `pre("save")` hook hashes the password with bcrypt before it touches the database.
2. `generateToken` signs a JWT containing the user's id, using `JWT_SECRET`.
3. The client stores that token and sends it as `Authorization: Bearer <token>` on future requests.
4. `authMiddleware.protect` verifies the signature and expiry on every protected route, attaching the decoded user id to `req.user`.
5. `authController.getMe` uses `req.user.id` to fetch and return the current user.

## Next steps

The full roadmap (Steps 2–19) is complete. See:
- `../frontend/` — React + Tailwind + Redux Toolkit frontend, wired to this API
- `tests/` — Jest + Supertest suite (`npm test`)
- `DEPLOYMENT.md` — Vercel + Render + Atlas deployment guide
- `INTERVIEW_PREP.md` — Q&A covering Node.js, MongoDB, JWT, AI integration, RAG, vector search, and system design, grounded in this actual codebase
