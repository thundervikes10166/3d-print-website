# Thunder Vikes: guest shop estimates without Firebase Blaze

This patch is for the React/Vite 3D Print Store, on top of the **Store Management Patch**.
It does not replace the separate Astro Thunder Vikes team website.

## What changes

- Any visitor can submit a quote request for a published SHOP item without creating an account.
- The form collects first and last name, email and/or phone, preferred contact method, color, quantity and notes.
- The team must **contact the customer to confirm the estimate and order before printing**. This does not authorize automatic printing or automatic payment.
- The success screen provides a request reference and pickup instructions: **Hueneme High School, Room Q10**, once the team says the print is ready.
- The request is stored in the existing Firestore `orders` collection, visible in **Admin > Shop Orders / Print Status** with the normal production stages and history.
- A signed-in user still sees the estimate in their purchase history. A guest does not get online purchase-history access; team members can find the request using its reference number.
- Netlify Functions, not Firebase Cloud Functions, creates the request. No Firebase Blaze plan needed for this **shop estimate** feature.
- Optional administrator notification emails use Resend from the Netlify Function. The request is saved even if email notifications are not configured.

## Important security design

**Do not** loosen Firestore rules to `allow create: if true`. The frontend cannot write guest orders directly to Firestore. The Netlify server validates requests, reads the published listing itself (not the price/title sent from the browser), rate-limits requests using a hashed IP address, and saves an order with Firebase Admin credentials. Keep your current `firestore.rules` and your existing admin role protections. No access to customer purchase history is granted to guests.

The Netlify function needs one Firebase Admin service account credential. It bypasses Firestore rules **on the trusted server only**, so its key must remain secret. Review Netlify's security/rate-limiting options as a second antispam layer.

## Install in GitHub Codespaces

1. Upload `thunder-vikes-shop-guest-estimates-patch.zip` into the repository root.
2. From the root, run:

   ```bash
   unzip -o thunder-vikes-shop-guest-estimates-patch.zip
   rm thunder-vikes-shop-guest-estimates-patch.zip
   npm install
   npm run build
   git add -A
   git commit -m "Allow guest shop estimate submissions via Netlify"
   git push origin main
   ```

3. Your Netlify Git deployment picks up `netlify.toml` and `netlify/functions/submit-shop-estimate.cjs` automatically. No `firebase deploy` is needed.

## Required: Firebase Admin credential in Netlify (NO Google billing card)

1. At https://console.firebase.google.com select your project `robotics-and-coding-exchange`.
2. **Project settings** (gear) > **Service accounts** > **Generate new private key**. If your school policies disable service-account keys, you will need district IT to provision a safe server identity. Do not circumvent school policy.
3. Open the downloaded JSON file **only on your computer**. In Netlify, open the store site > **Project configuration / Site configuration > Environment variables > Add variable**. Set:

   - `FIREBASE_SERVICE_ACCOUNT_JSON` = complete contents of the downloaded service-account JSON (as a single JSON string). The JSON's `private_key` retains its escaped `\\n` sequences.

4. Set scope to **Functions** (runtime) when available, and set the variable as secret/sensitive. **Redeploy the site** after saving. The credential must **never** be pasted into `src/`, `.env` committed to GitHub, a chat, or any public file. Do not use a `VITE_` prefix for this variable.
5. Keep the original key file in a secure location, separate from the website repository. Rotate/delete it in Google Cloud if accidentally exposed.

The existing `firebase-admin` dependency in the project is used by the Netlify Function.

## Optional: Email admins without Firebase Cloud Functions

The function can alert `thundervikes10166@gmail.com`, `jonathan.soto@oxnardunion.org`, and addresses from `admin_whitelist` once Resend is configured:

1. Create a free Resend account at https://resend.com and verify a domain you are **authorized to manage**. You cannot use `@gmail.com` or `@oxnardunion.org` as a sending domain unless you control its DNS or district IT sets it up.
2. Add these two **server-side** environment variables in Netlify with Functions scope:
   - `RESEND_API_KEY` = your Resend API key
   - `NOTIFICATION_FROM_EMAIL` = a sender address at the domain verified in Resend, e.g. `orders@your-verified-domain.example`
3. Redeploy. New shop estimate requests now send a notification to admins. Guest order submissions still work if email is not configured; check the admin dashboard manually.

**Notifications are to admins, not customers**. Customer estimate/confirmation and pickup communication is manual, as requested. The old Firebase Cloud Functions in `functions/` are not deployed or used by this new flow.

## Note about image uploads

The **CAD request image upload** feature built in a previous patch still uses Firebase Storage, which currently **requires Blaze**. It is separate from guest SHOP estimates. To make CAD image uploads truly card-free, the upload feature would need to be moved to another storage service, such as Netlify Blobs, or customers can use the existing external photo/STL link field.

## Local testing

A normal `npm run dev` Vite server does not execute Netlify Functions. For local end-to-end testing, use `npx netlify dev` with the Netlify environment configured, or verify a deployment on Netlify. If the function reports HTTP 503, check Netlify function logs and confirm `FIREBASE_SERVICE_ACCOUNT_JSON` was saved in the Functions environment and the project has a valid service account.
