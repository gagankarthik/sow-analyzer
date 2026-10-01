# Blue-IQ (web)

The Next.js front end for Blue-IQ, a contract-review product for SOWs, MSAs and
amendments. It extracts clauses, scores them against a playbook, tracks contract
value across amendments, and drafts a new SOW from a short questionnaire.

Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, TanStack Query,
Recharts and Amazon Cognito sign-in. Analysis runs in a separate backend that
this app calls over REST.

## Run it

Needs Node.js 20.9 or newer and npm.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

## Environment

`.env.example` lists every variable with comments. `NEXT_PUBLIC_*` values are
inlined at build time, so they must be set when `npm run build` runs.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | yes | Backend API Gateway base URL, no trailing slash |
| `NEXT_PUBLIC_SITE_URL` | in production | Public origin, used for canonical URLs, Open Graph, `sitemap.xml` and `robots.txt`. Falls back to `http://localhost:3000` |
| `NEXT_PUBLIC_COGNITO_REGION` | yes | Cognito region |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | yes | Cognito user pool |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | yes | Cognito app client (no secret) |
| `OPENAI_API_KEY` | for `/draft` | Server-only key for the SOW drafter |
| `OPENAI_MODEL`, `OPENAI_BASE_URL` | no | Override the model or use a compatible gateway |
| `AI_PROVIDER`, `GUARDRAILS_ENABLED`, `REDACT_CLASSES` | no | Drafting guardrails, see `lib/sow/guardrails.ts` |

Never commit `.env.local`.

## Deploy

The app is a standard Next.js server and runs on any Node host or container.

```bash
npm ci
npm run build   # with the environment variables above set
npm run start   # listens on $PORT, default 3000
```

The route handlers in `app/api/sow/*` need the Node.js runtime and the
server-only variables at run time. Set `NEXT_PUBLIC_SITE_URL` to the production
domain before building, otherwise canonical URLs and the sitemap point at
localhost.

## Layout

```
app/                 routes: public pages, (auth) sign-in, (app) signed-in workspace
app/api/sow/         SOW draft and revise route handlers
app/sitemap.ts       sitemap.xml, with robots.ts, manifest.ts, opengraph-image.tsx
components/landing/  public pages
components/shell/    signed-in app frame
components/charts/   Recharts visualisations
lib/seo.ts           site URL, page metadata and JSON-LD
lib/sow/             SOW drafter: prompt, model client, guardrails
lib/clause-types.ts  the clause taxonomy shared by the app and the public pages
proxy.ts             redirects signed-out visitors away from the workspace
```
