# Thunder Vikes Store: CAD Request Workflow Update

This is a *patch*, not a replacement project. It builds on the previously provided admin-access and CAD quote-form updates.

## Changes

- A six-stage CAD request workflow: **Submitted → Marked as received → In progress (slicer) → In printer / printing → Ready for pick up → Complete**.
- Admin CAD Requests now contains **Active requests** and a separate **Completed** tab. Requests move to Completed when the final stage is recorded.
- Each status change is recorded in the request's Firestore `statusLog`, including an ISO timestamp, the signed-in user's UID, name, email, and an optional stage note. A stage history can be expanded per request. Progression is one stage at a time.
- Private staff-only notes are stored at `requests/{requestId}/staffNotes/{noteId}`. Each note includes the author and time. Customers cannot read this subcollection under the supplied rules, even though they can read their own request documents.
- The request cards display requested object size, approximate dimensions/footprint, quantity, material, colors, customer contact information, and the STL/photo link when supplied.
- The CAD quote form now has a **required Quantity** number field (1–1000), initially blank, and shows it in the confirmation step. The previous version saved a quantity but didn't expose a field.
- Customer My Requests now shows the new progress tracker, and assigned student makers can see and update their assigned requests.
- Existing requests retain their status and history. Legacy status values are visually mapped to the closest new stage (`underReview` and `accepted` ≈ received; `inProduction` ≈ printing). Old stage events without an author show **Unknown (older record)**. Legacy declined requests remain in Active and require manual handling.
- Catalog orders retain their preexisting, separate status system. No automatic quote messages or notifications are added.

## Apply patch in GitHub Codespaces

Upload `thunder-vikes-cad-workflow-patch.zip` into the repository root (the same directory as `package.json`). Then run:

```bash
unzip -o thunder-vikes-cad-workflow-patch.zip
rm thunder-vikes-cad-workflow-patch.zip
npm install
npm run build
```

After a successful build, commit and push on `main`:

```bash
git add -A
git commit -m "Add CAD request stages, staff notes, audit history and quantity"
git push origin main
```

## IMPORTANT: Publish Firestore security rules separately

**Netlify does not publish Firebase security rules.** Deploy the supplied `firestore.rules` to the Firebase project before using internal notes, otherwise the notes panel will show permission errors.

**Option A (Firebase console):** Open `Firebase Console → robotics-and-coding-exchange → Firestore Database → Rules`. Replace the rules with the contents of `firestore.rules` (check for any newer custom rules you want to keep) and click **Publish**.

**Option B (Firebase CLI, if configured):** From the repository root, run:

```bash
npx firebase-tools deploy --only firestore:rules --project robotics-and-coding-exchange
```

This patch restricts who can update CAD stages and read/write internal notes. A requester can create a request but cannot edit its production stages. Teachers/admins and assigned makers can change stages. Notes cannot be edited or deleted through client SDK security rules. Timestamps on stage changes come from the device in ISO 8601; the request's `updatedAt` field is Firestore server time. For tamper-resistant compliance auditing, a server-owned event log would be necessary.

## Validation

The edited TypeScript and TSX files passed syntax/transpilation checks. The full Vite build could not be completed in the creation environment because npm dependency installation timed out. Run `npm run build` in Codespaces before pushing.
