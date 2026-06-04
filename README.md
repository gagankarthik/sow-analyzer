# Blue-IQ — Contract Intelligence (web)

The Next.js workspace where Legal, Sales, Finance, and Procurement work the same
contract. Upload a SOW, MSA, or amendment and Blue-IQ extracts every clause,
scores risk, reconciles contract value across amendments, and answers questions
grounded in the document. You can also **draft a new SOW with AI** from a short
questionnaire and export it to Word.

Built with Next.js 16 (App Router), React 19, Tailwind v4, TanStack Query,
Recharts, and Cognito auth. The heavy analysis pipeline lives in the separate
backend repo (`sow-analyser-backend`); this app talks to it over a REST API.

## Features

- **Contract analysis** — clause extraction (13 clause types), risk scoring,
  key findings, and an executive summary, all surfaced per document and rolled
  up per project.
- **Original vs. amendments** — uploaded documents are linked into a family; the
  original SOW and each amendment are labelled, diffed, and the **contract value
  increase/decrease** is computed and visualised (bar, pie, and value-journey
  charts in the project overview).
- **Sonar Inetelligance** — RAG chat grounded in a contract's clauses, with citations.
- **Draft a SOW with AI** (`/draft`) — answer a guided questionnaire, Bluey drafts
  a complete SOW, you edit it (preview or source) or ask Bluey to revise it in
  plain English, then download a `.docx`.
- **Clause Intelligence taxonomy** — a single source of truth in
  clauses shared by the landing page and the drafter.

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

### Environment

Copy your values into `.env.local`. The analysis features talk to the backend
API and Cognito:

```
NEXT_PUBLIC_API_URL=https://<api-gateway-id>.execute-api.<region>.amazonaws.com
NEXT_PUBLIC_TENANT_ID=default
NEXT_PUBLIC_COGNITO_REGION=<region>
NEXT_PUBLIC_COGNITO_USER_POOL_ID=<pool-id>
NEXT_PUBLIC_COGNITO_CLIENT_ID=<client-id>
```

#### AI SOW drafter

The `/draft` feature calls OpenAI **server-side** through the route handlers in
`app/api/sow/*`, so the key never reaches the browser. Add your key:

```
OPENAI_API_KEY=sk-...            # required for AI drafting / revision
# OPENAI_MODEL=gpt-4.1-mini      # optional; this is the default
# OPENAI_BASE_URL=...            # optional; for Azure/OpenAI-compatible gateways
```

Restart `npm run dev` after adding the key. Without it, the drafter shows a
clear setup hint instead of failing silently. `OPENAI_*` variables are **not**
prefixed with `NEXT_PUBLIC_`, so they stay on the server.

## How the AI SOW drafter works

1. `app/(app)/draft/page.tsx` collects answers (engagement, scope, deliverables,
   timeline, commercials, and which clause types to include).
2. `POST /api/sow/draft` builds a grounded prompt (`lib/sow/prompt.ts`) and calls
   `gpt-4.1-mini` (`lib/sow/openai.ts`). The model uses **only** the facts you
   provide and marks anything missing as `[TBD: …]` — nothing is fabricated.
3. The draft renders as editable Markdown. `POST /api/sow/revise` applies
   plain-English changes and returns the full updated document.
4. `lib/docx.ts` converts the Markdown to a real `.docx` (a hand-built OOXML
   package zipped with a dependency-free stored-ZIP writer) for download.

## Project layout

```
app/                  routes (App Router); (app) = authed shell, (auth) = login
app/api/sow/          OpenAI-backed draft + revise route handlers
components/charts/    Recharts visualisations (risk, contract value, …)
lib/clause-types.ts   the 13-type clause taxonomy (shared)
lib/contract-value.ts running-total model: SOW base + amendment deltas
lib/sow/              SOW drafter: types, prompt, OpenAI client, browser calls
lib/docx.ts           Markdown → .docx exporter
lib/markdown.ts       small Markdown parser shared by the preview and exporter
```

## Scripts

```bash
npm run dev      # local dev server
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint
```

## Deploy

Any platform that runs Next.js (Vercel, Amplify Hosting, a Node server). Set the
same environment variables in the host. The route handlers run on the Node.js
runtime, so `OPENAI_API_KEY` must be present in the server environment.
