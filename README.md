<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/e2e79769-a7a2-4a12-86e8-fd8bcf718a56

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Admin email notifications

New marketplace orders and custom CAD requests are emailed to every authorized admin by a Firebase Firestore trigger. The website still stores and displays each record normally.

To enable email delivery, see [functions/README.md](functions/README.md). You will need a verified Resend sender address, a `RESEND_API_KEY` Firebase secret, and a Firebase project with Cloud Functions enabled. The triggers are not active until the `functions` package is deployed with `npm run deploy`.
