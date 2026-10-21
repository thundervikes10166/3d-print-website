# Admin email notifications

The Firestore triggers in `src/index.ts` email every address stored in the `admin_whitelist` collection when a new marketplace order or custom request is created. The two baseline administrators configured in the web app are included automatically.

## Setup

1. Create a [Resend](https://resend.com) account and verify the sending domain or email address.
2. From the project root, install the function dependencies:

   `cd functions`
   `npm install`

3. Configure the Firebase Functions secret:

   `firebase functions:secrets:set RESEND_API_KEY`

4. Deploy the triggers:

   `npm run deploy`

During the first deploy, Firebase will prompt for `NOTIFICATION_FROM_EMAIL`. Enter a sender address verified in Resend. Admin recipients continue to come from the website's `admin_whitelist` collection, so adding or removing an admin changes future notification recipients without changing the function code.
