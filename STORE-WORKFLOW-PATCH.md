# Thunder Vikes 3D Print Store: Orders, CAD stages, and student approvals

This patch updates the **Vite/React 3D-print ordering app**, not the separate Astro Thunder Vikes homepage.
It builds on the earlier CAD stage and photo-upload patches. The ZIP contains only changed/new files.

## What's changed

- **Customer Orders** is now a purchase-history page with Shop Orders and Custom 3D Requests tabs. It filters to the signed-in customer's own data and clearly labels fulfilled vs. not yet fulfilled items. Details can expand; customers cannot edit production statuses.
- **Admin / Manage → Orders & Print Status** is exclusively for orders placed through Shop. Collapsible order cards show a six-stage workflow, Previous and Next controls, editable quantity/material/color/contact/notes/pickup, and a dated stage/edit history.
- **Manage → Custom 3D Requests** is exclusively for custom requests/quotes. Collapsible request cards support previous/next stage, editable object details (including size/dimensions/quantity), staff notes, and histories. Completed items have their own subtab and can be moved back to Ready.
- The old **Pending Approvals** product tab has been removed. Approved staff can publish products directly in **Catalog Management** (old pending products remain manageable there).
- **Manage → Class Students** has a registration-approval queue with **✓ Approve** and **✕ Deny** for new registrants. Approval creates a UID-keyed class-student record in Firestore; only approved students get product and production-management permissions.
- Full **admins** exclusively manage class-student memberships/approvals and admin accounts and confirm cash deposits. Students do not gain Firebase admin access.
- Actions are written to Firestore, with stage events recording ISO date/time, signed-in actor UID/email/display name, and an optional note. Detail edits are logged separately.
- Historical Firestore statuses remain compatible (e.g., `inProduction`).

## 1. Install in GitHub Codespaces

Upload `thunder-vikes-store-management-patch.zip` to the **repository root** and run:

```bash
unzip -o thunder-vikes-store-management-patch.zip
rm thunder-vikes-store-management-patch.zip
npm install
npm run build
```

If the build succeeds:

```bash
git add -A
git commit -m "Redesign order workflows and add class student approvals"
git push origin main
```

## 2. REQUIRED: Publish updated Cloud Firestore rules

Your website will show permission errors until the included `firestore.rules` are also published in your Firebase project.

In Firebase Console, select `robotics-and-coding-exchange` → **Firestore Database → Rules**, replace the rules with the contents of this ZIP's `firestore.rules`, and **Publish**.

Alternatively, if the Firebase CLI is installed/configured and `firebase.json` targets this project, run:

```bash
firebase deploy --only firestore:rules --project robotics-and-coding-exchange
```

**Important:** These are Firestore rules, not Firebase Storage rules. Keep the earlier `storage.rules` for CAD image uploads (and keep Firebase Storage configured). No new Netlify Functions are required for these changes.

## 3. Registration and student access

1. A **new user** signs up using the website. A profile in `/users/{uid}` and pending `/class_student_applications/{uid}` are created automatically.
2. Sign in as an established full admin with `users/{yourAuthUID}.role = "admin"` in Firestore.
3. Go to **Manage → Class Students**. Select **✓** or **✕** next to each pending registration.
4. Approved students sign out/in, or allow Firestore's live listener to refresh. They can then open **Manage** to work on requests/orders and publish products.
5. The admin can also add someone who **has already registered** using their email in Class Students. It creates the correct UID-keyed class-student record. Emails not registered yet cannot be approved this way.

**Existing records:** Older `class_students` documents with random document IDs and `canPublish: true` do not automatically grant elevated access. Reapprove registered students through the new pending queue or manually re-add by their registered email. This prevents spoofing access with an arbitrary email value.

**Limitations:** Removing a class-student entry revokes access to staff functions, **not** the student's Firebase Authentication login. Actual deletion of an Authentication user requires a trusted server-side Firebase Admin SDK action or manual deletion in Firebase Console → Authentication → Users. Likewise, changing the email list under Admin Accounts does not grant or revoke the trusted Firestore `admin` role.

## Verification

- All changed TS/TSX files passed TypeScript parsing checks.
- The stage/workflow type files passed strict TypeScript type-checking, and 8 automated stage-transition assertions passed.
- Full `npm install` timed out in this environment, so **a complete Vite build was not verified here**. Run `npm run build` in Codespaces before pushing.
- Firebase security rules still need to be published; no production Firebase deployment was performed.
