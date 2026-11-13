# Thunder Vikes 3D Print Store

Online store and custom-print request portal for the Hueneme High School Robotics & Coding Lab (Room Q10).

**Stack:** React 19 + Vite 6 + Tailwind 4 · Firebase Auth + Firestore (+ Storage for CAD photos) · Netlify hosting + Netlify Functions.

## Project layout

| Path | Purpose |
|---|---|
| `src/App.tsx` | Picks which view to show from `activeView` (no URL router). |
| `src/context/LabContext.tsx` | All auth, roles, live Firestore data, and database writes. |
| `src/components/` | One file per screen/panel (Shop, Merch, Request, Workbench, Manage...). |
| `src/lib/` | Firebase setup, workflow stages, merch categories, image upload. |
| `netlify/functions/` | Server code: guest shop estimates and admin invitations. |
| `firestore.rules`, `storage.rules` | Database / file security rules. |
| `functions/` | Optional Firebase Cloud Functions (email alerts; needs Blaze plan). |

**Product photos** are uploaded from the Add/Edit Product form, resized in the browser (max 1600px), and stored in **Netlify Blobs** (store `listing-images`) by `netlify/functions/listing-image-upload.mjs`. Only admins/teachers/approved class students can upload. Photos are served by `/.netlify/functions/listing-image?key=...`. No Firebase Storage needed. (CAD request photos still use Firebase Storage.)

## What deploys where

| Change | How it goes live |
|---|---|
| Anything in `src/`, `public/`, `netlify/`, `netlify.toml`, `package.json` | `git push` to `main` → Netlify builds automatically. |
| `firestore.rules` | **Not deployed by Netlify.** Paste into Firebase Console → Firestore → Rules → Publish. |
| `storage.rules` | **Not deployed by Netlify.** Firebase Console → Storage → Rules → Publish. |
| `functions/` | Only via `firebase deploy --only functions` (Blaze plan). |

## Netlify environment variables

| Variable | Scope | Used by |
|---|---|---|
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | **Builds** | Website (baked in at build time) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Functions (secret) | Netlify Functions |
| `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL` | Functions (secret) | Admin emails |

Changing a variable requires a new deploy (Deploys → Trigger deploy).

## Working in Codespaces

```bash
npm install
npm run lint     # type check
npm run build    # must pass before pushing
git add -A && git commit -m "Describe change" && git push origin main
```

`npm run dev` does not run Netlify Functions (guest estimates, admin invites). Test those on the deployed site or with `npx netlify dev`.

**Applying a ZIP update:** upload it to the repo root (next to `package.json`) and run `unzip -o file.zip`. Then check `git status`: changed files must show as `src/...`, not inside a new folder.
