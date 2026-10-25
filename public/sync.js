// Optional online sync for the Times Table Test, using Google sign-in and Firestore.
// Loaded as a module. If the config is empty or the SDK cannot load, the app
// carries on using browser storage only.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, writeBatch }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

var cfg = window.TTT_FIREBASE;
if (cfg && cfg.apiKey && cfg.appId) {
  var app = initializeApp(cfg);
  var auth = getAuth(app);
  var db;
  try { db = initializeFirestore(app, { localCache: persistentLocalCache() }); }
  catch (e) { db = initializeFirestore(app, {}); }

  var api = {
    ready: true,
    user: null,
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
    // Returns { people: {list, alias} or null, tests: [local-format records with _id] }
    pull: function () {
      var uid = api.user.uid;
      return Promise.all([
        getDoc(doc(db, "users", uid, "meta", "people")),
        getDocs(collection(db, "users", uid, "tests"))
      ]).then(function (r) {
        var people = r[0].exists() ? r[0].data() : null;
        var tests = [];
        r[1].forEach(function (d) {
          var x = d.data();
          try { tests.push({ _id: d.id, d: x.d, p: x.p, s: x.s && Object.keys(x.s).length ? x.s : null, per: JSON.parse(x.per), f: x.f }); } catch (e) { /* skip unreadable */ }
        });
        return { people: people, tests: tests };
      });
    },
    pushTests: function (list) {
      if (!list.length) return Promise.resolve();
      var uid = api.user.uid, jobs = [];
      for (var i = 0; i < list.length; i += 400) {
        var b = writeBatch(db);
        list.slice(i, i + 400).forEach(function (t) {
          var data = { d: t.d, p: t.p, s: t.s || {}, per: JSON.stringify(t.per) };
          if (t.f) data.f = t.f;
          b.set(doc(db, "users", uid, "tests", api.docId(t)), data);
        });
        jobs.push(b.commit());
      }
      return Promise.all(jobs);
    },
    pushPeople: function (obj) {
      return setDoc(doc(db, "users", api.user.uid, "meta", "people"), { list: obj.list, alias: obj.alias || {}, updated: Date.now() });
    },
    // Delete every saved test belonging to any of the given person ids.
    deleteByPeople: function (ids) {
      var uid = api.user.uid, jobs = [];
      for (var i = 0; i < ids.length; i += 30) {
        jobs.push(getDocs(query(collection(db, "users", uid, "tests"), where("p", "in", ids.slice(i, i + 30))))
          .then(function (snap) {
            var dels = [];
            snap.forEach(function (d) { dels.push(deleteDoc(d.ref)); });
            return Promise.all(dels);
          }));
      }
      return Promise.all(jobs);
    }
  };

  window.TTTSync = api;
  onAuthStateChanged(auth, function (u) {
    api.user = u;
    window.dispatchEvent(new CustomEvent("tttauth"));
  });
  window.dispatchEvent(new CustomEvent("tttsync"));
}
