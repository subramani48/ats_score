# ATS Analyzer: website

Next.js 16 (App Router) front end for the ATS Resume Analyzer. See the [main README](../../README.md) for the whole project.

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run typecheck
npm run build
```

- Pages live in `src/app` (`dashboard/...` for the signed-in area); shared pieces in `src/components`.
- All calls to the API go through `src/lib/api.ts`. Set `NEXT_PUBLIC_API_URL` to the API address (default `http://localhost:5000`).
- Login state (token and user) is kept in `src/stores/analysisStore.ts`.
