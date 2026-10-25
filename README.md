# Times Table Test

A multiplication test for children. A single web page with no build step. Results are saved in the browser, and can optionally be kept online by signing in with Google.

## Layout

| Path | Purpose |
|---|---|
| `public/index.html` | The app (HTML, CSS and JavaScript) |
| `public/sync.js` | Optional online sync using Google sign-in and Firestore |
| `public/firebase-config.js` | Firebase web app config (project identifiers, not secrets) |
| `firestore.rules` | Security rules: each signed-in user can only reach their own data |
| `firebase.json`, `.firebaserc` | Firebase Hosting and Firestore configuration |
| `PRODUCT.md` | Design brief |

## Where data lives

- Always saved in the browser (`localStorage`), so the app works offline and without signing in.
- If the user signs in with Google, results also sync to Firestore under `users/{uid}`. Several devices signed in to the same Google account see the same results.
- "Download backup" and "Restore from backup" on the setup screen export and import a JSON file.

## One-time Firebase setup

Project: `multiplication-test-2d3eb`.

1. In the Firebase console, create a Firestore database (Production mode) and enable the Google sign-in provider under Authentication.
2. Under Authentication > Settings > Authorised domains, add the custom domain (for example `multiplication.perestrello.net`). The default `*.web.app` and `*.firebaseapp.com` domains are already allowed.
3. Fill in the empty values in `public/firebase-config.js` from Project settings > Your apps. Sync stays switched off until `apiKey` and `appId` are set.
4. Install the CLI (`npm i -g firebase-tools`), run `firebase login`, then deploy the rules and the site:

```
firebase deploy --only firestore:rules,hosting
```

To publish automatically on merge to `main`, run `firebase init hosting:github` once.

## Local use

Open `public/index.html` in a browser. Online sync needs the page served over `http://localhost` or `https`, for example `npx firebase-tools emulators:start --only hosting`.
