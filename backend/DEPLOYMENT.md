# Deploying StudyMate AI (Step 18)

Three pieces to deploy: **frontend** (Vercel), **backend** (Render or AWS), **database** (MongoDB Atlas, which you're already using from Step 4).

---

## 1. MongoDB Atlas (database)

You already have this running from Step 4. Before going to production:
- In Atlas → Network Access, allow `0.0.0.0/0` (or your host's specific egress IPs) so your deployed backend can connect. Restricting to specific IPs is more secure if your host provides static IPs.
- In Atlas → Database Access, make sure the database user's password doesn't contain characters that need URL-encoding in the connection string (`@`, `:`, `/`, etc.) — or encode them if it does.
- Confirm the Atlas Vector Search index (Step 12) shows as **Active**, not just created.

## 2. Backend deployment (Render)

Render is the simplest option for a Node/Express API — free tier available, no Dockerfile required.

1. Push the `backend/` folder to a GitHub repo.
2. In Render: **New → Web Service** → connect the repo.
3. Settings:
   - **Root Directory**: `backend` (if the repo contains both frontend and backend)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
4. Add every variable from `.env.example` under Render's **Environment** tab:
   - `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `OPENAI_API_KEY`
   - `CLIENT_URL` — set this to your **deployed frontend URL** (e.g. `https://studymate-ai.vercel.app`), not `localhost`, or CORS will block every request from the deployed frontend.
   - `NODE_ENV=production`
5. Deploy. Render gives you a URL like `https://studymate-ai-backend.onrender.com`.

**Alternative: AWS** (more control, more setup) — typically Elastic Beanstalk or an EC2 instance behind a load balancer, with the same environment variables set via the AWS console or a `.ebextensions` config. Render is recommended for getting this project running quickly; move to AWS later if you need more infrastructure control.

## 3. Frontend deployment (Vercel)

1. Push the `frontend/` folder to the same or a separate GitHub repo.
2. In Vercel: **New Project** → import the repo.
3. Settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite (auto-detected)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
4. Add environment variable:
   - `VITE_API_URL` = your deployed backend URL + `/api` (e.g. `https://studymate-ai-backend.onrender.com/api`)
5. Deploy. Vercel gives you a URL like `https://studymate-ai.vercel.app`.
6. **Go back to Render** and update `CLIENT_URL` to this exact Vercel URL, then redeploy the backend — CORS is checked against this value on every request.

## Build commands summary

| Service  | Build command    | Start command |
|----------|--------------------|------------------|
| Backend  | `npm install`      | `npm start`       |
| Frontend | `npm install && npm run build` | served as static files from `dist/` |

## Production checklist

- [ ] `JWT_SECRET` is a long random string, not the placeholder from `.env.example` (`openssl rand -hex 32`)
- [ ] `NODE_ENV=production` set on the backend (disables verbose Morgan logging)
- [ ] `CLIENT_URL` on the backend exactly matches the deployed frontend origin (no trailing slash mismatch)
- [ ] `VITE_API_URL` on the frontend points to the deployed backend, not `localhost`
- [ ] MongoDB Atlas Network Access allows the backend host's IP(s)
- [ ] Atlas Vector Search index is Active (Step 12)
- [ ] Cloudinary and OpenAI keys are production keys with usage limits/budget alerts set, not personal dev keys with no cap
- [ ] `.env` is in `.gitignore` and was never committed — check with `git log --all --full-history -- backend/.env`
- [ ] Test the full flow end-to-end against the deployed URLs: register → upload → summarize → quiz → chat → study plan

## Security settings

- **Helmet** is already applied (Step 3) — sets secure HTTP headers by default.
- **CORS** is locked to a single `CLIENT_URL` origin — don't widen this to `*` in production, or any site can call your authenticated API from a user's browser.
- **Rate limiting** isn't in this build — for production, add `express-rate-limit` on `/api/auth/*` at minimum, to slow down credential-stuffing attempts.
- **JWT expiry** — the `.env.example` default is 7 days. Shorter-lived tokens (e.g. 1 day) plus a refresh-token flow is more secure for a real deployment, though it adds complexity beyond this project's scope.
- Never log full request bodies in production — Morgan's `"dev"` format (used here) logs method/path/status only, not bodies, so passwords aren't written to logs.
