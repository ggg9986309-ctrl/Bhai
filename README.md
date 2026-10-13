# KIRUU GLORY BOT — Render deployment

This updates the existing KIRUU Cyber Academy project in place. It keeps the same single-page cyberpunk shell and changes the unlocked terminal to a local, no-paid-API BGMI/Free Fire Glory Bot.

## Files
- `server.js` — Express API, access keys, server-side credits, UC request queue and admin controls.
- `index.html`, `style.css`, `app.js` — existing website interface and interactions.
- `data.json` — starter data (new users start at 0 credits).

## GitHub update
Upload/replace these files in the same repository. Keep the existing `package.json`. Render should run `npm install` and `npm start`.

## Render Environment
Set `ADMIN_PASSWORD` to a strong, new password and set `SESSION_SECRET` to a long random secret. Do not publish either value in GitHub. The fallback password in the source is only for legacy compatibility; set the environment variable before public use.

## Features
- Access-key login and key management
- Each new access key begins with 0 credits; admin can set credits to any non-negative whole number
- UC package request form sends an order request to the owner; it does not take payment or claim automatic UC delivery
- Admin can edit listed package prices and update order status
- Built-in preset Glory Bot responses work without OpenAI API credits

## Important persistence note
`data.json` storage is fine for a demo, but Render filesystems may be ephemeral across deploys/restarts. For persistent live use, attach a Render persistent disk or migrate the data to a database. Never use this starter JSON store for high-value balances or payments without proper database transactions and audit logs.


## Free Fire UID lookup
The app includes a server-side UID lookup using an unofficial third-party profile API. It is not affiliated with Garena and can stop working or return incomplete results. It does not require OpenAI and the Glory Bot answers locally from preset tips. You can override the profile API base URL in Render with `FREEFIRE_API_BASE` if you use a different compatible provider.

## Required Render environment
Set a strong `ADMIN_PASSWORD` and a long random `SESSION_SECRET` in Render Environment. Do not put secrets in GitHub. The default JSON file storage can be lost on some hosting deployments; use persistent storage/database before relying on long-term order history.
