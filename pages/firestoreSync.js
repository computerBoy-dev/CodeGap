// firestoreSync.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { deleteField } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Fetch firebase-config.json
let db, uid, projectId;
let isInitialized = false;

let currentFiles = {};  // Local mirror of `files`
let updateCallback = () => {};

export async function initFirestoreSync(filesRef, callback) {
  updateCallback = callback;

  const res = await fetch("../sdk/firebase-config.json");
  const config = await res.json();

  const app = initializeApp(config);
  const auth = getAuth(app);
  db = getFirestore(app);

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "/index.html"; // or your auth handler
      return;
    }

    uid = user.uid;
    const params = new URLSearchParams(location.search);
    projectId = params.get("project");

    const docRef = doc(db, "users", uid, "projects", projectId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      Object.assign(filesRef, docSnap.data().files || {});
      currentFiles = structuredClone(filesRef);
      updateCallback(); // refresh UI
    } else {
      await setDoc(docRef, { files: filesRef });
    }

    // Live sync
    onSnapshot(docRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (!data.files) return;

      Object.assign(filesRef, data.files);
      currentFiles = structuredClone(filesRef);
      updateCallback(); // Refresh UI
    });

    isInitialized = true;
  });
}

let debounce;
export function syncFiles(filesRef) {
  if (!isInitialized) return;

  clearTimeout(debounce);
  debounce = setTimeout(async () => {
    const changes = {};
    let changed = false;

    // ✅ Step 1: extract <title> from index.html
    let projectTitle = "Untitled Project";
    const html = filesRef["index.html"]?.content;
    if (html) {
      const match = html.match(/<title>(.*?)<\/title>/i);
      if (match) projectTitle = match[1].trim();
    }

    // ✅ Step 2: detect file changes
    for (const key in filesRef) {
      if (
        !currentFiles[key] ||
        JSON.stringify(filesRef[key]) !== JSON.stringify(currentFiles[key])
      ) {
        changes[key] = filesRef[key];
        changed = true;
      }
    }

    // ✅ Step 3: detect deleted files
    for (const key in currentFiles) {
      if (!filesRef[key]) {
        changes[key] = deleteField();
        changed = true;
      }
    }

    if (changed) {
      const docRef = doc(db, "users", uid, "projects", projectId);
      await setDoc(docRef, {
        files: filesRef,
        name: projectTitle, // ✅ Step 4: update project name
        updated: Timestamp.now(), // ✅ Firestore-compatible timestamp
      });

      Object.assign(currentFiles, structuredClone(filesRef));
    }
  }, 1000);
}
