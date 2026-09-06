/* ============================================================
   FIREBASE AUTH (Google + E-Mail-Link)
   Läuft als eigenständiges ES-Modul, damit app.js unverändert
   als normales Script bleiben kann. Kommunikation mit app.js
   erfolgt über window.lineupAuth und das Event "lineup-auth-changed".
   ============================================================ */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  deleteUser,
  reauthenticateWithPopup,
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  collectionGroup,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';
// Hinweis: setDoc(...,{merge:true}) wird hier durchgängig verwendet, damit appState-Speicherungen
// (bei jeder Änderung, alle 800ms) das separat abgelegte "profile"-Feld (Benutzername) nicht
// überschreiben, und umgekehrt eine Benutzername-Änderung nicht den appState löscht.

const firebaseConfig = {
  apiKey: 'AIzaSyB4lCn1WonKt865U9XitJtsqzRnY-hefOE',
  authDomain: 'lineup-amateur.firebaseapp.com',
  projectId: 'lineup-amateur',
  storageBucket: 'lineup-amateur.firebasestorage.app',
  messagingSenderId: '60283810118',
  appId: '1:60283810118:web:0b1658911740ea1d747547',
  measurementId: 'G-XB959XZWG7',
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const googleProvider = new GoogleAuthProvider();

const EMAIL_FOR_SIGNIN_KEY = 'lineup-amateur-email-for-signin';

function toPlainUser(user) {
  if (!user) return null;
  return { uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL };
}

function notify(detail) {
  window.dispatchEvent(new CustomEvent('lineup-auth-changed', { detail }));
}

// Wird bei jedem Login/Logout/App-Start aufgerufen, sobald Firebase den Status kennt.
onAuthStateChanged(auth, (user) => {
  notify({ status: 'ready', user: toPlainUser(user) });
});

async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return toPlainUser(result.user);
}

async function signOutUser() {
  await signOut(auth);
}

// Lädt die in der Cloud gespeicherten Mannschaften/Aufstellungen des angemeldeten Nutzers.
// Gibt null zurück, wenn noch nichts gespeichert wurde oder niemand angemeldet ist.
async function loadCloudData() {
  const user = auth.currentUser;
  if (!user) return null;
  const snap = await getDoc(doc(db, 'users', user.uid));
  return snap.exists() ? snap.data().appState || null : null;
}

// Speichert den kompletten App-Zustand (Mannschaften, Aufstellungen, Einstellungen)
// unter dem Konto des angemeldeten Nutzers, damit er auf anderen Geräten verfügbar ist.
async function saveCloudData(appState) {
  const user = auth.currentUser;
  if (!user) return;
  await setDoc(doc(db, 'users', user.uid), { appState, updatedAt: serverTimestamp() }, { merge: true });
}

// Lädt das gespeicherte Profil (aktuell: Benutzername) des angemeldeten Nutzers.
// Gibt null zurück, wenn noch kein Profil/Benutzername angelegt wurde.
async function getUserProfile() {
  const user = auth.currentUser;
  if (!user) return null;
  const snap = await getDoc(doc(db, 'users', user.uid));
  return snap.exists() ? snap.data().profile || null : null;
}

// Legt den Benutzernamen für das angemeldete Konto an bzw. ändert ihn.
async function saveUsername(username) {
  await saveProfile({ username });
}

// Speichert beliebige Profilfelder (z. B. username, photo) für das angemeldete Konto.
// Nutzt verschachteltes merge, damit bereits gespeicherte Profilfelder erhalten bleiben.
async function saveProfile(fields) {
  const user = auth.currentUser;
  if (!user) return;
  const profile = {};
  Object.entries(fields).forEach(([key, value]) => {
    profile[key] = value === undefined ? null : value;
  });
  await setDoc(doc(db, 'users', user.uid), { profile, updatedAt: serverTimestamp() }, { merge: true });
}

async function sendEmailLink(email) {
  const actionCodeSettings = {
    // Nutzer landet nach Klick auf den Link wieder auf genau dieser Seite.
    url: window.location.origin + window.location.pathname,
    handleCodeInApp: true,
  };
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  window.localStorage.setItem(EMAIL_FOR_SIGNIN_KEY, email);
}

// Prüft beim Laden, ob die aktuelle URL ein Anmeldelink ist (Nutzer kommt aus der E-Mail zurück)
// und schließt den Login in dem Fall automatisch ab.
async function completeEmailLinkSignInIfNeeded() {
  if (!isSignInWithEmailLink(auth, window.location.href)) return;
  let email = window.localStorage.getItem(EMAIL_FOR_SIGNIN_KEY);
  if (!email) {
    // Link wurde z. B. auf einem anderen Gerät geöffnet – E-Mail zur Sicherheit erneut abfragen.
    const promptText =
      typeof t === 'function' ? t('promptConfirmEmail') : 'Bitte gib zur Bestätigung deine E-Mail-Adresse ein:';
    email = window.prompt(promptText);
  }
  if (!email) return;
  try {
    await signInWithEmailLink(auth, email, window.location.href);
    window.localStorage.removeItem(EMAIL_FOR_SIGNIN_KEY);
  } catch (err) {
    console.error('E-Mail-Link-Anmeldung fehlgeschlagen:', err);
    notify({ status: 'email-link-error', message: err.message });
  } finally {
    // Anmelde-Parameter aus der URL entfernen, damit der Link nicht erneut ausgewertet wird.
    window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
  }
}

// Löscht das Konto unwiderruflich: zuerst das Firestore-Dokument mit allen Cloud-Daten
// (Mannschaften, Aufstellungen, Profil), danach den Firebase-Auth-Account selbst.
// Wirft einen Fehler mit code === "auth/requires-recent-login", wenn Firebase aus
// Sicherheitsgründen eine frische Anmeldung verlangt (Login liegt zu lange zurück).
// In dem Fall muss zuerst reauthenticateBeforeDelete() aufgerufen werden.
async function deleteAccountCompletely() {
  const user = auth.currentUser;
  if (!user) throw new Error('Kein Konto angemeldet.');
  const uid = user.uid;
  // Firestore-Daten zuerst löschen, damit sie in keinem Fall verwaist zurückbleiben,
  // selbst wenn das anschließende Löschen des Auth-Accounts fehlschlägt.
  await deleteDoc(doc(db, 'users', uid));
  await deleteUser(user);
}

// Nötig, wenn deleteAccountCompletely() mit "auth/requires-recent-login" fehlschlägt.
// Erzwingt eine erneute Anmeldung des aktuell eingeloggten Nutzers via Google-Popup.
// (Für E-Mail-Link-Konten gibt es keine Passwort-Reauth; hier müsste ein neuer
// Anmeldelink angefordert werden, was die aufrufende UI dem Nutzer anbieten sollte.)
async function reauthenticateWithGoogle() {
  const user = auth.currentUser;
  if (!user) throw new Error('Kein Konto angemeldet.');
  await reauthenticateWithPopup(user, googleProvider);
}

/* ============================================================
   MANNSCHAFT TEILEN (geteilte Mannschaften)
   ------------------------------------------------------------
   Eine geteilte Mannschaft lebt NICHT mehr im appState-Blob des Besitzers, sondern als eigenes
   Dokument unter teams/{teamId}, damit mehrere Konten gleichzeitig lesend/schreibend zugreifen
   können. Zugriffsrechte liegen in der Unterkollektion teams/{teamId}/members/{uid} (Feld "role":
   "owner" | "full" | "lineups" | "viewer"). Einladungen (per E-Mail, bevor der andere Nutzer
   überhaupt Mitglied ist) liegen separat unter invites/{autoId}, damit man sie anhand der
   E-Mail-Adresse abfragen kann, ohne die uid des Eingeladenen zu kennen.
   WICHTIG: Die zugehörigen Firestore-Security-Rules müssen in der Firebase-Konsole ergänzt werden
   (siehe firestore.rules.txt) - ohne sie schlagen alle Funktionen hier mit "permission-denied" fehl.
   ============================================================ */

// Legt eine bisher rein lokale Mannschaft als geteilte Mannschaft in der Cloud an. Der aktuell
// angemeldete Nutzer wird automatisch als "owner"-Mitglied eingetragen. Gibt die neue Dokument-ID
// zurück, die ab sofort als team.sharedId im lokalen Zustand gespeichert werden muss.
async function createSharedTeam(teamData) {
  const user = auth.currentUser;
  if (!user) throw new Error('Kein Konto angemeldet.');
  const ref = doc(collection(db, 'teams'));
  await setDoc(ref, {
    ownerUid: user.uid,
    data: teamData,
    memberUids: [user.uid],
    updatedAt: serverTimestamp(),
  });
  await setDoc(doc(db, 'teams', ref.id, 'members', user.uid), {
    uid: user.uid,
    email: user.email || null,
    role: 'owner',
    addedAt: serverTimestamp(),
  });
  return ref.id;
}

// Überschreibt den Inhalt (Kader, Aufstellungen, Design etc.) einer geteilten Mannschaft.
async function saveSharedTeam(teamId, teamData) {
  await setDoc(doc(db, 'teams', teamId), { data: teamData, updatedAt: serverTimestamp() }, { merge: true });
}

// Einmaliges Laden (z. B. direkt nach dem Beitreten, bevor der Live-Listener greift).
async function getSharedTeam(teamId) {
  const snap = await getDoc(doc(db, 'teams', teamId));
  return snap.exists() ? snap.data() : null;
}

// Live-Abo auf eine geteilte Mannschaft: callback(teamDataOrNull) wird bei jeder Änderung
// aufgerufen (auch durch andere Mitglieder). Gibt eine Funktion zum Abbestellen zurück.
function listenSharedTeam(teamId, callback) {
  return onSnapshot(
    doc(db, 'teams', teamId),
    (snap) => {
      callback(snap.exists() ? snap.data() : null);
    },
    (err) => {
      console.error('Live-Sync für geteilte Mannschaft fehlgeschlagen:', err);
      // undefined (statt null) signalisiert einen Verbindungsfehler (z. B. offline) - im Unterschied
      // zu null, das bedeutet "Dokument existiert nicht mehr/kein Zugriff". So kann die App bei einem
      // bloßen Netzwerkfehler den zuletzt bekannten Stand der Mannschaft behalten, statt sie fälschlich
      // zu entfernen (siehe attachSharedTeamListener in app.js).
      callback(undefined);
    },
  );
}

// Liefert alle Mitgliedschaften (Mannschaften, in denen der angemeldete Nutzer Mitglied oder
// Besitzer ist) über eine Collection-Group-Abfrage - so muss die App die Team-IDs vorher nicht
// kennen, um herauszufinden, welche geteilten Mannschaften geladen werden müssen.
async function listMyMemberships() {
  const user = auth.currentUser;
  if (!user) return [];
  const q = query(collectionGroup(db, 'members'), where('uid', '==', user.uid));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({ teamId: docSnap.ref.parent.parent.id, role: docSnap.data().role }));
}

// Lädt alle Mitglieder (inkl. Besitzer) einer geteilten Mannschaft, z. B. für den "Teilen"-Dialog.
async function listTeamMembers(teamId) {
  const snap = await getDocs(collection(db, 'teams', teamId, 'members'));
  return snap.docs.map((docSnap) => ({ uid: docSnap.id, ...docSnap.data() }));
}

async function updateMemberRole(teamId, memberUid, role) {
  await updateDoc(doc(db, 'teams', teamId, 'members', memberUid), { role });
}

async function removeMember(teamId, memberUid) {
  await deleteDoc(doc(db, 'teams', teamId, 'members', memberUid));
  await setDoc(doc(db, 'teams', teamId), { memberUids: arrayRemove(memberUid) }, { merge: true });
}

// Verlässt eine geteilte Mannschaft, der man selbst nur als Mitglied (nicht als Besitzer) angehört.
async function leaveSharedTeam(teamId) {
  const user = auth.currentUser;
  if (!user) return;
  await deleteDoc(doc(db, 'teams', teamId, 'members', user.uid));
  await setDoc(doc(db, 'teams', teamId), { memberUids: arrayRemove(user.uid) }, { merge: true });
}

// Löscht eine geteilte Mannschaft vollständig (nur der Besitzer darf das tun) - inklusive aller
// Mitgliedschaften und noch offenen Einladungen, damit nichts verwaist zurückbleibt.
async function deleteSharedTeamCompletely(teamId) {
  const [membersSnap, invitesSnap] = await Promise.all([
    getDocs(collection(db, 'teams', teamId, 'members')),
    getDocs(query(collection(db, 'invites'), where('teamId', '==', teamId))),
  ]);
  await Promise.all([
    ...membersSnap.docs.map((d) => deleteDoc(d.ref)),
    ...invitesSnap.docs.map((d) => deleteDoc(d.ref)),
  ]);
  await deleteDoc(doc(db, 'teams', teamId));
}

/* ------------------------------------------------------------
   EINLADUNGSLINK (statt/zusätzlich zur E-Mail-Einladung)
   ------------------------------------------------------------
   Ein Einladungslink ist ein Dokument invites/{token} mit type:'link' (im Unterschied zu den
   E-Mail-Einladungen oben, die keine "type"-Markierung tragen). Anders als bei der E-Mail-Einladung
   ist der Link an keine bestimmte E-Mail-Adresse gebunden und bleibt nach der Nutzung gültig
   (mehrere Personen können über denselben Link beitreten), bis er per revokeInviteLink() explizit
   deaktiviert wird. Der zuletzt erzeugte Token wird zusätzlich unter teams/{teamId}.inviteLinkToken
   gespiegelt, damit die App beim Öffnen des "Teilen"-Dialogs weiß, ob bereits ein aktiver Link
   existiert, ohne die invites-Collection durchsuchen zu müssen.
   WICHTIG: Die Firestore-Security-Rules müssen für invites/{token}-Dokumente mit type:'link' Lesezugriff
   für JEDEN angemeldeten Nutzer erlauben (nicht nur für den Einladenden/die passende E-Mail-Adresse),
   da der Link ja gerade ohne bekannte Ziel-E-Mail funktionieren soll.
   ------------------------------------------------------------ */

// Erstellt einen neuen Einladungslink für eine geteilte Mannschaft mit fester Rolle. Ein zuvor
// aktiver Link bleibt dabei bestehen (siehe regenerateInviteLink-Ablauf in der App: dort wird vor
// dem Neuerzeugen erst revokeInviteLink() für den alten Token aufgerufen).
async function createInviteLink(teamId, teamName, role) {
  const user = auth.currentUser;
  if (!user) throw new Error('Kein Konto angemeldet.');
  const token = `${teamId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await setDoc(doc(db, 'invites', token), {
    type: 'link',
    teamId,
    teamName,
    role,
    createdByUid: user.uid,
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(db, 'teams', teamId), { inviteLinkToken: token }, { merge: true });
  return token;
}

// Liefert den aktuell aktiven Einladungslink einer Mannschaft (Token + Rolle) oder null, wenn
// noch keiner erzeugt wurde bzw. der zuletzt erzeugte inzwischen deaktiviert wurde.
async function getInviteLink(teamId) {
  const teamSnap = await getDoc(doc(db, 'teams', teamId));
  const token = teamSnap.exists() ? teamSnap.data().inviteLinkToken : null;
  if (!token) return null;
  const inviteSnap = await getDoc(doc(db, 'invites', token));
  if (!inviteSnap.exists()) return null;
  return { token, role: inviteSnap.data().role };
}

// Deaktiviert den übergebenen Einladungslink endgültig: bereits verteilte Links funktionieren
// danach nicht mehr (joinViaInviteLink findet das invites-Dokument nicht mehr).
async function revokeInviteLink(teamId, token) {
  await deleteDoc(doc(db, 'invites', token));
  await setDoc(doc(db, 'teams', teamId), { inviteLinkToken: null }, { merge: true });
}

// Lädt die Metadaten (Mannschaftsname, Rolle) zu einem Einladungslink-Token, BEVOR der Nutzer
// bestätigt hat beizutreten - für den Bestätigungsdialog ("Willst du XY beitreten?").
// Gibt null zurück, wenn der Token unbekannt, kein Linktyp oder bereits deaktiviert ist.
async function getInviteLinkInfo(token) {
  const snap = await getDoc(doc(db, 'invites', token));
  if (!snap.exists() || snap.data().type !== 'link') return null;
  return { token, ...snap.data() };
}

// Tritt einer Mannschaft über einen Einladungslink bei: legt die Mitgliedschaft mit der im Link
// hinterlegten Rolle an. Im Unterschied zu acceptInvite() (E-Mail-Einladung) wird das invites-
// Dokument NICHT gelöscht, damit der Link für weitere Personen gültig bleibt.
async function joinViaInviteLink(token) {
  const user = auth.currentUser;
  if (!user) throw new Error('Kein Konto angemeldet.');
  const info = await getInviteLinkInfo(token);
  if (!info) throw new Error('invite-link-invalid');
  await setDoc(doc(db, 'teams', info.teamId, 'members', user.uid), {
    uid: user.uid,
    email: user.email || null,
    role: info.role,
    addedAt: serverTimestamp(),
  });
  await setDoc(doc(db, 'teams', info.teamId), { memberUids: arrayUnion(user.uid) }, { merge: true });
  return { teamId: info.teamId, teamName: info.teamName, role: info.role };
}

// Lädt einen anderen Nutzer per E-Mail-Adresse zu einer geteilten Mannschaft ein. Die Einladung
// liegt lose unter invites/ (nicht direkt unter members/), weil die Ziel-uid an dieser Stelle noch
// unbekannt ist - erst beim Annehmen (acceptInvite) wird daraus eine echte Mitgliedschaft.
async function inviteMember(teamId, teamName, email, role) {
  const user = auth.currentUser;
  if (!user) throw new Error('Kein Konto angemeldet.');
  await addDoc(collection(db, 'invites'), {
    teamId,
    teamName,
    role,
    email: email.trim().toLowerCase(),
    invitedByUid: user.uid,
    invitedByEmail: user.email || null,
    createdAt: serverTimestamp(),
  });
}

// Alle offenen Einladungen, die an die E-Mail-Adresse des angemeldeten Nutzers gerichtet sind.
async function listMyInvites() {
  const user = auth.currentUser;
  if (!user?.email) return [];
  const q = query(collection(db, 'invites'), where('email', '==', user.email.trim().toLowerCase()));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

// Nimmt eine Einladung an: legt die eigene Mitgliedschaft mit der eingeladenen Rolle an und löscht
// die Einladung anschließend.
async function acceptInvite(invite) {
  const user = auth.currentUser;
  if (!user) throw new Error('Kein Konto angemeldet.');
  await setDoc(doc(db, 'teams', invite.teamId, 'members', user.uid), {
    uid: user.uid,
    email: user.email || null,
    role: invite.role,
    addedAt: serverTimestamp(),
  });
  await setDoc(doc(db, 'teams', invite.teamId), { memberUids: arrayUnion(user.uid) }, { merge: true });
  await deleteDoc(doc(db, 'invites', invite.id));
}

async function declineInvite(inviteId) {
  await deleteDoc(doc(db, 'invites', inviteId));
}

window.lineupAuth = {
  signInWithGoogle,
  signOutUser,
  sendEmailLink,
  loadCloudData,
  saveCloudData,
  getUserProfile,
  saveUsername,
  saveProfile,
  deleteAccountCompletely,
  reauthenticateWithGoogle,
  getCurrentUser: () => toPlainUser(auth.currentUser),
  createSharedTeam,
  saveSharedTeam,
  getSharedTeam,
  listenSharedTeam,
  listMyMemberships,
  listTeamMembers,
  updateMemberRole,
  removeMember,
  leaveSharedTeam,
  deleteSharedTeamCompletely,
  inviteMember,
  listMyInvites,
  acceptInvite,
  declineInvite,
  createInviteLink,
  getInviteLink,
  revokeInviteLink,
  getInviteLinkInfo,
  joinViaInviteLink,
};

completeEmailLinkSignInIfNeeded();
