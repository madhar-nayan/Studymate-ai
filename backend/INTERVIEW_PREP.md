# StudyMate AI — Interview Preparation (Step 19)

Questions an interviewer might ask about this project, organized by topic, with answers grounded in what you actually built (Steps 2–13). Read through once, then try answering out loud without looking — that's what surfaces gaps.

---

## Node.js & Express

**Q: Walk me through what happens when a request hits `POST /api/auth/login`.**
A: Express matches the route in `authRoutes.js`, which has no `protect` middleware on login (you're not authenticated yet). It calls `authController.login`, which looks up the user by email with `.select("+password")` (the schema excludes password by default), compares the submitted password against the stored bcrypt hash via the model's `comparePassword` method, and if it matches, signs a JWT with `generateToken` and returns it plus the user object (without the password).

**Q: Why use MVC-style folders (controllers/routes/models) instead of putting everything in one file?**
A: Separation of concerns — routes just map HTTP verbs+paths to handlers; controllers hold business logic; models own data shape and validation. It also makes the codebase testable in isolation, which is exactly what the Jest test suite (Step 17) relies on: mocking `models/Document.js` lets you test `documentController.js` logic without a real database.

**Q: What does `helmet` actually do?**
A: Sets a collection of HTTP response headers that reduce common attack surface — e.g. `X-Content-Type-Options: nosniff` to stop MIME-sniffing, disabling `X-Powered-By` so you don't advertise you're running Express, and a baseline Content-Security-Policy. It's not a substitute for input validation, just a sensible default hardening layer.

**Q: Why is there a centralized error handler at the bottom of `app.js` instead of try/catch everywhere?**
A: There's still try/catch in each controller for expected errors (bad input, not found), but the final `(err, req, res, next)` handler is a safety net for anything unexpected — like a Multer file-size error — so the server never crashes with an unhandled exception and always returns a JSON error instead of leaking a stack trace to the client.

## MongoDB & Mongoose

**Q: Why does the `User` model's password field have `select: false`?**
A: So a normal `User.findById(...)` never accidentally includes the password hash in an API response. You only get it back when you explicitly opt in with `.select("+password")`, which is exactly what `login` does — this makes leaking password hashes require a deliberate line of code, not an oversight.

**Q: How does the app connect to MongoDB, and what happens if the connection fails?**
A: `config/database.js` calls `mongoose.connect(MONGO_URI)` once at startup. If it fails, the catch block logs the error and calls `process.exit(1)` — the app refuses to start half-broken rather than accepting requests it can't actually serve. There are also `mongoose.connection.on("error"/"disconnected")` listeners for issues that happen after startup (network blip, credential rotation).

**Q: Explain the relationship between `Document`, `Chunk`, and `Quiz`.**
A: All three reference `User` (ownership) via `ObjectId` refs. `Chunk` also references `Document` — each document, once indexed for RAG (Step 11), is split into many `Chunk` records, each with its own embedding vector. `Quiz` also references `Document`, since a quiz is generated from one document's `extractedText`. This is a fairly standard one-to-many relational shape, just modeled in MongoDB with references instead of foreign keys.

**Q: Why store `embedding` as a plain array of numbers on the `Chunk` schema instead of a separate table?**
A: MongoDB is document-oriented — embedding the vector directly on the chunk it describes avoids a join/lookup and is exactly the shape Atlas Vector Search expects when you point an index at a field. A separate collection would only make sense if the same embedding needed to be shared across multiple chunks, which isn't the case here.

## JWT & Authentication

**Q: Explain the full JWT flow in this project, end to end.**
A: On register or login, the server signs a JWT (`{ id: user._id }`, signed with `JWT_SECRET`, expiring per `JWT_EXPIRES_IN`) and returns it. The client stores it (this project's frontend keeps it in `localStorage`) and sends it as `Authorization: Bearer <token>` on every subsequent request. `authMiddleware.protect` runs before any protected controller, verifies the signature and expiry with `jwt.verify`, and — if valid — attaches the decoded payload to `req.user` so the controller knows who's calling without hitting the database again just to check identity.

**Q: What's actually inside the JWT payload, and is it secure to put user data there?**
A: Just `{ id: userId }` here — deliberately minimal. JWT payloads are Base64-encoded, **not encrypted** — anyone with the token can decode and read the payload (though they can't forge a new valid signature without the secret). That's why nothing sensitive (like the password hash) goes in the payload; it's just enough to look the user up.

**Q: What's the tradeoff of JWTs being stateless?**
A: No database lookup needed to verify a request — the signature alone proves validity, which scales well. The downside: you can't easily revoke a single token before it expires (there's no server-side session to delete). Common mitigations — a short-lived access token plus a refresh token, or a server-side denylist for revoked tokens — weren't needed for this project's scope but are the standard answer if asked how you'd harden it.

**Q: How does `localStorage` vs an httpOnly cookie change the security profile here?**
A: This project stores the JWT in `localStorage`, which is simple and works well with a separate frontend/backend (no cookie/CORS complexity), but is readable by any JS running on the page — so it's vulnerable to XSS if an attacker gets script execution. An httpOnly cookie can't be read by JS at all (mitigates XSS token theft) but introduces CSRF risk and needs `SameSite`/CORS configured carefully. Given time, an httpOnly cookie is the more defensible production choice.

## AI API Integration

**Q: Why did every AI prompt in this project ask for strict JSON output?**
A: Free-form text from an LLM is hard to parse reliably — you'd be regex-scraping a summary out of prose. Asking for a fixed JSON shape (`{ summary, keyPoints, keyConcepts }` for Step 9, an array of MCQ objects for Step 10) means the response can go straight into `JSON.parse` and then directly into the database, with one consistent parsing/error path shared across every AI feature.

**Q: What happens if the model doesn't return valid JSON, or wraps it in markdown fences?**
A: `aiService.js` strips leading/trailing ` ```json ` fences defensively before parsing (models sometimes add them even when told not to), then attempts `JSON.parse` in a try/catch. If it still fails, the error includes the first 200 characters of the raw response, so you can see exactly what went wrong instead of a generic "something broke."

**Q: In the quiz generator, what stops the AI from returning a broken question — like an answer that doesn't match any of the 4 options?**
A: Two layers. First, `aiService.generateQuiz` explicitly validates each question after parsing — checks `options.length === 4` and that `answer` is one of the options — and throws immediately if not, before it ever reaches the database. Second, the `Quiz` Mongoose schema itself has a validator requiring exactly 4 options, as defense in depth in case something bypassed the service-layer check.

**Q: Why truncate `extractedText` to ~12,000 characters before summarizing?**
A: To stay within a reasonable token budget for a single prompt and control cost/latency. It's an honest limitation — long documents lose content past that cutoff. The proper fix for long documents is exactly what RAG (Steps 11–12) does instead: don't send the whole document in one prompt, retrieve only the relevant chunks for a given question.

## RAG (Retrieval-Augmented Generation)

**Q: Explain RAG in this project, step by step.**
A: 1) Chunking — split extracted text into ~1000-character windows with 150-character overlap, so ideas aren't severed at chunk boundaries. 2) Embedding — each chunk goes through OpenAI's `text-embedding-3-small`, producing a 1536-dimensional vector representing its meaning. 3) Storage — chunk + vector saved as a `Chunk` document. 4) Retrieval — when a question comes in, it's embedded the same way, then compared against every stored chunk's vector to find the most similar ones. 5) Generation — the top matches are inserted into a prompt that instructs the LLM to answer only from that context, and to say so if the context is insufficient rather than guessing.

**Q: Why chunk with overlap instead of just splitting text into clean, non-overlapping blocks?**
A: A sentence or idea that straddles the exact boundary between two chunks gets cut in half in both — neither chunk fully captures it, so it might not surface for a relevant query. A 150-character overlap means the tail of one chunk reappears at the start of the next, so boundary-spanning content isn't lost.

**Q: What's "grounding," and why does it matter for a study assistant?**
A: Grounding means the model's answer is constrained to a specific, retrieved source rather than its general training knowledge — the prompt explicitly says to answer only from the provided excerpts and to admit when they're insufficient. For a study tool, this matters because a student needs answers that reflect *their own notes*, not the model's possibly-different or outdated general knowledge of the topic — and it reduces hallucination since the model isn't free to invent facts.

**Q: How would you handle a question whose answer needs information spread across an entire document, not just a few chunks?**
A: Increasing `topK` (currently 4) gets more chunks into context but costs more tokens and can dilute relevance. A more scalable answer is hierarchical: also summarize the whole document (Step 9 already does this) and include that summary as an additional, cheaper piece of context alongside the retrieved chunks, or use a map-reduce style multi-pass summarization for genuinely document-spanning questions.

## Vector Databases & Atlas Vector Search

**Q: What is a vector embedding, in plain terms?**
A: A list of numbers that represents the *meaning* of a piece of text as coordinates in a high-dimensional space. Text with similar meaning ends up as nearby points — "car" and "automobile" are close together even though they don't share letters — because the embedding model was trained to place semantically related text close together.

**Q: What's the difference between the brute-force similarity search in Step 11 and Atlas Vector Search in Step 12?**
A: Same underlying math (cosine similarity), different execution. Brute-force pulls every chunk's vector into the Node process and scores them one by one in JavaScript — cost grows linearly with the number of vectors, and it doesn't scale past one document's worth of chunks. Atlas Vector Search builds an HNSW (Hierarchical Navigable Small World) index ahead of time and does an *approximate* nearest-neighbor search server-side, touching only a fraction of the total vectors — sub-linear cost, and the heavy lifting happens inside the database instead of after pulling everything over the network.

**Q: Why "approximate" nearest neighbor instead of exact?**
A: At scale, finding the mathematically exact top-K nearest vectors among millions requires checking all of them (same problem as brute-force, just bigger). Approximate methods like HNSW trade a small amount of accuracy (occasionally missing the true single best match) for a massive speed gain, and in practice the approximate top-K is nearly always good enough — especially when you're retrieving 4 chunks, not just 1.

**Q: This project falls back to brute-force if Atlas Search fails — why build that in?**
A: Local development often doesn't have the Atlas Search index configured yet (it's a manual setup step in the Atlas UI, not something `npm install` gives you). Falling back means the chat feature works immediately out of the box, and silently gets faster the moment you set up the index in production — no code change required to "turn on" the better path.

## System Design

**Q: If StudyMate AI had 100,000 users, what would you change first?**
A: A few things, roughly in priority order: (1) Add caching for repeated AI calls — e.g. don't re-summarize a document that hasn't changed. (2) Move long-running AI operations (indexing a large document, generating a quiz) off the request/response cycle into a background job queue, so uploads don't time out waiting on OpenAI. (3) Add rate limiting per user on AI endpoints — they're the most expensive to abuse. (4) Confirm the Atlas cluster tier supports the read/write and vector search load, and consider read replicas.

**Q: Where are the security-sensitive points in this system, and how are they handled?**
A: Password storage (bcrypt hashing, never stored or returned in plaintext), authentication (JWT signature verification on every protected route), file upload (Multer's `fileFilter` restricts MIME types, plus a 10MB size cap, to limit what can be pushed through the pipeline), and CORS (locked to a single configured frontend origin, not `*`). The one gap worth naming honestly: there's no rate limiting yet, which would be the next thing added before a real production launch.

**Q: Why Cloudinary for file storage instead of storing files directly in MongoDB or on the server's disk?**
A: MongoDB documents have a 16MB size limit and aren't designed for large binary blobs — storing files there bloats the database and hurts query performance. Local disk storage doesn't survive a redeploy on most hosting platforms (the filesystem is ephemeral) and doesn't scale across multiple server instances. Cloudinary is purpose-built object storage — the server just stores a URL reference, keeping the database lean.

---

## Practice tip

Pick 5 questions from this list at random and answer them out loud, in under 90 seconds each, without re-reading your own README first. If you stumble, that's the exact spot to review — not the whole doc again.
