# KIRUU Cyber Academy — Render deployment

A single-folder Node/Express app with a cyberpunk learning portal, access-key login, admin control panel, key creation/disable/delete, announcement editor, progress roadmap, and a tutor endpoint.

## Deploy on Render
1. Upload the contents of this folder to a GitHub repository (all files at repository root; no `public` folder needed).
2. In Render choose **New + → Web Service**, connect the repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add Environment variables:
   - `ADMIN_PASSWORD` = choose a strong private password (recommended; overrides the demo fallback)
   - `SESSION_SECRET` = a long random secret
   - `OPENAI_API_KEY` = optional, to enable provider-backed live AI
   - `OPENAI_MODEL` = optional, default `gpt-4o-mini`
   - `OPENAI_BASE_URL` = optional, default `https://api.openai.com/v1/chat/completions`
6. Deploy. Visit your Render URL. Click **ADMIN ACCESS**, sign in, generate keys, then share a key with each learner.

## Important
- Demo admin password fallback is `.ambi@0000` because requested. For a public site, set a unique `ADMIN_PASSWORD` in Render Environment immediately; anyone who knows the fallback could attempt admin access.
- Without `OPENAI_API_KEY`, the tutor runs in starter/offline guidance mode, not a full general AI. A provider API account and usage billing may be required. Never place the API key in `app.js` or `index.html`; server-side Environment only.
- JSON storage (`data.json`) is suitable for a demo. Some Render instances have ephemeral storage, so generated keys/settings may reset on redeploy/restart unless you attach a persistent disk or replace storage with a managed database.
- This is an educational ethical-cybersecurity platform, not a hacking tool. It does not perform unauthorized access, exploit targets, steal credentials, or run commands on visitors' devices.
- Instagram button links to the supplied profile. It cannot make Instagram content "live" inside the page without Instagram's own embed/API permissions.
- Owner branding: KIRAN / KIRUU.
