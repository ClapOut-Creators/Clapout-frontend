# Layout Boundary

The app shell lives here: `sidebar/` (authenticated chrome) and `public/` (public navbar/footer/links). `app.ts` composes these directly.

Layout is independent of features — it has no feature imports — and is distinct from `shared/`, which holds reusable pieces features opt into rather than app-shell chrome.
