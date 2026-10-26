# Times Table Test

A multiplication test for children. A single web page with no build step. Results are saved in the browser, and can optionally be kept online by signing in with Google.

## Layout

| Path | Purpose |
|---|---|
| `public/index.html` | The app (HTML, CSS and JavaScript) |
| `public/sync.js` | Optional online sync using Google sign-in and Firestore |
| `public/firebase-config.js` | Firebase web app config (project identifiers, not secrets) |
| `firestore.rules` | Security rules for roles, sharing and results |
| `firebase.json`, `.firebaserc` | Firebase Hosting and Firestore configuration |
| `PRODUCT.md` | Design brief |

## Question types

The setup screen has three boxes: multiplication, division, or both. Division questions are built from a times table fact and always divide exactly: 42 ÷ 7 = 6. The divisor is the table number, so "tables 6 to 9" means dividing by 6 to 9, and the "multiply by" range is the range of answers. "Both" mixes the two. Reports and focus tests keep the two operations apart (7× and 7÷ are separate rows). Presets set size and speed only, so they work in every mode.

## Accounts and roles

Using the app signed out works as before: names and results stay in the browser on that device. Signing in with Google adds role based online results.

| Role | What they can see |
|---|---|
| Admin | Every user's report, and the Users screen to add, edit or remove users |
| Teacher | Their own results, plus read only reports for children who have chosen that teacher |
| Child | Only their own results. A child chooses which teachers may see them |

Everyone takes tests as themselves. Admins and teachers use "Select a name" on the report card to view someone else, and that view is read only.

Data is in Firestore, keyed by lowercase Google email, and enforced by `firestore.rules` (not just hidden in the screen):

| Path | Contents | Who writes |
|---|---|---|
| `roles/{email}` | `{ name, role }` | Admins only |
| `shares/{childEmail}` | `{ teachers: [emails] }` | The child |
| `results/{email}/tests/{id}` | One saved test | The owner only |

`alanperestrello@gmail.com` is the bootstrap admin, hard coded in `firestore.rules` and in `public/index.html`. On that account's first sign-in the app creates the admin entry and the first child entry (`leoperestrello@gmail.com`). Everyone else is added from the Users screen. A Google account that is not in the table can sign in but only uses the device locally.

Results saved online before roles were added (under `users/{uid}`) are no longer readable and are not migrated.

Other storage: "Download backup" and "Restore from backup" on the setup screen export and import a JSON file of what is on the device.

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
