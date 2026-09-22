# Café Tyrol Beer Wiki

Beer rating site for the group, live at https://tyrolwiki.pages.dev.

- **Frontend:** Vite + React, all in `src/App.jsx`.
- **Backend:** Cloudflare Pages Functions in `functions/api/`, D1 database `tyrolwiki` (`schema.sql`).
- **Recommendations:** Vínbúðin catalog + per-store stock via their search API, tasting notes scraped from product pages, scored as described in `algorithm explanation.txt`.
- **Deploy:** push to `main` → GitHub Action runs `wrangler pages deploy`.

## Local dev

```bash
npm install
npx wrangler d1 execute tyrolwiki --local --file schema.sql
npm run build && npm run pages:dev
```

Then in the UI press **Sync Vínbúðin** (fetches the catalog and stock, then enriches flavor tags).
