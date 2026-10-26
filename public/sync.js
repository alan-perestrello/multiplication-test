// Online accounts for the Times Table Test: Google sign-in, roles and results in Firestore.
// Loaded as a module. If the config is empty or the SDK cannot load, the app
// carries on using browser storage only.
//
// Collections (see firestore.rules):
//   roles/{email}                    { name, role }   managed by an admin
//   shares/{childEmail}              { teachers }     managed by the child
//   results/{email}/tests/{testId}   one document per saved test
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, writeBatch }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

var cfg = window.TTT_FIREBASE;
if (cfg && cfg.apiKey && cfg.appId) {
  var app = initializeApp(cfg);
  var auth = getAuth(app);
  getRedirectResult(auth).catch(function (e) { window.dispatchEvent(new CustomEvent("tttautherror", { detail: e })); });
  var db;
  try { db = initializeFirestore(app, { localCache: persistentLocalCache() }); }
  catch (e) { db = initializeFirestore(app, {}); }

  var lc = function (s) { return String(s || "").trim().toLowerCase(); };
  var api = {
    ready: true,
    user: null,
    email: function () { return api.user ? lc(api.user.email) : ""; },
    docId: function (t) { return String(t.d) + "_" + t.p; },

    signIn: function () {
      var provider = new GoogleAuthProvider();
      return signInWithPopup(auth, provider).catch(function (e) {
        if (e && (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment")) {
          return signInWithRedirect(auth, provider);
        }
        throw e;
      });
    },
    signOut: function () { return signOut(auth); },

    // ----- roles
    // The signed-in person's entry in the users table, or null.
    getMyRole: function () {
      return getDoc(doc(db, "roles", api.email())).then(function (d) {
        return d.exists() ? { email: d.id, name: d.data().name, role: d.data().role } : null;
      });
    },
    // Admin only: everyone in the table.
    listUsers: function () {
      return getDocs(collection(db, "roles")).then(function (snap) {
        var out = [];
        snap.forEach(function (d) { out.push({ email: d.id, name: d.data().name, role: d.data().role }); });
        return out;
      });
    },
    // Any registered user: the teachers a child can choose from.
    listTeachers: function () {
      return getDocs(query(collection(db, "roles"), where("role", "==", "teacher"))).then(function (snap) {
        var out = [];
        snap.forEach(function (d) { out.push({ email: d.id, name: d.data().name, role: "teacher" }); });
        return out;
      });
    },
    // Teacher: the children who chose this teacher.
    listMyChildren: function () {
      return getDocs(query(collection(db, "shares"), where("teachers", "array-contains", api.email()))).then(function (snap) {
        var ids = [];
        snap.forEach(function (d) { ids.push(d.id); });
        return Promise.all(ids.map(function (id) {
          return getDoc(doc(db, "roles", id)).then(function (r) {
            return r.exists() ? { email: id, name: r.data().name, role: r.data().role } : null;
          });
        })).then(function (list) { return list.filter(Boolean); });
      });
    },
    // Admin only.
    saveUser: function (u) {
      return setDoc(doc(db, "roles", lc(u.email)), { name: String(u.name).trim(), role: u.role });
    },
    deleteUser: function (email) { return deleteDoc(doc(db, "roles", lc(email))); },

    // ----- who may see a child's results
    getShares: function () {
      return getDoc(doc(db, "shares", api.email())).then(function (d) {
        return d.exists() && Array.isArray(d.data().teachers) ? d.data().teachers : [];
      });
    },
    setShares: function (teachers) {
      return setDoc(doc(db, "shares", api.email()), { teachers: teachers.map(lc) });
    },

    // ----- results
    // Tests saved by `ownerEmail` (yourself, or someone you are allowed to see).
    pull: function (ownerEmail) {
      return getDocs(collection(db, "results", lc(ownerEmail), "tests")).then(function (snap) {
        var tests = [];
        snap.forEach(function (d) {
          var x = d.data();
          try { tests.push({ _id: d.id, d: x.d, p: x.p, s: x.s && Object.keys(x.s).length ? x.s : null, per: JSON.parse(x.per), f: x.f }); } catch (e) { /* skip unreadable */ }
        });
        return tests;
      });
    },
    pushTests: function (list) {
      if (!list.length) return Promise.resolve();
      var jobs = [], owner = api.email();
      for (var i = 0; i < list.length; i += 400) {
        var b = writeBatch(db);
        list.slice(i, i + 400).forEach(function (t) {
          var data = { d: t.d, p: t.p, s: t.s || {}, per: JSON.stringify(t.per) };
          if (t.f) data.f = t.f;
          b.set(doc(db, "results", owner, "tests", api.docId(t)), data);
        });
        jobs.push(b.commit());
      }
      return Promise.all(jobs);
    },
    // Delete every result saved under the signed-in person's own email.
    deleteMine: function () {
      return getDocs(collection(db, "results", api.email(), "tests")).then(function (snap) {
        var dels = [];
        snap.forEach(function (d) { dels.push(deleteDoc(d.ref)); });
        return Promise.all(dels);
      });
    }
  };

  window.TTTSync = api;
  onAuthStateChanged(auth, function (u) {
    api.user = u;
    window.dispatchEvent(new CustomEvent("tttauth"));
  });
  window.dispatchEvent(new CustomEvent("tttsync"));
}
