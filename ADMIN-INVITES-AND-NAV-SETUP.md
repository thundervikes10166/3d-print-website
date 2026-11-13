# Thunder Vikes Store: Merch Navigation + Secure Admin Invitations

## What this patch does

- Makes **Shop / Request / Merch** public and always visible, including on phones without opening the hamburger menu.
- Keeps **Workbench / Manage** for approved class students and administrators, and **Orders** for signed-in purchase history.
- Includes the earlier Merch separation: Shop for 3D printing and woodwork; Merch for shirts, hats, hoodies, and other apparel with sizes.
- Includes the earlier removal of the suggested deposit/payment-instructions checkbox and prompts.
- Adds **Manage → Admin Accounts → Send admin invitation**.
- The invite is sent by Resend to the target email address. Recipients register and choose their own password if new, or sign in normally if they already have an account.
- Recipients click **Activate Admin Access** on the website to accept a one-time invitation; only then does a Netlify function change their Firestore `users/{uid}.role` to `admin`.
- Allows an administrator to revoke another administrator or cancel an invitation. The original owner address is protected.
- Uses the existing `admin_whitelist` collection for **display purposes only**. Neither adding an email nor localStorage grants privileges.
- No Firebase Blaze plan or Cloud Functions deployment is required.

## Install in Codespaces

1. Upload `thunder-vikes-admin-nav-combined-patch.zip` to your **store** GitHub repository root, where `package.json` is located (not your separate Astro team site).
2. Open terminal in that folder and run:

```bash
unzip -o thunder-vikes-admin-nav-combined-patch.zip
rm thunder-vikes-admin-nav-combined-patch.zip
npm install
npm run build
```

3. On the `main` branch, commit and push:

```bash
git status
git add -A
git commit -m "Add merch navigation and secure admin invitations"
git push origin main
```

4. In Netlify, confirm this store is connected to the same repository and `main` is the **production branch**. In **Deploys**, confirm a new deploy with the commit above is marked **Published**.
5. Open <https://thunder-vikes-orders.netlify.app/> in a new private/incognito browser window. **Shop, Request, Merch** should appear in the nav. On phones, they appear on a separate row below the header. Staff features appear after an authorized sign-in.

## Netlify server environment variables

The **site containing the store** (not the Astro publicity site) requires:

- `FIREBASE_SERVICE_ACCOUNT_JSON`: private Firebase Admin credential JSON (server only). Do not paste it into browser code, GitHub, or this chat.
- `RESEND_API_KEY`: Resend API key.
- `NOTIFICATION_FROM_EMAIL`: verified domain sender, e.g. `orders@HHSRobotics.com` if **that domain is verified in Resend**.

After setting/changing them, trigger a fresh Netlify deploy. The admin invitation endpoint is `/.netlify/functions/manage-admin-access`. Netlify Functions must be enabled; the existing `netlify.toml` points to `netlify/functions`.

## Invite a new administrator

1. Sign in using an existing account with `users/{uid}.role` set to `admin` in Firestore. Only an **existing** administrator can invite others. The primary owner has to be set once in Firestore if there isn't already any admin account.
2. Go to **Manage → Admin Accounts**.
3. Enter the recipient email and select **Send admin invitation**. If Resend/Netlify isn't configured, the app shows an error instead of claiming success.
4. The recipient opens the invitation from their email within **72 hours**.
5. They **Register** and choose their own password if new, or **Sign In** if they already have a login. They must use the invited email.
6. They select **Activate Admin Access**. At this point the server changes their role. They get **Manage** and **Workbench** immediately; if their session is stale they can sign out and sign in again.
7. To remove access, select **Revoke** beside their email. This changes their role back to `student` without deleting their Firebase Auth account or password.

**Security:** This invitation is single-use and requires the signed-in account email to match the recipient. Pending invitations and their token hashes live in `admin_invitations`, a server-only Firestore collection. The raw token appears only in the Resend invitation link. There is no client Firestore rule allowing customers to make themselves admins.

## Firestore Rules

No additional Firestore rule is needed to accept or revoke invitations because only the Netlify function uses the Firebase Admin SDK to manage roles. The patch includes `firestore.rules` from the previous Merch update, needed for the new apparel size field in staff orders. If you have made further Firestore rules changes, **compare and merge** before publishing; pushing a file to GitHub does not automatically publish Firestore rules.

## If the new navigation still does not appear

- In Codespaces, run `grep -n "Merch" src/components/Navbar.tsx`. It must show public Merch links.
- Verify the ZIP was extracted at the **repository root** (not inside a nested folder).
- Run `npm run build`, commit all modified files, and `git push origin main`.
- In Netlify, check the **published deployment's commit hash and production branch**. Rebuild/redeploy the correct branch if the commit is older.
- Hard-refresh the site or open in an incognito window to bypass an older cached frontend.

## Verification and limits

Edited TypeScript/TSX files passed standalone TypeScript transpilation syntax checks; the new Netlify function passed Node syntax checks and mocked permission/invitation flows. A full production build could not be performed in this environment because `npm install` timed out. Live Resend, Firebase, and Netlify behavior still needs a test in your environment.
