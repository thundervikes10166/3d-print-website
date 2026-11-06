# 3D Print Store Admin Setup

This project uses **Firebase Authentication + Firestore**, not Netlify Functions, to authorize administrators.

## Pre-approved email addresses

- `jonathan.soto@oxnardunion.org`
- `thundervikes10166@gmail.com`

These are already in `src/types.ts`, but the Firestore database must separately grant `role: "admin"` to each intended administrator.

## Grant your account admin access (one-time, trusted action)

1. Deploy the updated site, then **register or sign in** using the email you want for store administration. This makes sure your Firebase Authentication account and `/users/{UID}` profile exist. If the email is already registered, sign in instead. Use the same method you plan to keep (Google or email/password); do not share your password.
2. Go to [Firebase Console](https://console.firebase.google.com/) > `robotics-and-coding-exchange` > **Authentication** > **Users**. Find that email and **copy its UID**.
3. Open **Firestore Database** > **Data** > **users** > the document whose ID exactly matches that UID. If necessary, create the document with that UID. Add/edit the field `role` as **string** `admin`. Keep any existing fields. Make sure the document `uid` and `email` values, if present, match the authenticated account.
4. **Sign out and sign back in** to refresh the frontend profile. The top menu should say **Role: Admin**. Select **Admin** to moderate products, or **Workbench > Publish Model** to create a product, which will be published immediately.

Do **not** add `role: "admin"` from browser-side registration code or relax `/users` security rules to allow self-promotion. Firestore rules deliberately forbid users from creating admin profiles themselves.

## Why the download fixes a permissions error

The old website ran an unrestricted `/listings` query for visitors, which Firestore rejects if the results might include unpublished products. The updated website separately queries published products, authenticated makers' own drafts, and all products for verified admins/teachers. The updated account initialization always starts as `student` and trusts only the Firestore `role` field for admin rights.

## Deployment

This is a **Vite + React** project, not Astro. On Netlify, use the existing site's project configuration, normally build command `npm run build` and publish directory `dist`. Keep your existing `VITE_FIREBASE_*` environment variables configured on Netlify and **do not commit `.env` with sensitive content**. Netlify Functions are not needed to authenticate or query Firestore.

Your site's `firestore.rules` is included but was **not modified** in this patch; make sure the same rules are published in Firebase Console.
