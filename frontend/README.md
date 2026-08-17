# StudyMate AI — Frontend (Steps 14–16)

React + Vite + Tailwind CSS v4 + React Router + Redux Toolkit + Axios, wired to the backend in `../backend/`.

## Setup

1. `cd frontend && npm install`
2. Copy `.env.example` to `.env` and set `VITE_API_URL` (defaults to `http://localhost:5000/api` if omitted)
3. `npm run dev` — starts at `http://localhost:5173`

Make sure the backend (`../backend`) is running first — the frontend has nothing to talk to otherwise.

## Structure

```
src/
├── api/axios.js          # Axios instance: attaches JWT to every request,
│                           redirects to /login on a 401
├── redux/
│   ├── store.js
│   └── slices/
│       ├── authSlice.js       # login, register, logout, persists token/user to localStorage
│       ├── documentsSlice.js  # fetch, upload, delete documents
│       └── quizSlice.js       # fetch, generate quizzes
├── components/
│   ├── AppLayout.jsx      # sidebar + content shell for all protected pages
│   ├── Sidebar.jsx
│   └── ProtectedRoute.jsx # redirects to /login if not authenticated
├── pages/
│   ├── LoginPage.jsx / RegisterPage.jsx
│   ├── DashboardPage.jsx       # overview + recent documents
│   ├── UploadPage.jsx          # upload, list, summarize documents (Steps 7, 9)
│   ├── ChatPage.jsx             # RAG chat: index a document, then ask questions (Step 11-12)
│   ├── QuizListPage.jsx         # generate a quiz from a document (Step 10)
│   ├── QuizTakePage.jsx         # answer questions, see grading + explanations
│   ├── StudyPlanPage.jsx        # AI study planner (Step 13)
│   └── ProfilePage.jsx          # update/delete account (Step 6)
└── App.jsx                # routes
```

## How auth flows through the frontend

1. `LoginPage`/`RegisterPage` dispatch `authSlice` thunks, which POST to the backend and receive `{ token, user }`.
2. Both are saved to `localStorage` and into Redux state.
3. `api/axios.js`'s request interceptor reads the token from `localStorage` and attaches it as `Authorization: Bearer <token>` on every subsequent API call — no need to pass it manually in each component.
4. `ProtectedRoute` checks Redux state for a token; if absent, it redirects to `/login`.
5. If the backend ever returns 401 (expired/invalid token), the response interceptor clears storage and forces a redirect to `/login`, so the app never sits in a broken half-authenticated state.

## Design notes

The visual direction ("study loft"): warm paper background, deep moss green for primary actions, a warm amber "desk lamp glow" as the one recurring signature element behind AI-related headers and loading states — a nod to studying by lamplight rather than the generic AI-app look. Fraunces (serif) for headings, Inter for UI text, IBM Plex Mono for small data labels (file types, timestamps, tags).

## Build for production

```bash
npm run build
```
Outputs static files to `dist/` — deploy this to Vercel (see `../backend/DEPLOYMENT.md`).
