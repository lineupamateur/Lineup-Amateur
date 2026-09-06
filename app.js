/* ============================================================
   KONSTANTEN & KLEINE HILFSFUNKTIONEN
   ============================================================ */
const STORAGE_KEY = 'lineup-amateur-v4';
const ACCOUNT_KEY = 'lineup-amateur-account';
// Offline-Cache für die Mannschaften eines angemeldeten Kontos: STORAGE_KEY enthält bewusst NUR
// Gast-Mannschaften (siehe Kommentar weiter unten), Konto-Mannschaften kommen normalerweise live aus
// Firestore. Ohne diesen Zusatz-Cache wäre die App für angemeldete Nutzer bei einem Offline-Start
// (kein Netz beim Öffnen/Neuladen) komplett leer, bis wieder eine Verbindung besteht. Wird bei jedem
// save() sowie nach jedem erfolgreichen Cloud-Sync aktualisiert (siehe cacheAccountTeams()).
const ACCOUNT_TEAMS_CACHE_KEY = 'lineup-amateur-account-cache';
// Erlaubte Spielerzahlen für Kleinfeldfußball-Mannschaften (team.sport === 'futsal') - 10/11 werden im
// Spielerzahl-Auswahlmenü ausgeblendet (siehe renderFormations) und beim Umstellen einer bestehenden
// Mannschaft auf Kleinfeldfußball wird eine zu hohe Spielerzahl automatisch auf 9 begrenzt.
const FUTSAL_PLAYER_COUNTS = [5, 6, 7, 8, 9];
const FUTSAL_DEFAULT_PLAYER_COUNT = 7;
const FORMATIONS = {
  5: [
    ['2-2', '2–2'],
    ['1-2-1', '1–2–1'],
    ['3-1', '3–1'],
    ['2-1-1', '2–1–1'],
  ],
  6: [
    ['2-2-1', '2–2–1'],
    ['1-3-1', '1–3–1'],
    ['3-1-1', '3–1–1'],
    ['2-1-2', '2–1–2'],
  ],
  7: [
    ['2-3-1', '2–3–1'],
    ['3-2-1', '3–2–1'],
    ['2-2-2', '2–2–2'],
    ['1-3-2', '1–3–2'],
  ],
  8: [
    ['3-3-1', '3–3–1'],
    ['2-3-2', '2–3–2'],
    ['3-2-2', '3–2–2'],
    ['2-4-1', '2–4–1'],
  ],
  9: [
    ['3-3-2', '3–3–2'],
    ['3-2-3', '3–2–3'],
    ['4-2-2', '4–2–2'],
    ['2-3-3', '2–3–3'],
  ],
  10: [
    ['3-3-3', '3–3–3'],
    ['4-3-2', '4–3–2'],
    ['3-4-2', '3–4–2'],
    ['4-2-3', '4–2–3'],
  ],
  11: [
    ['4-3-3', '4–3–3 offensiv'],
    ['4-4-2', '4–4–2 klassisch'],
    ['4-2-3-1', '4–2–3–1'],
    ['3-5-2', '3–5–2'],
    ['3-4-2-1', '3–4–2–1'],
    ['4-1-2-1-2', '4–1–2–1–2'],
  ],
};
const byId = (id) => document.getElementById(id);
/* Feinpositionen: Torwart, Innen-/Rechts-/Linksverteidiger, Def./Zentrales/Off. Mittelfeld,
   Rechtes/Linkes Mittelfeld, Rechter/Linker Flügelstürmer, Stürmer. Ein Spieler kann mehrere
   dieser Positionen zugleich haben (Mehrfachauswahl). Muss vor normalizeTeam()/app-Init stehen. */
const POSITION_CODES = ['TW', 'IV', 'RV', 'LV', 'DM', 'ZM', 'OM', 'RM', 'LM', 'RF', 'LF', 'ST'];
const LEGACY_POSITION_MAP = { Torwart: 'TW', Abwehr: 'IV', Mittelfeld: 'ZM', Sturm: 'ST' };
const PLAYER_STATUSES = ['available', 'questionable', 'unavailable'];
const STATUS_ICON = { available: '✓', questionable: '?', unavailable: '✕' };
const STATUS_LABEL_KEY = {
  available: 'statusAvailable',
  questionable: 'statusQuestionable',
  unavailable: 'statusUnavailable',
};
function playerPositions(player) {
  if (Array.isArray(player?.positions)) return player.positions;
  if (player?.position && LEGACY_POSITION_MAP[player.position]) return [LEGACY_POSITION_MAP[player.position]];
  return [];
}
function migratePlayerPositions(player) {
  if (!player) return player;
  if (!Array.isArray(player.positions)) player.positions = playerPositions(player);
  delete player.position;
  if (!PLAYER_STATUSES.includes(player.status)) player.status = 'available';
  if (typeof player.notes !== 'string') player.notes = '';
  return player;
}
const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const esc = (value = '') =>
  String(value).replace(
    /[&<>'"]/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char],
  );
const clone = (value) => JSON.parse(JSON.stringify(value));
const readJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch (_) {
    return null;
  }
};

/* ============================================================
   ÜBERSETZUNGEN (DE, EN, ES, FR, IT, PT, TR, NL)
   ============================================================ */
const I18N = {
  de: {
    activeTeam: 'AKTIVE MANNSCHAFT',
    navLineup: 'Aufstellung',
    navRoster: 'Kader',
    navArchive: 'Mannschaften',
    navDesign: 'Trikot & Design',
    navMatchday: 'Spieltag',
    pageTitleMatchday: 'Spieltag planen',
    exportMatchdayPng: '↗ Grafik als PNG',
    matchdayEyebrow: 'SPIELTAG',
    matchdayDetails: 'Spieltag-Infos',
    opponentName: 'Gegner',
    opponentPlaceholder: 'Gegnername',
    homeAway: 'Heim/Auswärts',
    home: 'Heim',
    away: 'Auswärts',
    venue: 'Spielort',
    venuePlaceholder: 'Sportplatz, Straße',
    matchDate: 'Datum',
    matchTime: 'Anstoß',
    opponentCrest: 'Wappen Gegner',
    toastMatchdayPngCreated: 'Spieltag-Grafik als PNG erstellt.',
    switchTheme: 'Theme wechseln',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    login: 'Anmelden',
    coachLogin: 'Trainer-Login',
    profileLabel: 'Profil',
    coachArea: 'Profil',
    brandEyebrow: 'LINEUP AMATEUR',
    saveLineup: '✓ Aufstellung speichern',
    addPlayer: '+ Spieler hinzufügen',
    createTeam: '+ Mannschaft erstellen',
    pageTitleLineup: 'Aufstellung planen',
    pageTitleRoster: 'Kader verwalten',
    pageTitleArchive: 'Mannschaften & Aufstellungen',
    pageTitleDesign: 'Trikot & Design',
    assignPlayerEyebrow: 'SPIELER ZUWEISEN',
    searchPlayer: 'Spieler suchen',
    newPlayerForSlot: '+ Neuer Spieler für diesen Platz',
    manageRoster: 'Kader verwalten',
    selectionNoSlot: 'Wähle einen Platz in der Startelf oder auf der Ersatzbank aus.',
    selectionNoSlotTitle: 'Kein Platz ausgewählt.',
    selectionNoSlotText: 'Wähle zunächst einen Platz in der Startelf oder auf der Ersatzbank.',
    starterSlot: 'Startelf · Platz',
    benchSlotTitle: 'Ersatzbank',
    playerSelected: 'ist ausgewählt.',
    chooseFromRoster: 'Wähle einen Spieler aus dem Kader aus.',
    rosterEmptyAssignTitle: 'Dein Kader ist leer.',
    rosterEmptyAssignText: 'Lege direkt einen neuen Spieler an.',
    allSelectedTitle: 'Alle Spieler sind ausgewählt.',
    allSelectedText: 'Leere einen Platz, um umzubesetzen.',
    noPlayerFoundTitle: 'Kein Spieler gefunden.',
    noPlayerFoundText: 'Passe die Suche an.',
    kit: 'TRIKOT',
    trikotLook: 'Trikotlook',
    teamName: 'Teamname',
    sportLabel: 'Sportart',
    sportFootball: 'Fußball',
    sportFutsal: 'Kleinfeldfußball',
    crestPng: 'Wappen (PNG)',
    uploadPng: 'PNG hochladen',
    removeCrest: 'Wappen entfernen',
    primaryColor: 'Primärfarbe',
    secondaryColor: 'Sekundärfarbe',
    numberColor: 'Nummernfarbe',
    accentColor: 'Menüfarbe',
    grassColor: 'Spielfeldfarbe',
    lineColor: 'Linienfarbe',
    grassPattern: 'Rasenstil',
    patLinesGrass: 'Mähstreifen',
    patCheckerGrass: 'Karo',
    patCirclesGrass: 'Kreise',
    patTacticsGrass: 'Taktiktafel',
    pattern: 'Muster',
    fieldEyebrow: 'SPIELFELD',
    fieldLook: 'Spielfeldlook',
    menuEyebrow: 'MENÜ',
    menuLook: 'Menülook',
    patPlain: 'Einfarbig',
    patStripes: 'Streifen (senkrecht)',
    patHoops: 'Streifen (waagerecht)',
    patDiagonal: 'Streifen (diagonal)',
    patSleeves: 'Ärmel in Sekundärfarbe',
    patHalves: 'Zwei Trikothälften',
    patSash: 'Schrägband',
    patCenterStripe: 'Breiter Mittelstreifen',
    shapeLabel: 'Form',
    shapeJersey: 'Trikot',
    shapeCircle: 'Kreis',
    kitRoleField: 'Feldspieler',
    lineupNameLabel: 'AUFSTELLUNGSNAME',
    clearLineup: '⟲ Aufstellung leeren',
    playerCountLabel: 'ANZAHL SPIELER',
    formationLabel: 'FORMATION',
    formationPlaceholder: 'z. B. 442/4-4-2',
    confirmFormation: '✓ Bestätigen',
    freeMove: 'Spieler fixieren',
    gridToggle: 'Raster',
    gridSizeLabel: 'RASTERGRÖSSE',
    contactToggle: 'Kontakt & Feedback',
    contactEyebrow: 'FEEDBACK',
    contactTitle: 'Kontakt & Feedback',
    contactText: 'Fehler gefunden oder einen Wunsch für die App? Schreib uns kurz.',
    contactNameLabel: 'Dein Name',
    contactEmailLabel: 'Deine E-Mail-Adresse',
    contactMessageLabel: 'Nachricht',
    contactMessagePlaceholder: 'Was möchtest du uns mitteilen?',
    contactSend: '✉ Absenden',
    contactSending: 'Wird gesendet …',
    contactCancel: 'Abbrechen',
    toastContactSent: 'Danke! Deine Nachricht wurde verschickt, eine Bestätigung geht an deine E-Mail-Adresse.',
    toastContactFailed: 'Senden fehlgeschlagen. Bitte später erneut versuchen.',
    toastContactMissingFields: 'Bitte Name, E-Mail-Adresse und Nachricht ausfüllen.',
    benchEyebrow: 'ERSATZBANK',
    benchOfMax: '/12 Spielern',
    addBenchSlot: '+ Bankspieler',
    coach: 'TRAINER',
    coachPlaceholder: 'Trainerplatz',
    free: 'Frei',
    playerEyebrow: 'SPIELER',
    editPlayer: 'Spieler bearbeiten',
    appointCaptain: 'Kapitän ernennen',
    removeCaptain: 'Kapitän entfernen',
    removePlayer: 'Spieler entfernen',
    editCoach: 'Trainer bearbeiten',
    rosterOf: 'KADER VON',
    allPlayers: 'Alle Spieler',
    playersInRoster: 'Spieler im Kader',
    colPlayer: 'Spieler',
    colNumber: 'Nr.',
    colYear: 'Jahrgang',
    colPosition: 'Position',
    rosterEmptyTitle: 'Dein Kader ist noch leer.',
    rosterEmptyText: 'Lege Spieler an und wähle sie für deine Aufstellung aus.',
    addFirstPlayer: 'Ersten Spieler hinzufügen',
    rosterHintEmpty: 'Noch kein Kader angelegt',
    rosterHintCount: 'Spieler angelegt',
    savedEyebrow: 'GESPEICHERT',
    teamsAndLineups: 'Mannschaften & Aufstellungen',
    open: 'Öffnen',
    deleteTeam: 'Löschen',
    playersLabel: 'Spieler',
    lineupsLabel: 'Aufstellungen',
    noLineupSaved: 'Noch keine Aufstellung gespeichert.',
    showMore: '↓ Mehr ansehen',
    showLess: '↑ Weniger anzeigen',
    custom: 'Benutzerdefiniert',
    name: 'Name',
    jerseyNumber: 'Rückennummer',
    birthYear: 'Jahrgang',
    position: 'Position',
    optional: 'optional',
    noSpecification: 'Keine Angabe',
    statusAvailable: 'Verfügbar',
    statusQuestionable: 'Fraglich',
    statusUnavailable: 'Nicht verfügbar',
    statusLabel: 'Status',
    posGoalkeeper: 'Torwart',
    posDefense: 'Abwehr',
    posMidfield: 'Mittelfeld',
    posForward: 'Sturm',
    playerPhoto: 'Spielerbild',
    profilePhoto: 'Profilbild',
    uploadImage: 'Bild hochladen',
    removeImage: 'Bild entfernen',
    deletePlayer: 'Spieler löschen',
    cancel: 'Abbrechen',
    save: 'Speichern',
    coachNamePlaceholder: 'Trainername',
    coachPhoto: 'Trainerbild',
    newTeamEyebrow: 'NEUE MANNSCHAFT',
    createTeamTitle: 'Mannschaft erstellen',
    createTeamSubmit: 'Mannschaft anlegen',
    editTeamEyebrow: 'MANNSCHAFT BEARBEITEN',
    editTeamTitle: 'Mannschaft bearbeiten',
    editTeam: 'Bearbeiten',
    accountEyebrow: 'KONTO',
    loginOrRegister: 'Anmelden oder registrieren',
    emailAddress: 'E-Mail-Adresse',
    continueWithEmail: 'Mit E-Mail fortfahren',
    continueWithGoogle: 'Mit Google fortfahren',
    authOr: 'oder',
    loggedInAs: 'Angemeldet als',
    logout: 'Abmelden',
    close: 'Schließen',
    emailLinkHint: 'Wir senden dir einen Anmeldelink per E-Mail – kein Passwort nötig.',
    toastEmailLinkSent: 'Anmeldelink wurde gesendet. Bitte E-Mail-Postfach prüfen.',
    toastEmailLinkFailed: 'Der Anmeldelink konnte nicht gesendet werden.',
    toastGoogleLoginFailed: 'Google-Anmeldung fehlgeschlagen.',
    toastLoggedIn: 'Erfolgreich angemeldet.',
    toastLoggedOut: 'Abgemeldet.',
    toastAuthLoading: 'Anmeldung wird noch geladen, bitte kurz warten.',
    toastCloudLoaded: 'Deine gespeicherten Mannschaften wurden geladen.',
    toastCloudBackupStarted: 'Deine Mannschaften werden jetzt mit deinem Konto gesichert.',
    toastCloudSyncFailed: 'Cloud-Synchronisierung fehlgeschlagen.',
    toastCloudSyncTooLarge:
      'Konnte nicht gespeichert werden: Zu viele/große Bilder (Spielerfotos, Wappen). Bitte einige Bilder entfernen oder verkleinern.',
    accountSettings: 'Konto-Einstellungen',
    username: 'Benutzername',
    usernameHint: 'Dein Benutzername wird z. B. beim Teilen deiner Mannschaft angezeigt.',
    usernameInvalid: 'Bitte 2–24 Zeichen, ohne führende/nachfolgende Leerzeichen.',
    chooseUsernameTitle: 'Wähle deinen Benutzernamen',
    continueLabel: 'Weiter',
    chooseUsernameText: 'Bevor es losgeht, brauchen wir noch einen Benutzernamen für dein neues Konto.',
    toastUsernameSaved: 'Benutzername gespeichert.',
    toastUsernameFailed: 'Benutzername konnte nicht gespeichert werden.',
    dangerZoneTitle: 'Konto löschen',
    dangerZoneHint:
      'Löscht dein Konto und alle damit verbundenen Daten (Mannschaften, Aufstellungen, Profil) unwiderruflich. Dies kann nicht rückgängig gemacht werden.',
    deleteAccountButton: 'Konto unwiderruflich löschen',
    dangerEyebrow: 'ACHTUNG',
    deleteAccountTitle: 'Konto unwiderruflich löschen',
    deleteAccountWarning:
      'Diese Aktion löscht dein Konto und alle deine Mannschaften, Aufstellungen und Profildaten dauerhaft. Es gibt keine Möglichkeit, dies rückgängig zu machen.',
    deleteConfirmWord: 'LÖSCHEN',
    deleteAccountConfirmLabel: 'Gib zur Bestätigung LÖSCHEN ein',
    deleteAccountConfirmButton: 'Konto endgültig löschen',
    deleteAccountConfirmMismatch: 'Bitte gib genau "LÖSCHEN" ein, um zu bestätigen.',
    deleteAccountFailed: 'Konto konnte nicht gelöscht werden. Bitte versuche es erneut.',
    deleteAccountReauthFailed: 'Erneute Anmeldung fehlgeschlagen. Bitte versuche es erneut, um dein Konto zu löschen.',
    toastAccountDeleted: 'Dein Konto und alle Daten wurden endgültig gelöscht.',
    addPlayerEyebrow: 'KADER ERWEITERN',
    editPlayerEyebrow: 'SPIELER BEARBEITEN',
    addPlayerTitle: 'Spieler hinzufügen',
    trainerFallback: 'Trainer',
    myTeam: 'Mein Team',
    newLineup: 'Neue Aufstellung',
    toastFormationApplied: 'Formation wurde angewendet.',
    toastBenchFull: 'Es sind bereits 12 Bankplätze belegt.',
    toastNumberTaken: 'Diese Rückennummer ist bereits vergeben.',
    toastPlayerAssigned: 'wurde direkt zugewiesen.',
    toastPlayerSaved: 'Spieler gespeichert.',
    toastPlayerDeleted: 'Spieler wurde gelöscht.',
    toastLineupSaved: 'Aufstellung wurde gespeichert.',
    toastLineupEmptyAlready: 'Die Aufstellung ist bereits leer.',
    toastLineupCleared: 'Aufstellung wurde geleert.',
    toastLineupLoaded: 'Aufstellung geladen.',
    toastLineupDeleted: 'Aufstellung gelöscht.',
    toastTeamCreated: 'Mannschaft wurde angelegt.',
    toastAtLeastOneTeam: 'Mindestens eine Mannschaft muss erhalten bleiben.',
    toastProfileSaved: 'Profil gespeichert.',
    toastTeamUpdated: 'Mannschaft wurde aktualisiert.',
    toastCustomFormationApplied: 'Eigene Formation wurde übernommen.',
    toastPngPlease: 'Bitte eine Formation eingeben.',
    toastFormationSum: 'Die Zahlen müssen zusammen',
    toastFormationSumEnd: 'ergeben (aktuell',
    toastFormationSumEnd2: ', Torwart nicht mitzählen).',
    toastFormationFormat: 'Bitte eine gültige Formation eingeben, z. B. 442/4-4-2',
    confirmDeletePlayer: 'wirklich aus dem Kader löschen?',
    confirmDeleteTeam1: 'mit Kader und allen Aufstellungen wirklich löschen?',
    confirmClearLineup: 'Startelf und Ersatzbank wirklich leeren?',
    pitchAriaLabel: 'Startelf auf dem Spielfeld',
    editShort: 'Bearbeiten',
    deleteShort: 'Löschen',
    nr: 'Nr.',
    yr: 'Jg.',
    coachAbbr: 'TR',
    preview: 'Vorschau',
    crestAlt: 'Wappen',
    pngSelectFile: 'Bitte eine PNG-Datei auswählen.',
    selectionTitleDefault: 'Kader',
    toastLineupFull: 'Die Startelf ist bereits voll.',
    deleteLineupTitle: 'Aufstellung löschen',
    editLineupTitle: 'Aufstellung bearbeiten',
    duplicateLineupTitle: 'Aufstellung duplizieren',
    toastLineupUpdated: 'Aufstellung aktualisiert.',
    toastLineupDuplicated: 'Aufstellung dupliziert.',
    copySuffix: 'Kopie',
    exportPngButton: '↗ Grafik als PNG',
    exportPngEyebrow: 'GRAFIK ERSTELLEN',
    exportPngTitle: 'Grafik als PNG',
    exportTypeLabel: 'ART DER GRAFIK',
    exportTypeLineup: 'Normale Grafik',
    exportTypeMatchday: 'Spieltagsgrafik',
    exportFormatLabel: 'FORMAT',
    exportFormatPortrait: '9:16 · Story',
    exportFormatSquare: '1:1 · Quadrat',
    exportFormatLandscape: '16:9 · Breit',
    exportPngConfirm: '↗ Grafik erstellen',
    shareTeam: 'Teilen',
    leaveTeam: 'Verlassen',
    sharedTeamHint: 'Diese Mannschaft ist geteilt',
    toastNoPermission: 'Dafür hast du keine Berechtigung.',
    roleOwner: 'Besitzer',
    roleFull: 'Vollzugriff',
    roleLineups: 'Nur Aufstellungen',
    roleViewer: 'Nur ansehen',
    confirmLeaveTeam: 'Diese geteilte Mannschaft wirklich verlassen?',
    confirmRemoveMember: 'wirklich aus der Mannschaft entfernen?',
    readOnlyBannerText: 'Du hast für diesen Bereich nur Lesezugriff.',
    shareTeamEyebrow: 'MANNSCHAFT TEILEN',
    shareTeamTitle: 'Teilen',
    inviteByEmail: 'Per E-Mail einladen',
    invitePlaceholder: 'E-Mail-Adresse',
    inviteRoleLabel: 'Berechtigung',
    sendInvite: 'Einladen',
    membersTitle: 'Mitglieder',
    loadingMembers: 'Mitglieder werden geladen…',
    removeMember: 'Entfernen',
    invitesTitle: 'Einladungen',
    noInvites: 'Keine offenen Einladungen.',
    acceptInvite: 'Annehmen',
    declineInvite: 'Ablehnen',
    toastInviteSent: 'Einladung verschickt.',
    toastInviteAccepted: 'Einladung angenommen.',
    toastMemberUpdated: 'Berechtigung geändert.',
    toastMemberRemoved: 'Mitglied entfernt.',
    openInvites: 'Einladungen',
    closeDialog: 'Schließen',
    colorPickerSave: 'Farbe speichern',
    colorPickerSavedColors: 'Gespeicherte Farben',
    colorPickerRemove: 'Entfernen',
    colorPickerChoose: 'Farbe wählen',
    promptConfirmEmail: 'Bitte gib zur Bestätigung deine E-Mail-Adresse ein:',
    csvExportButton: 'CSV exportieren',
    csvImportButton: 'CSV importieren',
    csvImportTitle: 'CSV mit den Spalten Name, Nummer, Jahrgang, Position importieren',
    toastCsvExported: 'Kader als CSV heruntergeladen.',
    toastCsvEmptyExport: 'Kader ist leer – nichts zu exportieren.',
    toastCsvImportFailed: 'CSV-Datei konnte nicht gelesen werden.',
    toastCsvImportedSuffix: 'Spieler importiert.',
    toastCsvSkippedSuffix: 'übersprungen (Rückennummer bereits vergeben).',
    inviteLinkTitle: 'Einladungslink',
    inviteLinkHint: 'Jede Person mit diesem Link kann der Mannschaft beitreten – ideal zum Teilen per WhatsApp & Co.',
    inviteLinkRoleLabel: 'Berechtigung für den Link',
    createInviteLink: 'Link erstellen',
    copyInviteLink: 'Kopieren',
    shareInviteLinkWhatsapp: 'Per WhatsApp teilen',
    regenerateInviteLink: 'Neu erzeugen',
    revokeInviteLink: 'Deaktivieren',
    toastInviteLinkCopied: 'Link kopiert.',
    toastInviteLinkCreated: 'Einladungslink erstellt.',
    toastInviteLinkRevoked: 'Einladungslink deaktiviert.',
    toastInviteLinkFailed: 'Aktion fehlgeschlagen.',
    confirmRevokeInviteLink: 'Bestehenden Einladungslink wirklich deaktivieren? Bereits verschickte Links funktionieren danach nicht mehr.',
    joinTeamDialogEyebrow: 'EINLADUNG',
    joinTeamDialogTitle: 'Mannschaft beitreten',
    joinTeamConfirm: 'Beitreten',
    joinTeamCancel: 'Nein, danke',
    toastInviteLinkInvalid: 'Dieser Einladungslink ist ungültig oder wurde deaktiviert.',
    toastJoinedTeam: 'Mannschaft beigetreten.',
    playerNotes: 'Notizen',
    playerNotesPlaceholder: 'z. B. Verletzung, besondere Absprachen …',
    playerNotesIndicatorTitle: 'Notiz vorhanden',
    toastLoginToJoinTeam: 'Melde dich an, um der Einladung zu folgen.',
    toastOfflineMode: 'Offline – Änderungen werden lokal gespeichert.',
    toastBackOnline: 'Wieder online – Änderungen werden synchronisiert.',
    toastLineupSavedOffline: 'Offline gespeichert: als neue Aufstellung angelegt, um nichts zu überschreiben.',
    offlineSuffix: 'Offline',
  },
  en: {
    activeTeam: 'ACTIVE TEAM',
    navLineup: 'Lineup',
    navRoster: 'Squad',
    navArchive: 'Teams',
    navDesign: 'Design',
    navMatchday: 'Matchday',
    pageTitleMatchday: 'Plan matchday',
    exportMatchdayPng: '↗ Graphic as PNG',
    matchdayEyebrow: 'MATCHDAY',
    matchdayDetails: 'Matchday info',
    opponentName: 'Opponent',
    opponentPlaceholder: 'Opponent name',
    homeAway: 'Home/Away',
    home: 'Home',
    away: 'Away',
    venue: 'Venue',
    venuePlaceholder: 'Ground, street',
    matchDate: 'Date',
    matchTime: 'Kick-off',
    opponentCrest: 'Opponent crest',
    toastMatchdayPngCreated: 'Matchday graphic created as PNG.',
    switchTheme: 'Switch theme',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    login: 'Log in',
    coachLogin: 'Coach login',
    profileLabel: 'Profile',
    coachArea: 'Profile',
    brandEyebrow: 'LINEUP AMATEUR',
    saveLineup: '✓ Save lineup',
    addPlayer: '+ Add player',
    createTeam: '+ Create team',
    pageTitleLineup: 'Plan lineup',
    pageTitleRoster: 'Manage squad',
    pageTitleArchive: 'Teams & lineups',
    pageTitleDesign: 'Customise design',
    assignPlayerEyebrow: 'ASSIGN PLAYER',
    searchPlayer: 'Search player',
    newPlayerForSlot: '+ New player for this slot',
    manageRoster: 'Manage squad',
    selectionNoSlot: 'Select a spot in the starting lineup or on the bench.',
    selectionNoSlotTitle: 'No slot selected.',
    selectionNoSlotText: 'First select a spot in the starting lineup or on the bench.',
    starterSlot: 'Starting lineup · Slot',
    benchSlotTitle: 'Bench',
    playerSelected: 'is selected.',
    chooseFromRoster: 'Choose a player from your squad.',
    rosterEmptyAssignTitle: 'Your squad is empty.',
    rosterEmptyAssignText: 'Add a new player right away.',
    allSelectedTitle: 'All players are assigned.',
    allSelectedText: 'Clear a slot to reassign.',
    noPlayerFoundTitle: 'No player found.',
    noPlayerFoundText: 'Adjust your search.',
    kit: 'KIT',
    trikotLook: 'Kit design',
    teamName: 'Team name',
    sportLabel: 'Sport',
    sportFootball: 'Football',
    sportFutsal: 'Small-sided football',
    crestPng: 'Crest (PNG)',
    uploadPng: 'Upload PNG',
    removeCrest: 'Remove crest',
    primaryColor: 'Primary colour',
    secondaryColor: 'Secondary colour',
    numberColor: 'Number colour',
    accentColor: 'Accent colour',
    grassColor: 'Pitch colour',
    lineColor: 'Line colour',
    grassPattern: 'Pitch style',
    patLinesGrass: 'Mowing lines',
    patCheckerGrass: 'Checkerboard',
    patCirclesGrass: 'Circles',
    patTacticsGrass: 'Tactics board',
    pattern: 'Pattern',
    fieldEyebrow: 'PITCH',
    fieldLook: 'Pitch look',
    menuEyebrow: 'MENU',
    menuLook: 'Menu look',
    patPlain: 'Plain',
    patStripes: 'Stripes (vertical)',
    patHoops: 'Hoops (horizontal)',
    patDiagonal: 'Stripes (diagonal)',
    patSleeves: 'Sleeves in secondary colour',
    patHalves: 'Two-tone halves',
    patSash: 'Sash',
    patCenterStripe: 'Wide centre stripe',
    shapeLabel: 'Shape',
    shapeJersey: 'Jersey',
    shapeCircle: 'Circle',
    kitRoleField: 'Outfield players',
    lineupNameLabel: 'LINEUP NAME',
    clearLineup: '⟲ Clear lineup',
    playerCountLabel: 'NUMBER OF PLAYERS',
    formationLabel: 'FORMATION',
    formationPlaceholder: 'e.g. 442/4-4-2',
    confirmFormation: '✓ Confirm',
    freeMove: 'Lock players',
    gridToggle: 'Grid',
    gridSizeLabel: 'GRID SIZE',
    contactToggle: 'Contact & feedback',
    contactEyebrow: 'FEEDBACK',
    contactTitle: 'Contact & feedback',
    contactText: 'Found a bug or have a feature request? Send us a quick note.',
    contactNameLabel: 'Your name',
    contactEmailLabel: 'Your email address',
    contactMessageLabel: 'Message',
    contactMessagePlaceholder: 'What would you like to tell us?',
    contactSend: '✉ Send',
    contactSending: 'Sending …',
    contactCancel: 'Cancel',
    toastContactSent: 'Thanks! Your message was sent, a confirmation is on its way to your email.',
    toastContactFailed: 'Sending failed. Please try again later.',
    toastContactMissingFields: 'Please fill in your name, email address, and a message.',
    benchEyebrow: 'BENCH',
    benchOfMax: '/12 players',
    addBenchSlot: '+ Bench player',
    coach: 'COACH',
    coachPlaceholder: 'Coach slot',
    free: 'Free',
    playerEyebrow: 'PLAYER',
    editPlayer: 'Edit player',
    appointCaptain: 'Appoint captain',
    removeCaptain: 'Remove captain',
    removePlayer: 'Remove player',
    editCoach: 'Edit coach',
    rosterOf: 'SQUAD OF',
    allPlayers: 'All players',
    playersInRoster: 'Players in squad',
    colPlayer: 'Player',
    colNumber: 'No.',
    colYear: 'Birth year',
    colPosition: 'Position',
    rosterEmptyTitle: 'Your squad is still empty.',
    rosterEmptyText: 'Add players and pick them for your lineup.',
    addFirstPlayer: 'Add first player',
    rosterHintEmpty: 'No squad created yet',
    rosterHintCount: 'players added',
    savedEyebrow: 'SAVED',
    teamsAndLineups: 'Teams & lineups',
    open: 'Open',
    deleteTeam: 'Delete',
    playersLabel: 'players',
    lineupsLabel: 'lineups',
    noLineupSaved: 'No lineup saved yet.',
    showMore: '↓ Show more',
    showLess: '↑ Show less',
    custom: 'Custom',
    name: 'Name',
    jerseyNumber: 'Jersey number',
    birthYear: 'Birth year',
    position: 'Position',
    optional: 'optional',
    noSpecification: 'Not specified',
    statusAvailable: 'Available',
    statusQuestionable: 'Questionable',
    statusUnavailable: 'Unavailable',
    statusLabel: 'Status',
    posGoalkeeper: 'Goalkeeper',
    posDefense: 'Defence',
    posMidfield: 'Midfield',
    posForward: 'Attack',
    playerPhoto: 'Player photo',
    profilePhoto: 'Profile photo',
    uploadImage: 'Upload image',
    removeImage: 'Remove image',
    deletePlayer: 'Delete player',
    cancel: 'Cancel',
    save: 'Save',
    coachNamePlaceholder: 'Coach name',
    coachPhoto: 'Coach photo',
    newTeamEyebrow: 'NEW TEAM',
    createTeamTitle: 'Create team',
    createTeamSubmit: 'Create team',
    editTeamEyebrow: 'EDIT TEAM',
    editTeamTitle: 'Edit team',
    editTeam: 'Edit',
    accountEyebrow: 'ACCOUNT',
    loginOrRegister: 'Log in or sign up',
    emailAddress: 'Email address',
    continueWithEmail: 'Continue with email',
    continueWithGoogle: 'Continue with Google',
    authOr: 'or',
    loggedInAs: 'Logged in as',
    logout: 'Log out',
    close: 'Close',
    emailLinkHint: "We'll send you a sign-in link by email – no password needed.",
    toastEmailLinkSent: 'Sign-in link sent. Please check your inbox.',
    toastEmailLinkFailed: 'The sign-in link could not be sent.',
    toastGoogleLoginFailed: 'Google sign-in failed.',
    toastLoggedIn: 'Signed in successfully.',
    toastLoggedOut: 'Signed out.',
    toastAuthLoading: 'Sign-in is still loading, please wait a moment.',
    toastCloudLoaded: 'Your saved teams have been loaded.',
    toastCloudBackupStarted: 'Your teams are now being backed up to your account.',
    toastCloudSyncFailed: 'Cloud sync failed.',
    toastCloudSyncTooLarge:
      'Could not save: too many/large images (player photos, crests). Please remove or shrink some images.',
    accountSettings: 'Account settings',
    username: 'Username',
    usernameHint: 'Your username is shown, for example, when you share your team.',
    usernameInvalid: 'Please use 2–24 characters, without leading/trailing spaces.',
    chooseUsernameTitle: 'Choose your username',
    continueLabel: 'Continue',
    chooseUsernameText: 'Before you get started, your new account needs a username.',
    toastUsernameSaved: 'Username saved.',
    toastUsernameFailed: 'Username could not be saved.',
    dangerZoneTitle: 'Delete account',
    dangerZoneHint:
      'Permanently deletes your account and all associated data (teams, lineups, profile). This cannot be undone.',
    deleteAccountButton: 'Permanently delete account',
    dangerEyebrow: 'WARNING',
    deleteAccountTitle: 'Permanently delete account',
    deleteAccountWarning:
      'This action permanently deletes your account and all your teams, lineups, and profile data. There is no way to undo this.',
    deleteConfirmWord: 'DELETE',
    deleteAccountConfirmLabel: 'Type DELETE to confirm',
    deleteAccountConfirmButton: 'Permanently delete account',
    deleteAccountConfirmMismatch: 'Please type exactly "DELETE" to confirm.',
    deleteAccountFailed: 'Your account could not be deleted. Please try again.',
    deleteAccountReauthFailed: 'Re-authentication failed. Please try again to delete your account.',
    toastAccountDeleted: 'Your account and all data have been permanently deleted.',
    addPlayerEyebrow: 'EXPAND SQUAD',
    editPlayerEyebrow: 'EDIT PLAYER',
    addPlayerTitle: 'Add player',
    trainerFallback: 'Coach',
    myTeam: 'My Team',
    newLineup: 'New lineup',
    toastFormationApplied: 'Formation has been applied.',
    toastBenchFull: '12 bench slots are already occupied.',
    toastNumberTaken: 'This jersey number is already taken.',
    toastPlayerAssigned: 'was assigned directly.',
    toastPlayerSaved: 'Player saved.',
    toastPlayerDeleted: 'Player deleted.',
    toastLineupSaved: 'Lineup saved.',
    toastLineupEmptyAlready: 'The lineup is already empty.',
    toastLineupCleared: 'Lineup cleared.',
    toastLineupLoaded: 'Lineup loaded.',
    toastLineupDeleted: 'Lineup deleted.',
    toastTeamCreated: 'Team created.',
    toastAtLeastOneTeam: 'At least one team must remain.',
    toastProfileSaved: 'Profile saved.',
    toastTeamUpdated: 'Team updated.',
    toastCustomFormationApplied: 'Custom formation applied.',
    toastPngPlease: 'Please enter a formation.',
    toastFormationSum: 'The numbers must add up to',
    toastFormationSumEnd: '(currently',
    toastFormationSumEnd2: ', not counting the goalkeeper).',
    toastFormationFormat: 'Please enter a valid formation, e.g. 442/4-4-2',
    confirmDeletePlayer: '– really remove from the squad?',
    confirmDeleteTeam1: '– really delete this, along with its squad and all lineups?',
    confirmClearLineup: 'Really clear the starting lineup and bench?',
    pitchAriaLabel: 'Starting lineup on the pitch',
    editShort: 'Edit',
    deleteShort: 'Delete',
    nr: 'No.',
    yr: 'Yr.',
    coachAbbr: 'CO',
    preview: 'Preview',
    crestAlt: 'Crest',
    pngSelectFile: 'Please select a PNG file.',
    selectionTitleDefault: 'Squad',
    toastLineupFull: 'The starting lineup is already full.',
    deleteLineupTitle: 'Delete lineup',
    editLineupTitle: 'Edit lineup',
    duplicateLineupTitle: 'Duplicate lineup',
    toastLineupUpdated: 'Lineup updated.',
    toastLineupDuplicated: 'Lineup duplicated.',
    copySuffix: 'Copy',
    exportPngButton: '↗ Graphic as PNG',
    exportPngEyebrow: 'CREATE GRAPHIC',
    exportPngTitle: 'Graphic as PNG',
    exportTypeLabel: 'GRAPHIC TYPE',
    exportTypeLineup: 'Standard graphic',
    exportTypeMatchday: 'Matchday graphic',
    exportFormatLabel: 'FORMAT',
    exportFormatPortrait: '9:16 · Story',
    exportFormatSquare: '1:1 · Square',
    exportFormatLandscape: '16:9 · Wide',
    exportPngConfirm: '↗ Create graphic',
    shareTeam: 'Share',
    leaveTeam: 'Leave',
    sharedTeamHint: 'This team is shared',
    toastNoPermission: "You don't have permission to do that.",
    roleOwner: 'Owner',
    roleFull: 'Full access',
    roleLineups: 'Lineups only',
    roleViewer: 'View only',
    confirmLeaveTeam: 'Really leave this shared team?',
    confirmRemoveMember: '– really remove from the team?',
    readOnlyBannerText: 'You only have read access to this area.',
    shareTeamEyebrow: 'SHARE TEAM',
    shareTeamTitle: 'Share',
    inviteByEmail: 'Invite by email',
    invitePlaceholder: 'Email address',
    inviteRoleLabel: 'Permission',
    sendInvite: 'Invite',
    membersTitle: 'Members',
    loadingMembers: 'Loading members…',
    removeMember: 'Remove',
    invitesTitle: 'Invites',
    noInvites: 'No open invites.',
    acceptInvite: 'Accept',
    declineInvite: 'Decline',
    toastInviteSent: 'Invite sent.',
    toastInviteAccepted: 'Invite accepted.',
    toastMemberUpdated: 'Permission changed.',
    toastMemberRemoved: 'Member removed.',
    openInvites: 'Invites',
    closeDialog: 'Close',
    colorPickerSave: 'Save colour',
    colorPickerSavedColors: 'Saved colours',
    colorPickerRemove: 'Remove',
    colorPickerChoose: 'Choose colour',
    promptConfirmEmail: 'Please enter your email address to confirm:',
    csvExportButton: 'Export CSV',
    csvImportButton: 'Import CSV',
    csvImportTitle: 'Import a CSV with the columns name, number, year, position',
    toastCsvExported: 'Squad downloaded as CSV.',
    toastCsvEmptyExport: 'Squad is empty – nothing to export.',
    toastCsvImportFailed: 'Could not read the CSV file.',
    toastCsvImportedSuffix: 'players imported.',
    toastCsvSkippedSuffix: 'skipped (jersey number already taken).',
    inviteLinkTitle: 'Invite link',
    inviteLinkHint: 'Anyone with this link can join the team – great for sharing via WhatsApp & co.',
    inviteLinkRoleLabel: 'Permission for the link',
    createInviteLink: 'Create link',
    copyInviteLink: 'Copy',
    shareInviteLinkWhatsapp: 'Share via WhatsApp',
    regenerateInviteLink: 'Regenerate',
    revokeInviteLink: 'Revoke',
    toastInviteLinkCopied: 'Link copied.',
    toastInviteLinkCreated: 'Invite link created.',
    toastInviteLinkRevoked: 'Invite link revoked.',
    toastInviteLinkFailed: 'Action failed.',
    confirmRevokeInviteLink: 'Really revoke the current invite link? Links already shared will stop working.',
    joinTeamDialogEyebrow: 'INVITATION',
    joinTeamDialogTitle: 'Join team',
    joinTeamConfirm: 'Join',
    joinTeamCancel: 'No thanks',
    toastInviteLinkInvalid: 'This invite link is invalid or has been revoked.',
    toastJoinedTeam: 'Joined the team.',
    playerNotes: 'Notes',
    playerNotesPlaceholder: 'e.g. injury, special arrangements …',
    playerNotesIndicatorTitle: 'Note available',
    toastLoginToJoinTeam: 'Log in to follow the invitation.',
    toastOfflineMode: "Offline – changes are saved locally.",
    toastBackOnline: 'Back online – syncing your changes.',
    toastLineupSavedOffline: 'Saved offline: created as a new lineup so nothing gets overwritten.',
    offlineSuffix: 'Offline',
  },
  es: {
    activeTeam: 'EQUIPO ACTIVO',
    navLineup: 'Alineación',
    navRoster: 'Plantilla',
    navArchive: 'Equipos',
    navDesign: 'Diseño',
    navMatchday: 'Jornada',
    pageTitleMatchday: 'Planificar jornada',
    exportMatchdayPng: '↗ Gráfico como PNG',
    matchdayEyebrow: 'JORNADA',
    matchdayDetails: 'Datos del partido',
    opponentName: 'Rival',
    opponentPlaceholder: 'Nombre del rival',
    homeAway: 'Local/Visitante',
    home: 'Local',
    away: 'Visitante',
    venue: 'Estadio',
    venuePlaceholder: 'Campo, calle',
    matchDate: 'Fecha',
    matchTime: 'Saque inicial',
    opponentCrest: 'Escudo del rival',
    toastMatchdayPngCreated: 'Gráfico de la jornada creado como PNG.',
    switchTheme: 'Cambiar tema',
    darkMode: 'Modo oscuro',
    lightMode: 'Modo claro',
    login: 'Iniciar sesión',
    coachLogin: 'Acceso entrenador',
    profileLabel: 'Perfil',
    coachArea: 'Perfil',
    brandEyebrow: 'LINEUP AMATEUR',
    saveLineup: '✓ Guardar alineación',
    addPlayer: '+ Añadir jugador',
    createTeam: '+ Crear equipo',
    pageTitleLineup: 'Planificar alineación',
    pageTitleRoster: 'Gestionar plantilla',
    pageTitleArchive: 'Equipos y alineaciones',
    pageTitleDesign: 'Personalizar diseño',
    assignPlayerEyebrow: 'ASIGNAR JUGADOR',
    searchPlayer: 'Buscar jugador',
    newPlayerForSlot: '+ Nuevo jugador para este puesto',
    manageRoster: 'Gestionar plantilla',
    selectionNoSlot: 'Selecciona un puesto en el once inicial o en el banquillo.',
    selectionNoSlotTitle: 'Ningún puesto seleccionado.',
    selectionNoSlotText: 'Primero selecciona un puesto en el once inicial o en el banquillo.',
    starterSlot: 'Once inicial · Puesto',
    benchSlotTitle: 'Banquillo',
    playerSelected: 'está seleccionado.',
    chooseFromRoster: 'Elige un jugador de la plantilla.',
    rosterEmptyAssignTitle: 'Tu plantilla está vacía.',
    rosterEmptyAssignText: 'Crea un nuevo jugador ahora mismo.',
    allSelectedTitle: 'Todos los jugadores están asignados.',
    allSelectedText: 'Vacía un puesto para reasignar.',
    noPlayerFoundTitle: 'Ningún jugador encontrado.',
    noPlayerFoundText: 'Ajusta la búsqueda.',
    kit: 'CAMISETA',
    trikotLook: 'Diseño de camiseta',
    teamName: 'Nombre del equipo',
    sportLabel: 'Deporte',
    sportFootball: 'Fútbol',
    sportFutsal: 'Fútbol sala',
    crestPng: 'Escudo (PNG)',
    uploadPng: 'Subir PNG',
    removeCrest: 'Quitar escudo',
    primaryColor: 'Color primario',
    secondaryColor: 'Color secundario',
    numberColor: 'Color del número',
    accentColor: 'Color del menú',
    grassColor: 'Color del campo',
    lineColor: 'Color de las líneas',
    grassPattern: 'Estilo del campo',
    patLinesGrass: 'Rayas de siega',
    patCheckerGrass: 'Cuadros',
    patCirclesGrass: 'Círculos',
    patTacticsGrass: 'Pizarra táctica',
    pattern: 'Patrón',
    fieldEyebrow: 'CAMPO',
    fieldLook: 'Estilo del campo',
    menuEyebrow: 'MENÚ',
    menuLook: 'Estilo del menú',
    patPlain: 'Liso',
    patStripes: 'Rayas (verticales)',
    patHoops: 'Rayas (horizontales)',
    patDiagonal: 'Rayas (diagonales)',
    patSleeves: 'Mangas en color secundario',
    patHalves: 'Dos mitades',
    patSash: 'Banda diagonal',
    patCenterStripe: 'Franja central ancha',
    shapeLabel: 'Forma',
    shapeJersey: 'Camiseta',
    shapeCircle: 'Círculo',
    kitRoleField: 'Jugadores de campo',
    lineupNameLabel: 'NOMBRE DE LA ALINEACIÓN',
    clearLineup: '⟲ Vaciar alineación',
    playerCountLabel: 'NÚMERO DE JUGADORES',
    formationLabel: 'FORMACIÓN',
    formationPlaceholder: 'p. ej. 442/4-4-2',
    confirmFormation: '✓ Confirmar',
    freeMove: 'Fijar jugadores',
    gridToggle: 'Cuadrícula',
    gridSizeLabel: 'TAMAÑO DE CUADRÍCULA',
    contactToggle: 'Contacto y sugerencias',
    contactEyebrow: 'COMENTARIOS',
    contactTitle: 'Contacto y sugerencias',
    contactText: '¿Encontraste un error o tienes una idea para la app? Escríbenos.',
    contactNameLabel: 'Tu nombre',
    contactEmailLabel: 'Tu correo electrónico',
    contactMessageLabel: 'Mensaje',
    contactMessagePlaceholder: '¿Qué quieres contarnos?',
    contactSend: '✉ Enviar',
    contactSending: 'Enviando…',
    contactCancel: 'Cancelar',
    toastContactSent: '¡Gracias! Tu mensaje fue enviado, recibirás una confirmación por correo.',
    toastContactFailed: 'No se pudo enviar. Inténtalo más tarde.',
    toastContactMissingFields: 'Completa nombre, correo electrónico y mensaje.',
    benchEyebrow: 'BANQUILLO',
    benchOfMax: '/12 jugadores',
    addBenchSlot: '+ Suplente',
    coach: 'ENTRENADOR',
    coachPlaceholder: 'Puesto de entrenador',
    free: 'Libre',
    playerEyebrow: 'JUGADOR',
    editPlayer: 'Editar jugador',
    appointCaptain: 'Nombrar capitán',
    removeCaptain: 'Quitar capitán',
    removePlayer: 'Quitar jugador',
    editCoach: 'Editar entrenador',
    rosterOf: 'PLANTILLA DE',
    allPlayers: 'Todos los jugadores',
    playersInRoster: 'Jugadores en la plantilla',
    colPlayer: 'Jugador',
    colNumber: 'Núm.',
    colYear: 'Año',
    colPosition: 'Posición',
    rosterEmptyTitle: 'Tu plantilla todavía está vacía.',
    rosterEmptyText: 'Añade jugadores y selecciónalos para tu alineación.',
    addFirstPlayer: 'Añadir primer jugador',
    rosterHintEmpty: 'Aún no hay plantilla creada',
    rosterHintCount: 'jugadores creados',
    savedEyebrow: 'GUARDADO',
    teamsAndLineups: 'Equipos y alineaciones',
    open: 'Abrir',
    deleteTeam: 'Eliminar',
    playersLabel: 'jugadores',
    lineupsLabel: 'alineaciones',
    noLineupSaved: 'Aún no hay alineación guardada.',
    showMore: '↓ Ver más',
    showLess: '↑ Ver menos',
    custom: 'Personalizado',
    name: 'Nombre',
    jerseyNumber: 'Número de camiseta',
    birthYear: 'Año de nacimiento',
    position: 'Posición',
    optional: 'opcional',
    noSpecification: 'Sin especificar',
    statusAvailable: 'Disponible',
    statusQuestionable: 'Cuestionable',
    statusUnavailable: 'No disponible',
    statusLabel: 'Estado',
    posGoalkeeper: 'Portero',
    posDefense: 'Defensa',
    posMidfield: 'Centrocampo',
    posForward: 'Ataque',
    playerPhoto: 'Foto del jugador',
    profilePhoto: 'Foto de perfil',
    uploadImage: 'Subir imagen',
    removeImage: 'Quitar imagen',
    deletePlayer: 'Eliminar jugador',
    cancel: 'Cancelar',
    save: 'Guardar',
    coachNamePlaceholder: 'Nombre del entrenador',
    coachPhoto: 'Foto del entrenador',
    newTeamEyebrow: 'NUEVO EQUIPO',
    createTeamTitle: 'Crear equipo',
    createTeamSubmit: 'Crear equipo',
    editTeamEyebrow: 'EDITAR EQUIPO',
    editTeamTitle: 'Editar equipo',
    editTeam: 'Editar',
    accountEyebrow: 'CUENTA',
    loginOrRegister: 'Iniciar sesión o registrarse',
    emailAddress: 'Correo electrónico',
    continueWithEmail: 'Continuar con correo electrónico',
    continueWithGoogle: 'Continuar con Google',
    authOr: 'o',
    loggedInAs: 'Conectado como',
    logout: 'Cerrar sesión',
    close: 'Cerrar',
    emailLinkHint: 'Te enviaremos un enlace de acceso por correo, sin contraseña.',
    toastEmailLinkSent: 'Enlace de acceso enviado. Revisa tu correo.',
    toastEmailLinkFailed: 'No se pudo enviar el enlace de acceso.',
    toastGoogleLoginFailed: 'Error al iniciar sesión con Google.',
    toastLoggedIn: 'Sesión iniciada correctamente.',
    toastLoggedOut: 'Sesión cerrada.',
    toastAuthLoading: 'El inicio de sesión aún se está cargando, espera un momento.',
    toastCloudLoaded: 'Se cargaron tus equipos guardados.',
    toastCloudBackupStarted: 'Tus equipos ahora se respaldan en tu cuenta.',
    toastCloudSyncFailed: 'Fallo en la sincronización en la nube.',
    toastCloudSyncTooLarge:
      'No se pudo guardar: demasiadas imágenes o demasiado grandes (fotos de jugadores, escudos). Elimina o reduce algunas imágenes.',
    accountSettings: 'Ajustes de la cuenta',
    username: 'Nombre de usuario',
    usernameHint: 'Tu nombre de usuario se muestra, por ejemplo, al compartir tu equipo.',
    usernameInvalid: 'Usa entre 2 y 24 caracteres, sin espacios al inicio o al final.',
    chooseUsernameTitle: 'Elige tu nombre de usuario',
    continueLabel: 'Continuar',
    chooseUsernameText: 'Antes de empezar, tu nueva cuenta necesita un nombre de usuario.',
    toastUsernameSaved: 'Nombre de usuario guardado.',
    toastUsernameFailed: 'No se pudo guardar el nombre de usuario.',
    dangerZoneTitle: 'Eliminar cuenta',
    dangerZoneHint:
      'Elimina tu cuenta y todos los datos asociados (equipos, alineaciones, perfil) de forma permanente. Esta acción no se puede deshacer.',
    deleteAccountButton: 'Eliminar cuenta definitivamente',
    dangerEyebrow: 'ATENCIÓN',
    deleteAccountTitle: 'Eliminar cuenta definitivamente',
    deleteAccountWarning:
      'Esta acción elimina tu cuenta y todos tus equipos, alineaciones y datos de perfil de forma permanente. No hay manera de deshacerlo.',
    deleteConfirmWord: 'ELIMINAR',
    deleteAccountConfirmLabel: 'Escribe ELIMINAR para confirmar',
    deleteAccountConfirmButton: 'Eliminar cuenta definitivamente',
    deleteAccountConfirmMismatch: 'Escribe exactamente "ELIMINAR" para confirmar.',
    deleteAccountFailed: 'No se pudo eliminar la cuenta. Inténtalo de nuevo.',
    deleteAccountReauthFailed: 'Fallo al volver a iniciar sesión. Inténtalo de nuevo para eliminar tu cuenta.',
    toastAccountDeleted: 'Tu cuenta y todos los datos se eliminaron definitivamente.',
    addPlayerEyebrow: 'AMPLIAR PLANTILLA',
    editPlayerEyebrow: 'EDITAR JUGADOR',
    addPlayerTitle: 'Añadir jugador',
    trainerFallback: 'Entrenador',
    myTeam: 'Mi equipo',
    newLineup: 'Nueva alineación',
    toastFormationApplied: 'Se aplicó la formación.',
    toastBenchFull: 'Ya hay 12 puestos de banquillo ocupados.',
    toastNumberTaken: 'Este número de camiseta ya está asignado.',
    toastPlayerAssigned: 'fue asignado directamente.',
    toastPlayerSaved: 'Jugador guardado.',
    toastPlayerDeleted: 'Jugador eliminado.',
    toastLineupSaved: 'Alineación guardada.',
    toastLineupEmptyAlready: 'La alineación ya está vacía.',
    toastLineupCleared: 'Alineación vaciada.',
    toastLineupLoaded: 'Alineación cargada.',
    toastLineupDeleted: 'Alineación eliminada.',
    toastTeamCreated: 'Equipo creado.',
    toastAtLeastOneTeam: 'Debe quedar al menos un equipo.',
    toastProfileSaved: 'Perfil guardado.',
    toastTeamUpdated: 'Equipo actualizado.',
    toastCustomFormationApplied: 'Se aplicó la formación personalizada.',
    toastPngPlease: 'Introduce una formación.',
    toastFormationSum: 'Los números deben sumar',
    toastFormationSumEnd: '(actualmente',
    toastFormationSumEnd2: ', sin contar al portero).',
    toastFormationFormat: 'Introduce una formación válida, p. ej. 442/4-4-2',
    confirmDeletePlayer: '– ¿se elimina realmente de la plantilla?',
    confirmDeleteTeam1: '– ¿se elimina realmente, con la plantilla y todas las alineaciones?',
    confirmClearLineup: '¿Vaciar realmente el once inicial y el banquillo?',
    pitchAriaLabel: 'Once inicial en el campo',
    editShort: 'Editar',
    deleteShort: 'Eliminar',
    nr: 'Núm.',
    yr: 'Año',
    coachAbbr: 'DT',
    preview: 'Vista previa',
    crestAlt: 'Escudo',
    pngSelectFile: 'Selecciona un archivo PNG.',
    selectionTitleDefault: 'Plantilla',
    toastLineupFull: 'El once inicial ya está completo.',
    deleteLineupTitle: 'Eliminar alineación',
    editLineupTitle: 'Editar alineación',
    duplicateLineupTitle: 'Duplicar alineación',
    toastLineupUpdated: 'Alineación actualizada.',
    toastLineupDuplicated: 'Alineación duplicada.',
    copySuffix: 'Copia',
    exportPngButton: '↗ Gráfico como PNG',
    exportPngEyebrow: 'CREAR GRÁFICO',
    exportPngTitle: 'Gráfico como PNG',
    exportTypeLabel: 'TIPO DE GRÁFICO',
    exportTypeLineup: 'Gráfico normal',
    exportTypeMatchday: 'Gráfico de la jornada',
    exportFormatLabel: 'FORMATO',
    exportFormatPortrait: '9:16 · Historia',
    exportFormatSquare: '1:1 · Cuadrado',
    exportFormatLandscape: '16:9 · Ancho',
    exportPngConfirm: '↗ Crear gráfico',
    shareTeam: 'Compartir',
    leaveTeam: 'Abandonar',
    sharedTeamHint: 'Este equipo está compartido',
    toastNoPermission: 'No tienes permiso para hacer eso.',
    roleOwner: 'Propietario',
    roleFull: 'Acceso total',
    roleLineups: 'Solo alineaciones',
    roleViewer: 'Solo ver',
    confirmLeaveTeam: '¿Abandonar este equipo compartido?',
    confirmRemoveMember: '– ¿eliminar realmente del equipo?',
    readOnlyBannerText: 'Solo tienes acceso de lectura a esta sección.',
    shareTeamEyebrow: 'COMPARTIR EQUIPO',
    shareTeamTitle: 'Compartir',
    inviteByEmail: 'Invitar por correo',
    invitePlaceholder: 'Correo electrónico',
    inviteRoleLabel: 'Permiso',
    sendInvite: 'Invitar',
    membersTitle: 'Miembros',
    loadingMembers: 'Cargando miembros…',
    removeMember: 'Eliminar',
    invitesTitle: 'Invitaciones',
    noInvites: 'No hay invitaciones pendientes.',
    acceptInvite: 'Aceptar',
    declineInvite: 'Rechazar',
    toastInviteSent: 'Invitación enviada.',
    toastInviteAccepted: 'Invitación aceptada.',
    toastMemberUpdated: 'Permiso modificado.',
    toastMemberRemoved: 'Miembro eliminado.',
    openInvites: 'Invitaciones',
    closeDialog: 'Cerrar',
    colorPickerSave: 'Guardar color',
    colorPickerSavedColors: 'Colores guardados',
    colorPickerRemove: 'Eliminar',
    colorPickerChoose: 'Elegir color',
    promptConfirmEmail: 'Introduce tu dirección de correo electrónico para confirmar:',
    csvExportButton: 'Exportar CSV',
    csvImportButton: 'Importar CSV',
    csvImportTitle: 'Importa un CSV con las columnas nombre, número, año, posición',
    toastCsvExported: 'Plantilla descargada como CSV.',
    toastCsvEmptyExport: 'La plantilla está vacía, no hay nada que exportar.',
    toastCsvImportFailed: 'No se pudo leer el archivo CSV.',
    toastCsvImportedSuffix: 'jugadores importados.',
    toastCsvSkippedSuffix: 'omitidos (número de dorsal ya asignado).',
    inviteLinkTitle: 'Enlace de invitación',
    inviteLinkHint: 'Cualquier persona con este enlace puede unirse al equipo, ideal para compartir por WhatsApp y similares.',
    inviteLinkRoleLabel: 'Permiso del enlace',
    createInviteLink: 'Crear enlace',
    copyInviteLink: 'Copiar',
    shareInviteLinkWhatsapp: 'Compartir por WhatsApp',
    regenerateInviteLink: 'Generar de nuevo',
    revokeInviteLink: 'Desactivar',
    toastInviteLinkCopied: 'Enlace copiado.',
    toastInviteLinkCreated: 'Enlace de invitación creado.',
    toastInviteLinkRevoked: 'Enlace de invitación desactivado.',
    toastInviteLinkFailed: 'La acción ha fallado.',
    confirmRevokeInviteLink: '¿Desactivar realmente el enlace de invitación actual? Los enlaces ya compartidos dejarán de funcionar.',
    joinTeamDialogEyebrow: 'INVITACIÓN',
    joinTeamDialogTitle: 'Unirse al equipo',
    joinTeamConfirm: 'Unirse',
    joinTeamCancel: 'No, gracias',
    toastInviteLinkInvalid: 'Este enlace de invitación no es válido o ha sido desactivado.',
    toastJoinedTeam: 'Te has unido al equipo.',
    playerNotes: 'Notas',
    playerNotesPlaceholder: 'p. ej. lesión, acuerdos especiales …',
    playerNotesIndicatorTitle: 'Nota disponible',
    toastLoginToJoinTeam: 'Inicia sesión para seguir la invitación.',
    toastOfflineMode: 'Sin conexión: los cambios se guardan localmente.',
    toastBackOnline: 'De nuevo en línea: sincronizando tus cambios.',
    toastLineupSavedOffline: 'Guardado sin conexión: se creó como una nueva alineación para no sobrescribir nada.',
    offlineSuffix: 'Offline',
  },
  fr: {
    activeTeam: 'ÉQUIPE ACTIVE',
    navLineup: 'Composition',
    navRoster: 'Effectif',
    navArchive: 'Équipes',
    navDesign: 'Design',
    navMatchday: 'Jour de match',
    pageTitleMatchday: 'Planifier le jour de match',
    exportMatchdayPng: '↗ Visuel en PNG',
    matchdayEyebrow: 'JOUR DE MATCH',
    matchdayDetails: 'Infos du match',
    opponentName: 'Adversaire',
    opponentPlaceholder: "Nom de l'adversaire",
    homeAway: 'Domicile/Extérieur',
    home: 'Domicile',
    away: 'Extérieur',
    venue: 'Stade',
    venuePlaceholder: 'Terrain, rue',
    matchDate: 'Date',
    matchTime: "Coup d'envoi",
    opponentCrest: "Blason de l'adversaire",
    toastMatchdayPngCreated: 'Visuel du jour de match créé en PNG.',
    switchTheme: 'Changer de thème',
    darkMode: 'Mode sombre',
    lightMode: 'Mode clair',
    login: 'Connexion',
    coachLogin: 'Connexion entraîneur',
    profileLabel: 'Profil',
    coachArea: 'Profil',
    brandEyebrow: 'LINEUP AMATEUR',
    saveLineup: '✓ Enregistrer la composition',
    addPlayer: '+ Ajouter un joueur',
    createTeam: '+ Créer une équipe',
    pageTitleLineup: 'Planifier la composition',
    pageTitleRoster: "Gérer l'effectif",
    pageTitleArchive: 'Équipes et compositions',
    pageTitleDesign: 'Personnaliser le design',
    assignPlayerEyebrow: 'ASSIGNER UN JOUEUR',
    searchPlayer: 'Rechercher un joueur',
    newPlayerForSlot: '+ Nouveau joueur pour ce poste',
    manageRoster: "Gérer l'effectif",
    selectionNoSlot: 'Sélectionnez un poste dans le onze de départ ou sur le banc.',
    selectionNoSlotTitle: 'Aucun poste sélectionné.',
    selectionNoSlotText: "Sélectionnez d'abord un poste dans le onze de départ ou sur le banc.",
    starterSlot: 'Onze de départ · Poste',
    benchSlotTitle: 'Banc',
    playerSelected: 'est sélectionné.',
    chooseFromRoster: "Choisissez un joueur dans l'effectif.",
    rosterEmptyAssignTitle: 'Votre effectif est vide.',
    rosterEmptyAssignText: 'Créez tout de suite un nouveau joueur.',
    allSelectedTitle: 'Tous les joueurs sont assignés.',
    allSelectedText: 'Libérez un poste pour réassigner.',
    noPlayerFoundTitle: 'Aucun joueur trouvé.',
    noPlayerFoundText: 'Ajustez la recherche.',
    kit: 'MAILLOT',
    trikotLook: 'Look du maillot',
    teamName: "Nom de l'équipe",
    sportLabel: 'Sport',
    sportFootball: 'Football',
    sportFutsal: 'Futsal',
    crestPng: 'Blason (PNG)',
    uploadPng: 'Importer un PNG',
    removeCrest: 'Supprimer le blason',
    primaryColor: 'Couleur primaire',
    secondaryColor: 'Couleur secondaire',
    numberColor: 'Couleur du numéro',
    accentColor: 'Couleur du menu',
    grassColor: 'Couleur du terrain',
    lineColor: 'Couleur des lignes',
    grassPattern: 'Style du terrain',
    patLinesGrass: 'Bandes de tonte',
    patCheckerGrass: 'Damier',
    patCirclesGrass: 'Cercles',
    patTacticsGrass: 'Tableau tactique',
    pattern: 'Motif',
    fieldEyebrow: 'TERRAIN',
    fieldLook: 'Style du terrain',
    menuEyebrow: 'MENU',
    menuLook: 'Style du menu',
    patPlain: 'Uni',
    patStripes: 'Rayures (verticales)',
    patHoops: 'Rayures (horizontales)',
    patDiagonal: 'Rayures (diagonales)',
    patSleeves: 'Manches en couleur secondaire',
    patHalves: 'Deux moitiés',
    patSash: 'Bande diagonale',
    patCenterStripe: 'Large bande centrale',
    shapeLabel: 'Forme',
    shapeJersey: 'Maillot',
    shapeCircle: 'Cercle',
    kitRoleField: 'Joueurs de champ',
    lineupNameLabel: 'NOM DE LA COMPOSITION',
    clearLineup: '⟲ Vider la composition',
    playerCountLabel: 'NOMBRE DE JOUEURS',
    formationLabel: 'FORMATION',
    formationPlaceholder: 'p. ex. 442/4-4-2',
    confirmFormation: '✓ Confirmer',
    freeMove: 'Verrouiller les joueurs',
    gridToggle: 'Grille',
    gridSizeLabel: 'TAILLE DE LA GRILLE',
    contactToggle: 'Contact et retours',
    contactEyebrow: 'RETOURS',
    contactTitle: 'Contact et retours',
    contactText: "Un bug ou une suggestion pour l'appli ? Écrivez-nous un mot.",
    contactNameLabel: 'Votre nom',
    contactEmailLabel: 'Votre adresse e-mail',
    contactMessageLabel: 'Message',
    contactMessagePlaceholder: 'Que souhaitez-vous nous dire ?',
    contactSend: '✉ Envoyer',
    contactSending: 'Envoi en cours…',
    contactCancel: 'Annuler',
    toastContactSent: 'Merci ! Votre message a été envoyé, une confirmation arrive par e-mail.',
    toastContactFailed: "Échec de l'envoi. Veuillez réessayer plus tard.",
    toastContactMissingFields: 'Merci de renseigner votre nom, votre adresse e-mail et un message.',
    benchEyebrow: 'BANC',
    benchOfMax: '/12 joueurs',
    addBenchSlot: '+ Remplaçant',
    coach: 'ENTRAÎNEUR',
    coachPlaceholder: 'Emplacement entraîneur',
    free: 'Libre',
    playerEyebrow: 'JOUEUR',
    editPlayer: 'Modifier le joueur',
    appointCaptain: 'Nommer capitaine',
    removeCaptain: 'Retirer le capitanat',
    removePlayer: 'Retirer le joueur',
    editCoach: "Modifier l'entraîneur",
    rosterOf: 'EFFECTIF DE',
    allPlayers: 'Tous les joueurs',
    playersInRoster: "Joueurs dans l'effectif",
    colPlayer: 'Joueur',
    colNumber: 'N°',
    colYear: 'Année',
    colPosition: 'Poste',
    rosterEmptyTitle: 'Votre effectif est encore vide.',
    rosterEmptyText: 'Ajoutez des joueurs et sélectionnez-les pour votre composition.',
    addFirstPlayer: 'Ajouter le premier joueur',
    rosterHintEmpty: 'Aucun effectif créé pour le moment',
    rosterHintCount: 'joueurs créés',
    savedEyebrow: 'ENREGISTRÉ',
    teamsAndLineups: 'Équipes et compositions',
    open: 'Ouvrir',
    deleteTeam: 'Supprimer',
    playersLabel: 'joueurs',
    lineupsLabel: 'compositions',
    noLineupSaved: 'Aucune composition enregistrée pour le moment.',
    showMore: '↓ Voir plus',
    showLess: '↑ Voir moins',
    custom: 'Personnalisé',
    name: 'Nom',
    jerseyNumber: 'Numéro de maillot',
    birthYear: 'Année de naissance',
    position: 'Poste',
    optional: 'facultatif',
    noSpecification: 'Non précisé',
    statusAvailable: 'Disponible',
    statusQuestionable: 'Incertain',
    statusUnavailable: 'Indisponible',
    statusLabel: 'Statut',
    posGoalkeeper: 'Gardien',
    posDefense: 'Défense',
    posMidfield: 'Milieu',
    posForward: 'Attaque',
    playerPhoto: 'Photo du joueur',
    profilePhoto: 'Photo de profil',
    uploadImage: 'Importer une image',
    removeImage: "Supprimer l'image",
    deletePlayer: 'Supprimer le joueur',
    cancel: 'Annuler',
    save: 'Enregistrer',
    coachNamePlaceholder: "Nom de l'entraîneur",
    coachPhoto: "Photo de l'entraîneur",
    newTeamEyebrow: 'NOUVELLE ÉQUIPE',
    createTeamTitle: 'Créer une équipe',
    createTeamSubmit: "Créer l'équipe",
    editTeamEyebrow: "MODIFIER L'ÉQUIPE",
    editTeamTitle: "Modifier l'équipe",
    editTeam: 'Modifier',
    accountEyebrow: 'COMPTE',
    loginOrRegister: "Se connecter ou s'inscrire",
    emailAddress: 'Adresse e-mail',
    continueWithEmail: "Continuer avec l'e-mail",
    continueWithGoogle: 'Continuer avec Google',
    authOr: 'ou',
    loggedInAs: 'Connecté en tant que',
    logout: 'Se déconnecter',
    close: 'Fermer',
    emailLinkHint: 'Nous vous envoyons un lien de connexion par e-mail – aucun mot de passe nécessaire.',
    toastEmailLinkSent: 'Lien de connexion envoyé. Vérifiez votre boîte mail.',
    toastEmailLinkFailed: "Le lien de connexion n'a pas pu être envoyé.",
    toastGoogleLoginFailed: 'Échec de la connexion avec Google.',
    toastLoggedIn: 'Connexion réussie.',
    toastLoggedOut: 'Déconnecté.',
    toastAuthLoading: 'La connexion est en cours de chargement, veuillez patienter.',
    toastCloudLoaded: 'Vos équipes enregistrées ont été chargées.',
    toastCloudBackupStarted: 'Vos équipes sont désormais sauvegardées sur votre compte.',
    toastCloudSyncFailed: 'Échec de la synchronisation cloud.',
    toastCloudSyncTooLarge:
      'Enregistrement impossible : images trop nombreuses/trop grandes (photos de joueurs, blasons). Supprimez ou réduisez quelques images.',
    accountSettings: 'Paramètres du compte',
    username: "Nom d'utilisateur",
    usernameHint: "Votre nom d'utilisateur est affiché, par exemple, lorsque vous partagez votre équipe.",
    usernameInvalid: 'Utilisez 2 à 24 caractères, sans espaces au début ou à la fin.',
    chooseUsernameTitle: "Choisissez votre nom d'utilisateur",
    continueLabel: 'Continuer',
    chooseUsernameText: "Avant de commencer, votre nouveau compte a besoin d'un nom d'utilisateur.",
    toastUsernameSaved: "Nom d'utilisateur enregistré.",
    toastUsernameFailed: "Le nom d'utilisateur n'a pas pu être enregistré.",
    dangerZoneTitle: 'Supprimer le compte',
    dangerZoneHint:
      'Supprime définitivement votre compte et toutes les données associées (équipes, compositions, profil). Cette action est irréversible.',
    deleteAccountButton: 'Supprimer définitivement le compte',
    dangerEyebrow: 'ATTENTION',
    deleteAccountTitle: 'Supprimer définitivement le compte',
    deleteAccountWarning:
      "Cette action supprime définitivement votre compte ainsi que toutes vos équipes, compositions et données de profil. Il n'y a aucun moyen d'annuler cela.",
    deleteConfirmWord: 'SUPPRIMER',
    deleteAccountConfirmLabel: 'Saisissez SUPPRIMER pour confirmer',
    deleteAccountConfirmButton: 'Supprimer définitivement le compte',
    deleteAccountConfirmMismatch: 'Veuillez saisir exactement « SUPPRIMER » pour confirmer.',
    deleteAccountFailed: "Votre compte n'a pas pu être supprimé. Veuillez réessayer.",
    deleteAccountReauthFailed: 'La nouvelle connexion a échoué. Réessayez pour supprimer votre compte.',
    toastAccountDeleted: 'Votre compte et toutes vos données ont été définitivement supprimés.',
    addPlayerEyebrow: "ÉTOFFER L'EFFECTIF",
    editPlayerEyebrow: 'MODIFIER LE JOUEUR',
    addPlayerTitle: 'Ajouter un joueur',
    trainerFallback: 'Entraîneur',
    myTeam: 'Mon équipe',
    newLineup: 'Nouvelle composition',
    toastFormationApplied: 'La formation a été appliquée.',
    toastBenchFull: '12 places sur le banc sont déjà occupées.',
    toastNumberTaken: 'Ce numéro de maillot est déjà attribué.',
    toastPlayerAssigned: 'a été assigné directement.',
    toastPlayerSaved: 'Joueur enregistré.',
    toastPlayerDeleted: 'Joueur supprimé.',
    toastLineupSaved: 'Composition enregistrée.',
    toastLineupEmptyAlready: 'La composition est déjà vide.',
    toastLineupCleared: 'Composition vidée.',
    toastLineupLoaded: 'Composition chargée.',
    toastLineupDeleted: 'Composition supprimée.',
    toastTeamCreated: 'Équipe créée.',
    toastAtLeastOneTeam: 'Il doit rester au moins une équipe.',
    toastProfileSaved: 'Profil enregistré.',
    toastTeamUpdated: 'Équipe mise à jour.',
    toastCustomFormationApplied: 'La formation personnalisée a été appliquée.',
    toastPngPlease: 'Veuillez saisir une formation.',
    toastFormationSum: 'Les chiffres doivent totaliser',
    toastFormationSumEnd: '(actuellement',
    toastFormationSumEnd2: ', sans compter le gardien).',
    toastFormationFormat: 'Veuillez saisir une formation valide, p. ex. 442/4-4-2',
    confirmDeletePlayer: "– vraiment retirer de l'effectif ?",
    confirmDeleteTeam1: "vraiment supprimer avec l'effectif et toutes les compositions ?",
    confirmClearLineup: 'Vraiment vider le onze de départ et le banc ?',
    pitchAriaLabel: 'Onze de départ sur le terrain',
    editShort: 'Modifier',
    deleteShort: 'Supprimer',
    nr: 'N°',
    yr: 'Année',
    coachAbbr: 'EN',
    preview: 'Aperçu',
    crestAlt: 'Blason',
    pngSelectFile: 'Veuillez sélectionner un fichier PNG.',
    selectionTitleDefault: 'Effectif',
    toastLineupFull: 'Le onze de départ est déjà complet.',
    deleteLineupTitle: 'Supprimer la composition',
    editLineupTitle: 'Modifier la composition',
    duplicateLineupTitle: 'Dupliquer la composition',
    toastLineupUpdated: 'Composition mise à jour.',
    toastLineupDuplicated: 'Composition dupliquée.',
    copySuffix: 'Copie',
    exportPngButton: '↗ Visuel en PNG',
    exportPngEyebrow: 'CRÉER UN VISUEL',
    exportPngTitle: 'Visuel en PNG',
    exportTypeLabel: 'TYPE DE VISUEL',
    exportTypeLineup: 'Visuel standard',
    exportTypeMatchday: 'Visuel jour de match',
    exportFormatLabel: 'FORMAT',
    exportFormatPortrait: '9:16 · Story',
    exportFormatSquare: '1:1 · Carré',
    exportFormatLandscape: '16:9 · Large',
    exportPngConfirm: '↗ Créer le visuel',
    shareTeam: 'Partager',
    leaveTeam: 'Quitter',
    sharedTeamHint: 'Cette équipe est partagée',
    toastNoPermission: "Vous n'avez pas la permission de faire cela.",
    roleOwner: 'Propriétaire',
    roleFull: 'Accès complet',
    roleLineups: 'Compositions uniquement',
    roleViewer: 'Lecture seule',
    confirmLeaveTeam: 'Vraiment quitter cette équipe partagée ?',
    confirmRemoveMember: "– vraiment retirer de l'équipe ?",
    readOnlyBannerText: "Vous n'avez qu'un accès en lecture à cette zone.",
    shareTeamEyebrow: "PARTAGER L'ÉQUIPE",
    shareTeamTitle: 'Partager',
    inviteByEmail: 'Inviter par e-mail',
    invitePlaceholder: 'Adresse e-mail',
    inviteRoleLabel: 'Permission',
    sendInvite: 'Inviter',
    membersTitle: 'Membres',
    loadingMembers: 'Chargement des membres…',
    removeMember: 'Retirer',
    invitesTitle: 'Invitations',
    noInvites: 'Aucune invitation en attente.',
    acceptInvite: 'Accepter',
    declineInvite: 'Refuser',
    toastInviteSent: 'Invitation envoyée.',
    toastInviteAccepted: 'Invitation acceptée.',
    toastMemberUpdated: 'Permission modifiée.',
    toastMemberRemoved: 'Membre retiré.',
    openInvites: 'Invitations',
    closeDialog: 'Fermer',
    colorPickerSave: 'Enregistrer la couleur',
    colorPickerSavedColors: 'Couleurs enregistrées',
    colorPickerRemove: 'Supprimer',
    colorPickerChoose: 'Choisir une couleur',
    promptConfirmEmail: 'Veuillez saisir votre adresse e-mail pour confirmer :',
    csvExportButton: 'Exporter en CSV',
    csvImportButton: 'Importer un CSV',
    csvImportTitle: 'Importer un CSV avec les colonnes nom, numéro, année, poste',
    toastCsvExported: 'Effectif téléchargé au format CSV.',
    toastCsvEmptyExport: "L'effectif est vide, rien à exporter.",
    toastCsvImportFailed: 'Impossible de lire le fichier CSV.',
    toastCsvImportedSuffix: 'joueurs importés.',
    toastCsvSkippedSuffix: 'ignorés (numéro déjà attribué).',
    inviteLinkTitle: "Lien d'invitation",
    inviteLinkHint: 'Toute personne disposant de ce lien peut rejoindre l\'équipe, idéal à partager via WhatsApp et autres.',
    inviteLinkRoleLabel: 'Autorisation du lien',
    createInviteLink: 'Créer le lien',
    copyInviteLink: 'Copier',
    shareInviteLinkWhatsapp: 'Partager via WhatsApp',
    regenerateInviteLink: 'Régénérer',
    revokeInviteLink: 'Désactiver',
    toastInviteLinkCopied: 'Lien copié.',
    toastInviteLinkCreated: "Lien d'invitation créé.",
    toastInviteLinkRevoked: "Lien d'invitation désactivé.",
    toastInviteLinkFailed: "L'action a échoué.",
    confirmRevokeInviteLink: "Vraiment désactiver le lien d'invitation actuel ? Les liens déjà partagés cesseront de fonctionner.",
    joinTeamDialogEyebrow: 'INVITATION',
    joinTeamDialogTitle: "Rejoindre l'équipe",
    joinTeamConfirm: 'Rejoindre',
    joinTeamCancel: 'Non merci',
    toastInviteLinkInvalid: "Ce lien d'invitation est invalide ou a été désactivé.",
    toastJoinedTeam: "Vous avez rejoint l'équipe.",
    playerNotes: 'Notes',
    playerNotesPlaceholder: 'ex. blessure, arrangements particuliers …',
    playerNotesIndicatorTitle: 'Note disponible',
    toastLoginToJoinTeam: "Connecte-toi pour suivre l'invitation.",
    toastOfflineMode: 'Hors ligne – les modifications sont enregistrées localement.',
    toastBackOnline: 'De nouveau en ligne – synchronisation de vos modifications.',
    toastLineupSavedOffline: "Enregistré hors ligne : créé comme nouvelle composition pour ne rien écraser.",
    offlineSuffix: 'Hors ligne',
  },
  it: {
    activeTeam: 'SQUADRA ATTIVA',
    navLineup: 'Formazione',
    navRoster: 'Rosa',
    navArchive: 'Squadre',
    navDesign: 'Design',
    navMatchday: 'Giornata',
    pageTitleMatchday: 'Pianifica la giornata',
    exportMatchdayPng: '↗ Grafica come PNG',
    matchdayEyebrow: 'GIORNATA',
    matchdayDetails: 'Info partita',
    opponentName: 'Avversario',
    opponentPlaceholder: 'Nome avversario',
    homeAway: 'Casa/Trasferta',
    home: 'Casa',
    away: 'Trasferta',
    venue: 'Stadio',
    venuePlaceholder: 'Campo, via',
    matchDate: 'Data',
    matchTime: "Calcio d'inizio",
    opponentCrest: 'Stemma avversario',
    toastMatchdayPngCreated: 'Grafica della giornata creata come PNG.',
    switchTheme: 'Cambia tema',
    darkMode: 'Modalità scura',
    lightMode: 'Modalità chiara',
    login: 'Accedi',
    coachLogin: 'Accesso allenatore',
    profileLabel: 'Profilo',
    coachArea: 'Profilo',
    brandEyebrow: 'LINEUP AMATEUR',
    saveLineup: '✓ Salva formazione',
    addPlayer: '+ Aggiungi giocatore',
    createTeam: '+ Crea squadra',
    pageTitleLineup: 'Pianifica formazione',
    pageTitleRoster: 'Gestisci rosa',
    pageTitleArchive: 'Squadre e formazioni',
    pageTitleDesign: 'Personalizza il design',
    assignPlayerEyebrow: 'ASSEGNA GIOCATORE',
    searchPlayer: 'Cerca giocatore',
    newPlayerForSlot: '+ Nuovo giocatore per questo posto',
    manageRoster: 'Gestisci rosa',
    selectionNoSlot: 'Seleziona un posto nella formazione titolare o in panchina.',
    selectionNoSlotTitle: 'Nessun posto selezionato.',
    selectionNoSlotText: 'Seleziona prima un posto nella formazione titolare o in panchina.',
    starterSlot: 'Formazione titolare · Posto',
    benchSlotTitle: 'Panchina',
    playerSelected: 'è selezionato.',
    chooseFromRoster: 'Scegli un giocatore dalla rosa.',
    rosterEmptyAssignTitle: 'La tua rosa è vuota.',
    rosterEmptyAssignText: 'Crea subito un nuovo giocatore.',
    allSelectedTitle: 'Tutti i giocatori sono assegnati.',
    allSelectedText: 'Libera un posto per riassegnare.',
    noPlayerFoundTitle: 'Nessun giocatore trovato.',
    noPlayerFoundText: 'Modifica la ricerca.',
    kit: 'MAGLIA',
    trikotLook: 'Look della maglia',
    teamName: 'Nome squadra',
    sportLabel: 'Sport',
    sportFootball: 'Calcio',
    sportFutsal: 'Calcio a 5',
    crestPng: 'Stemma (PNG)',
    uploadPng: 'Carica PNG',
    removeCrest: 'Rimuovi stemma',
    primaryColor: 'Colore primario',
    secondaryColor: 'Colore secondario',
    numberColor: 'Colore numero',
    accentColor: 'Colore menu',
    grassColor: 'Colore campo',
    lineColor: 'Colore delle linee',
    grassPattern: 'Stile del campo',
    patLinesGrass: 'Strisce di taglio',
    patCheckerGrass: 'Scacchi',
    patCirclesGrass: 'Cerchi',
    patTacticsGrass: 'Lavagna tattica',
    pattern: 'Motivo',
    fieldEyebrow: 'CAMPO',
    fieldLook: 'Stile del campo',
    menuEyebrow: 'MENU',
    menuLook: 'Stile del menu',
    patPlain: 'Tinta unita',
    patStripes: 'Righe (verticali)',
    patHoops: 'Righe (orizzontali)',
    patDiagonal: 'Righe (diagonali)',
    patSleeves: 'Maniche nel colore secondario',
    patHalves: 'Due metà',
    patSash: 'Fascia diagonale',
    patCenterStripe: 'Ampia striscia centrale',
    shapeLabel: 'Forma',
    shapeJersey: 'Maglia',
    shapeCircle: 'Cerchio',
    kitRoleField: 'Giocatori di movimento',
    lineupNameLabel: 'NOME FORMAZIONE',
    clearLineup: '⟲ Svuota formazione',
    playerCountLabel: 'NUMERO DI GIOCATORI',
    formationLabel: 'MODULO',
    formationPlaceholder: 'es. 442/4-4-2',
    confirmFormation: '✓ Conferma',
    freeMove: 'Blocca giocatori',
    gridToggle: 'Griglia',
    gridSizeLabel: 'DIMENSIONE GRIGLIA',
    contactToggle: 'Contatti e feedback',
    contactEyebrow: 'FEEDBACK',
    contactTitle: 'Contatti e feedback',
    contactText: "Hai trovato un bug o hai un suggerimento per l'app? Scrivici due righe.",
    contactNameLabel: 'Il tuo nome',
    contactEmailLabel: 'La tua email',
    contactMessageLabel: 'Messaggio',
    contactMessagePlaceholder: 'Cosa vuoi dirci?',
    contactSend: '✉ Invia',
    contactSending: 'Invio in corso…',
    contactCancel: 'Annulla',
    toastContactSent: 'Grazie! Il tuo messaggio è stato inviato, riceverai una conferma via email.',
    toastContactFailed: 'Invio non riuscito. Riprova più tardi.',
    toastContactMissingFields: 'Compila nome, email e messaggio.',
    benchEyebrow: 'PANCHINA',
    benchOfMax: '/12 giocatori',
    addBenchSlot: '+ Riserva',
    coach: 'ALLENATORE',
    coachPlaceholder: 'Posto allenatore',
    free: 'Libero',
    playerEyebrow: 'GIOCATORE',
    editPlayer: 'Modifica giocatore',
    appointCaptain: 'Nomina capitano',
    removeCaptain: 'Rimuovi capitano',
    removePlayer: 'Rimuovi giocatore',
    editCoach: 'Modifica allenatore',
    rosterOf: 'ROSA DI',
    allPlayers: 'Tutti i giocatori',
    playersInRoster: 'Giocatori in rosa',
    colPlayer: 'Giocatore',
    colNumber: 'N.',
    colYear: 'Anno',
    colPosition: 'Posizione',
    rosterEmptyTitle: 'La tua rosa è ancora vuota.',
    rosterEmptyText: 'Aggiungi giocatori e selezionali per la tua formazione.',
    addFirstPlayer: 'Aggiungi primo giocatore',
    rosterHintEmpty: 'Nessuna rosa creata finora',
    rosterHintCount: 'giocatori creati',
    savedEyebrow: 'SALVATO',
    teamsAndLineups: 'Squadre e formazioni',
    open: 'Apri',
    deleteTeam: 'Elimina',
    playersLabel: 'giocatori',
    lineupsLabel: 'formazioni',
    noLineupSaved: 'Nessuna formazione salvata finora.',
    showMore: '↓ Mostra altro',
    showLess: '↑ Mostra meno',
    custom: 'Personalizzato',
    name: 'Nome',
    jerseyNumber: 'Numero di maglia',
    birthYear: 'Anno di nascita',
    position: 'Posizione',
    optional: 'facoltativo',
    noSpecification: 'Non specificato',
    statusAvailable: 'Disponibile',
    statusQuestionable: 'In dubbio',
    statusUnavailable: 'Non disponibile',
    statusLabel: 'Stato',
    posGoalkeeper: 'Portiere',
    posDefense: 'Difesa',
    posMidfield: 'Centrocampo',
    posForward: 'Attacco',
    playerPhoto: 'Foto giocatore',
    profilePhoto: 'Foto profilo',
    uploadImage: 'Carica immagine',
    removeImage: 'Rimuovi immagine',
    deletePlayer: 'Elimina giocatore',
    cancel: 'Annulla',
    save: 'Salva',
    coachNamePlaceholder: 'Nome allenatore',
    coachPhoto: 'Foto allenatore',
    newTeamEyebrow: 'NUOVA SQUADRA',
    createTeamTitle: 'Crea squadra',
    createTeamSubmit: 'Crea squadra',
    editTeamEyebrow: 'MODIFICA SQUADRA',
    editTeamTitle: 'Modifica squadra',
    editTeam: 'Modifica',
    accountEyebrow: 'ACCOUNT',
    loginOrRegister: 'Accedi o registrati',
    emailAddress: 'Indirizzo email',
    continueWithEmail: 'Continua con email',
    continueWithGoogle: 'Continua con Google',
    authOr: 'o',
    loggedInAs: 'Accesso effettuato come',
    logout: 'Esci',
    close: 'Chiudi',
    emailLinkHint: 'Ti invieremo un link di accesso via email, senza password.',
    toastEmailLinkSent: 'Link di accesso inviato. Controlla la tua email.',
    toastEmailLinkFailed: 'Impossibile inviare il link di accesso.',
    toastGoogleLoginFailed: 'Accesso con Google non riuscito.',
    toastLoggedIn: 'Accesso effettuato con successo.',
    toastLoggedOut: 'Disconnesso.',
    toastAuthLoading: "L'accesso è ancora in fase di caricamento, attendi un attimo.",
    toastCloudLoaded: 'Le tue squadre salvate sono state caricate.',
    toastCloudBackupStarted: 'Le tue squadre vengono ora salvate sul tuo account.',
    toastCloudSyncFailed: 'Sincronizzazione cloud non riuscita.',
    toastCloudSyncTooLarge:
      'Impossibile salvare: troppe immagini o immagini troppo grandi (foto giocatori, stemmi). Rimuovi o riduci alcune immagini.',
    accountSettings: 'Impostazioni account',
    username: 'Nome utente',
    usernameHint: 'Il tuo nome utente viene mostrato, ad esempio, quando condividi la tua squadra.',
    usernameInvalid: 'Usa 2–24 caratteri, senza spazi iniziali o finali.',
    chooseUsernameTitle: 'Scegli il tuo nome utente',
    continueLabel: 'Continua',
    chooseUsernameText: 'Prima di iniziare, il tuo nuovo account ha bisogno di un nome utente.',
    toastUsernameSaved: 'Nome utente salvato.',
    toastUsernameFailed: 'Impossibile salvare il nome utente.',
    dangerZoneTitle: 'Elimina account',
    dangerZoneHint:
      'Elimina definitivamente il tuo account e tutti i dati associati (squadre, formazioni, profilo). Questa azione non può essere annullata.',
    deleteAccountButton: "Elimina definitivamente l'account",
    dangerEyebrow: 'ATTENZIONE',
    deleteAccountTitle: "Elimina definitivamente l'account",
    deleteAccountWarning:
      'Questa azione elimina definitivamente il tuo account e tutte le tue squadre, formazioni e i dati del profilo. Non è possibile annullarla.',
    deleteConfirmWord: 'ELIMINA',
    deleteAccountConfirmLabel: 'Digita ELIMINA per confermare',
    deleteAccountConfirmButton: "Elimina definitivamente l'account",
    deleteAccountConfirmMismatch: 'Digita esattamente "ELIMINA" per confermare.',
    deleteAccountFailed: "Impossibile eliminare l'account. Riprova.",
    deleteAccountReauthFailed: 'Nuova autenticazione non riuscita. Riprova per eliminare il tuo account.',
    toastAccountDeleted: 'Il tuo account e tutti i dati sono stati eliminati definitivamente.',
    addPlayerEyebrow: 'AMPLIA ROSA',
    editPlayerEyebrow: 'MODIFICA GIOCATORE',
    addPlayerTitle: 'Aggiungi giocatore',
    trainerFallback: 'Allenatore',
    myTeam: 'La mia squadra',
    newLineup: 'Nuova formazione',
    toastFormationApplied: 'Il modulo è stato applicato.',
    toastBenchFull: 'Sono già occupati 12 posti in panchina.',
    toastNumberTaken: 'Questo numero di maglia è già assegnato.',
    toastPlayerAssigned: 'è stato assegnato direttamente.',
    toastPlayerSaved: 'Giocatore salvato.',
    toastPlayerDeleted: 'Giocatore eliminato.',
    toastLineupSaved: 'Formazione salvata.',
    toastLineupEmptyAlready: 'La formazione è già vuota.',
    toastLineupCleared: 'Formazione svuotata.',
    toastLineupLoaded: 'Formazione caricata.',
    toastLineupDeleted: 'Formazione eliminata.',
    toastTeamCreated: 'Squadra creata.',
    toastAtLeastOneTeam: 'Deve rimanere almeno una squadra.',
    toastProfileSaved: 'Profilo salvato.',
    toastTeamUpdated: 'Squadra aggiornata.',
    toastCustomFormationApplied: 'Il modulo personalizzato è stato applicato.',
    toastPngPlease: 'Inserisci un modulo.',
    toastFormationSum: 'I numeri devono sommare a',
    toastFormationSumEnd: '(attualmente',
    toastFormationSumEnd2: ', portiere escluso).',
    toastFormationFormat: 'Inserisci un modulo valido, es. 442/4-4-2',
    confirmDeletePlayer: 'eliminare davvero dalla rosa?',
    confirmDeleteTeam1: 'eliminare davvero con rosa e tutte le formazioni?',
    confirmClearLineup: 'Svuotare davvero formazione titolare e panchina?',
    pitchAriaLabel: 'Formazione titolare in campo',
    editShort: 'Modifica',
    deleteShort: 'Elimina',
    nr: 'N.',
    yr: 'Anno',
    coachAbbr: 'AL',
    preview: 'Anteprima',
    crestAlt: 'Stemma',
    pngSelectFile: 'Seleziona un file PNG.',
    selectionTitleDefault: 'Rosa',
    toastLineupFull: 'La formazione titolare è già al completo.',
    deleteLineupTitle: 'Elimina formazione',
    editLineupTitle: 'Modifica formazione',
    duplicateLineupTitle: 'Duplica formazione',
    toastLineupUpdated: 'Formazione aggiornata.',
    toastLineupDuplicated: 'Formazione duplicata.',
    copySuffix: 'Copia',
    exportPngButton: '↗ Grafica come PNG',
    exportPngEyebrow: 'CREA GRAFICA',
    exportPngTitle: 'Grafica come PNG',
    exportTypeLabel: 'TIPO DI GRAFICA',
    exportTypeLineup: 'Grafica standard',
    exportTypeMatchday: 'Grafica della giornata',
    exportFormatLabel: 'FORMATO',
    exportFormatPortrait: '9:16 · Storia',
    exportFormatSquare: '1:1 · Quadrato',
    exportFormatLandscape: '16:9 · Largo',
    exportPngConfirm: '↗ Crea grafica',
    shareTeam: 'Condividi',
    leaveTeam: 'Abbandona',
    sharedTeamHint: 'Questa squadra è condivisa',
    toastNoPermission: 'Non hai il permesso per farlo.',
    roleOwner: 'Proprietario',
    roleFull: 'Accesso completo',
    roleLineups: 'Solo formazioni',
    roleViewer: 'Solo visualizzazione',
    confirmLeaveTeam: 'Abbandonare davvero questa squadra condivisa?',
    confirmRemoveMember: 'rimuovere davvero dalla squadra?',
    readOnlyBannerText: "In quest'area hai solo accesso in visualizzazione.",
    shareTeamEyebrow: 'CONDIVIDI SQUADRA',
    shareTeamTitle: 'Condividi',
    inviteByEmail: 'Invita via email',
    invitePlaceholder: 'Indirizzo email',
    inviteRoleLabel: 'Permesso',
    sendInvite: 'Invita',
    membersTitle: 'Membri',
    loadingMembers: 'Caricamento membri…',
    removeMember: 'Rimuovi',
    invitesTitle: 'Inviti',
    noInvites: 'Nessun invito in sospeso.',
    acceptInvite: 'Accetta',
    declineInvite: 'Rifiuta',
    toastInviteSent: 'Invito inviato.',
    toastInviteAccepted: 'Invito accettato.',
    toastMemberUpdated: 'Permesso modificato.',
    toastMemberRemoved: 'Membro rimosso.',
    openInvites: 'Inviti',
    closeDialog: 'Chiudi',
    colorPickerSave: 'Salva colore',
    colorPickerSavedColors: 'Colori salvati',
    colorPickerRemove: 'Rimuovi',
    colorPickerChoose: 'Scegli colore',
    promptConfirmEmail: 'Inserisci il tuo indirizzo e-mail per confermare:',
    csvExportButton: 'Esporta CSV',
    csvImportButton: 'Importa CSV',
    csvImportTitle: 'Importa un CSV con le colonne nome, numero, anno, posizione',
    toastCsvExported: 'Rosa scaricata come CSV.',
    toastCsvEmptyExport: 'La rosa è vuota, niente da esportare.',
    toastCsvImportFailed: 'Impossibile leggere il file CSV.',
    toastCsvImportedSuffix: 'giocatori importati.',
    toastCsvSkippedSuffix: 'saltati (numero di maglia già assegnato).',
    inviteLinkTitle: 'Link di invito',
    inviteLinkHint: 'Chiunque abbia questo link può unirsi alla squadra: ideale da condividere via WhatsApp e simili.',
    inviteLinkRoleLabel: 'Permesso del link',
    createInviteLink: 'Crea link',
    copyInviteLink: 'Copia',
    shareInviteLinkWhatsapp: 'Condividi su WhatsApp',
    regenerateInviteLink: 'Rigenera',
    revokeInviteLink: 'Disattiva',
    toastInviteLinkCopied: 'Link copiato.',
    toastInviteLinkCreated: 'Link di invito creato.',
    toastInviteLinkRevoked: 'Link di invito disattivato.',
    toastInviteLinkFailed: "L'azione non è riuscita.",
    confirmRevokeInviteLink: 'Disattivare davvero il link di invito attuale? I link già condivisi smetteranno di funzionare.',
    joinTeamDialogEyebrow: 'INVITO',
    joinTeamDialogTitle: 'Unisciti alla squadra',
    joinTeamConfirm: 'Unisciti',
    joinTeamCancel: 'No grazie',
    toastInviteLinkInvalid: 'Questo link di invito non è valido o è stato disattivato.',
    toastJoinedTeam: 'Ti sei unito alla squadra.',
    playerNotes: 'Note',
    playerNotesPlaceholder: 'es. infortunio, accordi particolari …',
    playerNotesIndicatorTitle: 'Nota disponibile',
    toastLoginToJoinTeam: "Accedi per seguire l'invito.",
    toastOfflineMode: 'Offline: le modifiche vengono salvate localmente.',
    toastBackOnline: 'Di nuovo online: sincronizzazione delle modifiche in corso.',
    toastLineupSavedOffline: 'Salvato offline: creata come nuova formazione per non sovrascrivere nulla.',
    offlineSuffix: 'Offline',
  },
  pt: {
    activeTeam: 'EQUIPA ATIVA',
    navLineup: 'Escalação',
    navRoster: 'Plantel',
    navArchive: 'Equipas',
    navDesign: 'Design',
    navMatchday: 'Jornada',
    pageTitleMatchday: 'Planear jornada',
    exportMatchdayPng: '↗ Imagem em PNG',
    matchdayEyebrow: 'JORNADA',
    matchdayDetails: 'Informações do jogo',
    opponentName: 'Adversário',
    opponentPlaceholder: 'Nome do adversário',
    homeAway: 'Casa/Fora',
    home: 'Casa',
    away: 'Fora',
    venue: 'Estádio',
    venuePlaceholder: 'Campo, rua',
    matchDate: 'Data',
    matchTime: 'Pontapé de saída',
    opponentCrest: 'Escudo do adversário',
    toastMatchdayPngCreated: 'Imagem da jornada criada em PNG.',
    switchTheme: 'Mudar tema',
    darkMode: 'Modo escuro',
    lightMode: 'Modo claro',
    login: 'Iniciar sessão',
    coachLogin: 'Acesso do treinador',
    profileLabel: 'Perfil',
    coachArea: 'Perfil',
    brandEyebrow: 'LINEUP AMATEUR',
    saveLineup: '✓ Guardar escalação',
    addPlayer: '+ Adicionar jogador',
    createTeam: '+ Criar equipa',
    pageTitleLineup: 'Planear escalação',
    pageTitleRoster: 'Gerir plantel',
    pageTitleArchive: 'Equipas e escalações',
    pageTitleDesign: 'Personalizar design',
    assignPlayerEyebrow: 'ATRIBUIR JOGADOR',
    searchPlayer: 'Procurar jogador',
    newPlayerForSlot: '+ Novo jogador para esta posição',
    manageRoster: 'Gerir plantel',
    selectionNoSlot: 'Selecione uma posição no onze inicial ou no banco.',
    selectionNoSlotTitle: 'Nenhuma posição selecionada.',
    selectionNoSlotText: 'Primeiro selecione uma posição no onze inicial ou no banco.',
    starterSlot: 'Onze inicial · Posição',
    benchSlotTitle: 'Banco',
    playerSelected: 'está selecionado.',
    chooseFromRoster: 'Escolha um jogador do plantel.',
    rosterEmptyAssignTitle: 'O seu plantel está vazio.',
    rosterEmptyAssignText: 'Crie já um novo jogador.',
    allSelectedTitle: 'Todos os jogadores estão atribuídos.',
    allSelectedText: 'Liberte uma posição para reatribuir.',
    noPlayerFoundTitle: 'Nenhum jogador encontrado.',
    noPlayerFoundText: 'Ajuste a pesquisa.',
    kit: 'CAMISOLA',
    trikotLook: 'Visual da camisola',
    teamName: 'Nome da equipa',
    sportLabel: 'Desporto',
    sportFootball: 'Futebol',
    sportFutsal: 'Futsal',
    crestPng: 'Escudo (PNG)',
    uploadPng: 'Carregar PNG',
    removeCrest: 'Remover escudo',
    primaryColor: 'Cor primária',
    secondaryColor: 'Cor secundária',
    numberColor: 'Cor do número',
    accentColor: 'Cor do menu',
    grassColor: 'Cor do campo',
    lineColor: 'Cor das linhas',
    grassPattern: 'Estilo do campo',
    patLinesGrass: 'Faixas de corte',
    patCheckerGrass: 'Xadrez',
    patCirclesGrass: 'Círculos',
    patTacticsGrass: 'Quadro tático',
    pattern: 'Padrão',
    fieldEyebrow: 'CAMPO',
    fieldLook: 'Estilo do campo',
    menuEyebrow: 'MENU',
    menuLook: 'Estilo do menu',
    patPlain: 'Liso',
    patStripes: 'Riscas (verticais)',
    patHoops: 'Riscas (horizontais)',
    patDiagonal: 'Riscas (diagonais)',
    patSleeves: 'Mangas na cor secundária',
    patHalves: 'Duas metades',
    patSash: 'Faixa diagonal',
    patCenterStripe: 'Faixa central larga',
    shapeLabel: 'Forma',
    shapeJersey: 'Camisola',
    shapeCircle: 'Círculo',
    kitRoleField: 'Jogadores de campo',
    lineupNameLabel: 'NOME DA ESCALAÇÃO',
    clearLineup: '⟲ Esvaziar escalação',
    playerCountLabel: 'NÚMERO DE JOGADORES',
    formationLabel: 'FORMAÇÃO',
    formationPlaceholder: 'ex.: 442/4-4-2',
    confirmFormation: '✓ Confirmar',
    freeMove: 'Fixar jogadores',
    gridToggle: 'Grade',
    gridSizeLabel: 'TAMANHO DA GRADE',
    contactToggle: 'Contacto e feedback',
    contactEyebrow: 'FEEDBACK',
    contactTitle: 'Contacto e feedback',
    contactText: 'Encontrou um erro ou tem uma ideia para a app? Escreva-nos.',
    contactNameLabel: 'O seu nome',
    contactEmailLabel: 'O seu email',
    contactMessageLabel: 'Mensagem',
    contactMessagePlaceholder: 'O que gostaria de nos dizer?',
    contactSend: '✉ Enviar',
    contactSending: 'A enviar…',
    contactCancel: 'Cancelar',
    toastContactSent: 'Obrigado! A sua mensagem foi enviada, receberá uma confirmação por email.',
    toastContactFailed: 'Falha ao enviar. Tente novamente mais tarde.',
    toastContactMissingFields: 'Preencha o nome, o email e a mensagem.',
    benchEyebrow: 'BANCO',
    benchOfMax: '/12 jogadores',
    addBenchSlot: '+ Suplente',
    coach: 'TREINADOR',
    coachPlaceholder: 'Posição de treinador',
    free: 'Livre',
    playerEyebrow: 'JOGADOR',
    editPlayer: 'Editar jogador',
    appointCaptain: 'Nomear capitão',
    removeCaptain: 'Remover capitão',
    removePlayer: 'Remover jogador',
    editCoach: 'Editar treinador',
    rosterOf: 'PLANTEL DE',
    allPlayers: 'Todos os jogadores',
    playersInRoster: 'Jogadores no plantel',
    colPlayer: 'Jogador',
    colNumber: 'N.º',
    colYear: 'Ano',
    colPosition: 'Posição',
    rosterEmptyTitle: 'O seu plantel ainda está vazio.',
    rosterEmptyText: 'Adicione jogadores e selecione-os para a sua escalação.',
    addFirstPlayer: 'Adicionar primeiro jogador',
    rosterHintEmpty: 'Ainda não há plantel criado',
    rosterHintCount: 'jogadores criados',
    savedEyebrow: 'GUARDADO',
    teamsAndLineups: 'Equipas e escalações',
    open: 'Abrir',
    deleteTeam: 'Eliminar',
    playersLabel: 'jogadores',
    lineupsLabel: 'escalações',
    noLineupSaved: 'Ainda não há escalação guardada.',
    showMore: '↓ Ver mais',
    showLess: '↑ Ver menos',
    custom: 'Personalizado',
    name: 'Nome',
    jerseyNumber: 'Número da camisola',
    birthYear: 'Ano de nascimento',
    position: 'Posição',
    optional: 'opcional',
    noSpecification: 'Não especificado',
    statusAvailable: 'Disponível',
    statusQuestionable: 'Em dúvida',
    statusUnavailable: 'Indisponível',
    statusLabel: 'Estado',
    posGoalkeeper: 'Guarda-redes',
    posDefense: 'Defesa',
    posMidfield: 'Médio',
    posForward: 'Avançado',
    playerPhoto: 'Foto do jogador',
    profilePhoto: 'Foto de perfil',
    uploadImage: 'Carregar imagem',
    removeImage: 'Remover imagem',
    deletePlayer: 'Eliminar jogador',
    cancel: 'Cancelar',
    save: 'Guardar',
    coachNamePlaceholder: 'Nome do treinador',
    coachPhoto: 'Foto do treinador',
    newTeamEyebrow: 'NOVA EQUIPA',
    createTeamTitle: 'Criar equipa',
    createTeamSubmit: 'Criar equipa',
    editTeamEyebrow: 'EDITAR EQUIPA',
    editTeamTitle: 'Editar equipa',
    editTeam: 'Editar',
    accountEyebrow: 'CONTA',
    loginOrRegister: 'Iniciar sessão ou registar',
    emailAddress: 'Endereço de email',
    continueWithEmail: 'Continuar com email',
    continueWithGoogle: 'Continuar com Google',
    authOr: 'ou',
    loggedInAs: 'Sessão iniciada como',
    logout: 'Terminar sessão',
    close: 'Fechar',
    emailLinkHint: 'Vamos enviar-lhe um link de acesso por email, sem palavra-passe.',
    toastEmailLinkSent: 'Link de acesso enviado. Verifique o seu email.',
    toastEmailLinkFailed: 'Não foi possível enviar o link de acesso.',
    toastGoogleLoginFailed: 'Falha ao iniciar sessão com a Google.',
    toastLoggedIn: 'Sessão iniciada com sucesso.',
    toastLoggedOut: 'Sessão terminada.',
    toastAuthLoading: 'O início de sessão ainda está a carregar, aguarde um momento.',
    toastCloudLoaded: 'As suas equipas guardadas foram carregadas.',
    toastCloudBackupStarted: 'As suas equipas estão agora a ser guardadas na sua conta.',
    toastCloudSyncFailed: 'Falha na sincronização com a nuvem.',
    toastCloudSyncTooLarge:
      'Não foi possível guardar: demasiadas imagens ou imagens muito grandes (fotos de jogadores, escudos). Remova ou reduza algumas imagens.',
    accountSettings: 'Definições da conta',
    username: 'Nome de utilizador',
    usernameHint: 'O seu nome de utilizador é apresentado, por exemplo, ao partilhar a sua equipa.',
    usernameInvalid: 'Use 2–24 caracteres, sem espaços no início ou no fim.',
    chooseUsernameTitle: 'Escolha o seu nome de utilizador',
    continueLabel: 'Continuar',
    chooseUsernameText: 'Antes de começar, a sua nova conta precisa de um nome de utilizador.',
    toastUsernameSaved: 'Nome de utilizador guardado.',
    toastUsernameFailed: 'Não foi possível guardar o nome de utilizador.',
    dangerZoneTitle: 'Eliminar conta',
    dangerZoneHint:
      'Elimina permanentemente a sua conta e todos os dados associados (equipas, escalações, perfil). Esta ação não pode ser anulada.',
    deleteAccountButton: 'Eliminar conta definitivamente',
    dangerEyebrow: 'ATENÇÃO',
    deleteAccountTitle: 'Eliminar conta definitivamente',
    deleteAccountWarning:
      'Esta ação elimina permanentemente a sua conta e todas as suas equipas, escalações e dados de perfil. Não há forma de anular isto.',
    deleteConfirmWord: 'ELIMINAR',
    deleteAccountConfirmLabel: 'Escreva ELIMINAR para confirmar',
    deleteAccountConfirmButton: 'Eliminar conta definitivamente',
    deleteAccountConfirmMismatch: 'Escreva exatamente "ELIMINAR" para confirmar.',
    deleteAccountFailed: 'Não foi possível eliminar a conta. Tente novamente.',
    deleteAccountReauthFailed: 'Falha ao voltar a autenticar. Tente novamente para eliminar a sua conta.',
    toastAccountDeleted: 'A sua conta e todos os dados foram eliminados definitivamente.',
    addPlayerEyebrow: 'AMPLIAR PLANTEL',
    editPlayerEyebrow: 'EDITAR JOGADOR',
    addPlayerTitle: 'Adicionar jogador',
    trainerFallback: 'Treinador',
    myTeam: 'A minha equipa',
    newLineup: 'Nova escalação',
    toastFormationApplied: 'A formação foi aplicada.',
    toastBenchFull: 'Já estão ocupadas 12 posições no banco.',
    toastNumberTaken: 'Este número de camisola já está atribuído.',
    toastPlayerAssigned: 'foi atribuído diretamente.',
    toastPlayerSaved: 'Jogador guardado.',
    toastPlayerDeleted: 'Jogador eliminado.',
    toastLineupSaved: 'Escalação guardada.',
    toastLineupEmptyAlready: 'A escalação já está vazia.',
    toastLineupCleared: 'Escalação esvaziada.',
    toastLineupLoaded: 'Escalação carregada.',
    toastLineupDeleted: 'Escalação eliminada.',
    toastTeamCreated: 'Equipa criada.',
    toastAtLeastOneTeam: 'Deve permanecer pelo menos uma equipa.',
    toastProfileSaved: 'Perfil guardado.',
    toastTeamUpdated: 'Equipa atualizada.',
    toastCustomFormationApplied: 'A formação personalizada foi aplicada.',
    toastPngPlease: 'Introduza uma formação.',
    toastFormationSum: 'Os números devem somar',
    toastFormationSumEnd: '(atualmente',
    toastFormationSumEnd2: ', sem contar o guarda-redes).',
    toastFormationFormat: 'Introduza uma formação válida, ex.: 442/4-4-2',
    confirmDeletePlayer: 'eliminar mesmo do plantel?',
    confirmDeleteTeam1: 'eliminar mesmo com o plantel e todas as escalações?',
    confirmClearLineup: 'Esvaziar mesmo o onze inicial e o banco?',
    pitchAriaLabel: 'Onze inicial no campo',
    editShort: 'Editar',
    deleteShort: 'Eliminar',
    nr: 'N.º',
    yr: 'Ano',
    coachAbbr: 'TR',
    preview: 'Pré-visualização',
    crestAlt: 'Escudo',
    pngSelectFile: 'Selecione um ficheiro PNG.',
    selectionTitleDefault: 'Plantel',
    toastLineupFull: 'O onze inicial já está completo.',
    deleteLineupTitle: 'Eliminar escalação',
    editLineupTitle: 'Editar escalação',
    duplicateLineupTitle: 'Duplicar escalação',
    toastLineupUpdated: 'Escalação atualizada.',
    toastLineupDuplicated: 'Escalação duplicada.',
    copySuffix: 'Cópia',
    exportPngButton: '↗ Imagem em PNG',
    exportPngEyebrow: 'CRIAR IMAGEM',
    exportPngTitle: 'Imagem em PNG',
    exportTypeLabel: 'TIPO DE IMAGEM',
    exportTypeLineup: 'Imagem normal',
    exportTypeMatchday: 'Imagem da jornada',
    exportFormatLabel: 'FORMATO',
    exportFormatPortrait: '9:16 · Story',
    exportFormatSquare: '1:1 · Quadrado',
    exportFormatLandscape: '16:9 · Largo',
    exportPngConfirm: '↗ Criar imagem',
    shareTeam: 'Partilhar',
    leaveTeam: 'Abandonar',
    sharedTeamHint: 'Esta equipa está partilhada',
    toastNoPermission: 'Não tem permissão para isso.',
    roleOwner: 'Proprietário',
    roleFull: 'Acesso total',
    roleLineups: 'Apenas escalações',
    roleViewer: 'Apenas visualização',
    confirmLeaveTeam: 'Abandonar mesmo esta equipa partilhada?',
    confirmRemoveMember: 'remover mesmo da equipa?',
    readOnlyBannerText: 'Tem apenas acesso de leitura a esta área.',
    shareTeamEyebrow: 'PARTILHAR EQUIPA',
    shareTeamTitle: 'Partilhar',
    inviteByEmail: 'Convidar por email',
    invitePlaceholder: 'Endereço de email',
    inviteRoleLabel: 'Permissão',
    sendInvite: 'Convidar',
    membersTitle: 'Membros',
    loadingMembers: 'A carregar membros…',
    removeMember: 'Remover',
    invitesTitle: 'Convites',
    noInvites: 'Sem convites pendentes.',
    acceptInvite: 'Aceitar',
    declineInvite: 'Recusar',
    toastInviteSent: 'Convite enviado.',
    toastInviteAccepted: 'Convite aceite.',
    toastMemberUpdated: 'Permissão alterada.',
    toastMemberRemoved: 'Membro removido.',
    openInvites: 'Convites',
    closeDialog: 'Fechar',
    colorPickerSave: 'Guardar cor',
    colorPickerSavedColors: 'Cores guardadas',
    colorPickerRemove: 'Remover',
    colorPickerChoose: 'Escolher cor',
    promptConfirmEmail: 'Introduza o seu endereço de email para confirmar:',
    csvExportButton: 'Exportar CSV',
    csvImportButton: 'Importar CSV',
    csvImportTitle: 'Importa um CSV com as colunas nome, número, ano, posição',
    toastCsvExported: 'Elenco descarregado como CSV.',
    toastCsvEmptyExport: 'O elenco está vazio, nada a exportar.',
    toastCsvImportFailed: 'Não foi possível ler o ficheiro CSV.',
    toastCsvImportedSuffix: 'jogadores importados.',
    toastCsvSkippedSuffix: 'ignorados (número já atribuído).',
    inviteLinkTitle: 'Link de convite',
    inviteLinkHint: 'Qualquer pessoa com este link pode juntar-se à equipa – ideal para partilhar via WhatsApp e afins.',
    inviteLinkRoleLabel: 'Permissão do link',
    createInviteLink: 'Criar link',
    copyInviteLink: 'Copiar',
    shareInviteLinkWhatsapp: 'Partilhar via WhatsApp',
    regenerateInviteLink: 'Gerar novo',
    revokeInviteLink: 'Desativar',
    toastInviteLinkCopied: 'Link copiado.',
    toastInviteLinkCreated: 'Link de convite criado.',
    toastInviteLinkRevoked: 'Link de convite desativado.',
    toastInviteLinkFailed: 'A ação falhou.',
    confirmRevokeInviteLink: 'Desativar mesmo o link de convite atual? Os links já partilhados deixarão de funcionar.',
    joinTeamDialogEyebrow: 'CONVITE',
    joinTeamDialogTitle: 'Juntar-se à equipa',
    joinTeamConfirm: 'Juntar-me',
    joinTeamCancel: 'Não, obrigado',
    toastInviteLinkInvalid: 'Este link de convite é inválido ou foi desativado.',
    toastJoinedTeam: 'Juntou-se à equipa.',
    playerNotes: 'Notas',
    playerNotesPlaceholder: 'ex. lesão, combinações especiais …',
    playerNotesIndicatorTitle: 'Nota disponível',
    toastLoginToJoinTeam: 'Inicie sessão para aceitar o convite.',
    toastOfflineMode: 'Offline: as alterações são guardadas localmente.',
    toastBackOnline: 'De novo online: a sincronizar as suas alterações.',
    toastLineupSavedOffline: 'Guardado offline: criada como nova escalação para não sobrepor nada.',
    offlineSuffix: 'Offline',
  },
  tr: {
    activeTeam: 'AKTİF TAKIM',
    navLineup: 'Diziliş',
    navRoster: 'Kadro',
    navArchive: 'Takımlar',
    navDesign: 'Tasarım',
    navMatchday: 'Maç günü',
    pageTitleMatchday: 'Maç gününü planla',
    exportMatchdayPng: '↗ Görseli PNG olarak al',
    matchdayEyebrow: 'MAÇ GÜNÜ',
    matchdayDetails: 'Maç bilgileri',
    opponentName: 'Rakip',
    opponentPlaceholder: 'Rakip adı',
    homeAway: 'İç Saha/Deplasman',
    home: 'İç Saha',
    away: 'Deplasman',
    venue: 'Saha',
    venuePlaceholder: 'Stadyum, cadde',
    matchDate: 'Tarih',
    matchTime: 'Başlama saati',
    opponentCrest: 'Rakip amblemi',
    toastMatchdayPngCreated: 'Maç günü görseli PNG olarak oluşturuldu.',
    switchTheme: 'Temayı değiştir',
    darkMode: 'Karanlık mod',
    lightMode: 'Aydınlık mod',
    login: 'Giriş yap',
    coachLogin: 'Antrenör girişi',
    profileLabel: 'Profil',
    coachArea: 'Profil',
    brandEyebrow: 'LINEUP AMATEUR',
    saveLineup: '✓ Dizilişi kaydet',
    addPlayer: '+ Oyuncu ekle',
    createTeam: '+ Takım oluştur',
    pageTitleLineup: 'Diziliş planla',
    pageTitleRoster: 'Kadroyu yönet',
    pageTitleArchive: 'Takımlar ve dizilişler',
    pageTitleDesign: 'Tasarımı özelleştir',
    assignPlayerEyebrow: 'OYUNCU ATA',
    searchPlayer: 'Oyuncu ara',
    newPlayerForSlot: '+ Bu pozisyon için yeni oyuncu',
    manageRoster: 'Kadroyu yönet',
    selectionNoSlot: "İlk 11'de veya yedek kulübesinde bir pozisyon seç.",
    selectionNoSlotTitle: 'Hiçbir yer seçilmedi.',
    selectionNoSlotText: "Önce ilk 11'de veya yedek kulübesinde bir pozisyon seç.",
    starterSlot: 'İlk 11 · Pozisyon',
    benchSlotTitle: 'Yedek kulübesi',
    playerSelected: 'seçildi.',
    chooseFromRoster: 'Kadrodan bir oyuncu seç.',
    rosterEmptyAssignTitle: 'Kadron boş.',
    rosterEmptyAssignText: 'Hemen yeni bir oyuncu oluştur.',
    allSelectedTitle: 'Tüm oyuncular atandı.',
    allSelectedText: 'Yeniden atamak için bir yeri boşalt.',
    noPlayerFoundTitle: 'Oyuncu bulunamadı.',
    noPlayerFoundText: 'Aramayı düzenle.',
    kit: 'FORMA',
    trikotLook: 'Forma görünümü',
    teamName: 'Takım adı',
    sportLabel: 'Spor',
    sportFootball: 'Futbol',
    sportFutsal: 'Halı saha',
    crestPng: 'Amblem (PNG)',
    uploadPng: 'PNG yükle',
    removeCrest: 'Amblemi kaldır',
    primaryColor: 'Ana renk',
    secondaryColor: 'İkincil renk',
    numberColor: 'Numara rengi',
    accentColor: 'Menü rengi',
    grassColor: 'Saha rengi',
    lineColor: 'Çizgi rengi',
    grassPattern: 'Saha stili',
    patLinesGrass: 'Biçme çizgileri',
    patCheckerGrass: 'Dama',
    patCirclesGrass: 'Daireler',
    patTacticsGrass: 'Taktik tahtası',
    pattern: 'Desen',
    fieldEyebrow: 'SAHA',
    fieldLook: 'Saha görünümü',
    menuEyebrow: 'MENÜ',
    menuLook: 'Menü görünümü',
    patPlain: 'Düz',
    patStripes: 'Çizgili (dikey)',
    patHoops: 'Çizgili (yatay)',
    patDiagonal: 'Çizgili (çapraz)',
    patSleeves: 'Kollar ikincil renkte',
    patHalves: 'İki yarım',
    patSash: 'Kuşak',
    patCenterStripe: 'Geniş orta şerit',
    shapeLabel: 'Şekil',
    shapeJersey: 'Forma',
    shapeCircle: 'Daire',
    kitRoleField: 'Saha oyuncuları',
    lineupNameLabel: 'DİZİLİŞ ADI',
    clearLineup: '⟲ Dizilişi temizle',
    playerCountLabel: 'OYUNCU SAYISI',
    formationLabel: 'DİZİLİŞ',
    formationPlaceholder: 'örn. 442/4-4-2',
    confirmFormation: '✓ Onayla',
    freeMove: 'Oyuncuları sabitle',
    gridToggle: 'Izgara',
    gridSizeLabel: 'IZGARA BOYUTU',
    contactToggle: 'İletişim ve geri bildirim',
    contactEyebrow: 'GERİ BİLDİRİM',
    contactTitle: 'İletişim ve geri bildirim',
    contactText: 'Bir hata mı buldun ya da uygulama için bir fikrin mi var? Bize kısaca yaz.',
    contactNameLabel: 'Adın',
    contactEmailLabel: 'E-posta adresin',
    contactMessageLabel: 'Mesaj',
    contactMessagePlaceholder: 'Bize ne iletmek istersin?',
    contactSend: '✉ Gönder',
    contactSending: 'Gönderiliyor…',
    contactCancel: 'İptal',
    toastContactSent: 'Teşekkürler! Mesajın gönderildi, e-postana bir onay gidecek.',
    toastContactFailed: 'Gönderilemedi. Lütfen daha sonra tekrar dene.',
    toastContactMissingFields: 'Lütfen ad, e-posta adresi ve mesajı doldur.',
    benchEyebrow: 'YEDEK KULÜBESİ',
    benchOfMax: '/12 oyuncu',
    addBenchSlot: '+ Yedek oyuncu',
    coach: 'ANTRENÖR',
    coachPlaceholder: 'Antrenör yeri',
    free: 'Boş',
    playerEyebrow: 'OYUNCU',
    editPlayer: 'Oyuncuyu düzenle',
    appointCaptain: 'Kaptan yap',
    removeCaptain: 'Kaptanlığı kaldır',
    removePlayer: 'Oyuncuyu çıkar',
    editCoach: 'Antrenörü düzenle',
    rosterOf: 'KADROSU',
    allPlayers: 'Tüm oyuncular',
    playersInRoster: 'Kadrodaki oyuncular',
    colPlayer: 'Oyuncu',
    colNumber: 'No.',
    colYear: 'Doğum yılı',
    colPosition: 'Pozisyon',
    rosterEmptyTitle: 'Kadron hâlâ boş.',
    rosterEmptyText: 'Oyuncu ekle ve kadron için seç.',
    addFirstPlayer: 'İlk oyuncuyu ekle',
    rosterHintEmpty: 'Henüz kadro oluşturulmadı',
    rosterHintCount: 'oyuncu oluşturuldu',
    savedEyebrow: 'KAYDEDİLDİ',
    teamsAndLineups: 'Takımlar ve dizilişler',
    open: 'Aç',
    deleteTeam: 'Sil',
    playersLabel: 'oyuncu',
    lineupsLabel: 'diziliş',
    noLineupSaved: 'Henüz diziliş kaydedilmedi.',
    showMore: '↓ Daha fazla göster',
    showLess: '↑ Daha az göster',
    custom: 'Özel',
    name: 'İsim',
    jerseyNumber: 'Forma numarası',
    birthYear: 'Doğum yılı',
    position: 'Pozisyon',
    optional: 'isteğe bağlı',
    noSpecification: 'Belirtilmedi',
    statusAvailable: 'Uygun',
    statusQuestionable: 'Şüpheli',
    statusUnavailable: 'Uygun değil',
    statusLabel: 'Durum',
    posGoalkeeper: 'Kaleci',
    posDefense: 'Defans',
    posMidfield: 'Orta saha',
    posForward: 'Forvet',
    playerPhoto: 'Oyuncu fotoğrafı',
    profilePhoto: 'Profil fotoğrafı',
    uploadImage: 'Görsel yükle',
    removeImage: 'Görseli kaldır',
    deletePlayer: 'Oyuncuyu sil',
    cancel: 'İptal',
    save: 'Kaydet',
    coachNamePlaceholder: 'Antrenör adı',
    coachPhoto: 'Antrenör fotoğrafı',
    newTeamEyebrow: 'YENİ TAKIM',
    createTeamTitle: 'Takım oluştur',
    createTeamSubmit: 'Takım oluştur',
    editTeamEyebrow: 'TAKIMI DÜZENLE',
    editTeamTitle: 'Takımı düzenle',
    editTeam: 'Düzenle',
    accountEyebrow: 'HESAP',
    loginOrRegister: 'Giriş yap veya kaydol',
    emailAddress: 'E-posta adresi',
    continueWithEmail: 'E-posta ile devam et',
    continueWithGoogle: 'Google ile devam et',
    authOr: 'veya',
    loggedInAs: 'Şu olarak giriş yapıldı',
    logout: 'Çıkış yap',
    close: 'Kapat',
    emailLinkHint: 'Sana e-posta ile bir giriş bağlantısı göndereceğiz – şifreye gerek yok.',
    toastEmailLinkSent: 'Giriş bağlantısı gönderildi. Lütfen e-posta kutunu kontrol et.',
    toastEmailLinkFailed: 'Giriş bağlantısı gönderilemedi.',
    toastGoogleLoginFailed: 'Google ile giriş başarısız oldu.',
    toastLoggedIn: 'Giriş başarılı.',
    toastLoggedOut: 'Çıkış yapıldı.',
    toastAuthLoading: 'Giriş hâlâ yükleniyor, lütfen kısa bir süre bekle.',
    toastCloudLoaded: 'Kayıtlı takımların yüklendi.',
    toastCloudBackupStarted: 'Takımların artık hesabınla yedekleniyor.',
    toastCloudSyncFailed: 'Bulut senkronizasyonu başarısız oldu.',
    toastCloudSyncTooLarge:
      'Kaydedilemedi: çok fazla/büyük resim (oyuncu fotoğrafları, amblemler). Lütfen bazı resimleri kaldır veya küçült.',
    accountSettings: 'Hesap ayarları',
    username: 'Kullanıcı adı',
    usernameHint: 'Kullanıcı adın, örneğin takımını paylaşırken gösterilir.',
    usernameInvalid: 'Lütfen baştaki/sondaki boşluklar olmadan 2–24 karakter kullan.',
    chooseUsernameTitle: 'Kullanıcı adını seç',
    continueLabel: 'Devam et',
    chooseUsernameText: 'Başlamadan önce yeni hesabın için bir kullanıcı adına ihtiyacımız var.',
    toastUsernameSaved: 'Kullanıcı adı kaydedildi.',
    toastUsernameFailed: 'Kullanıcı adı kaydedilemedi.',
    dangerZoneTitle: 'Hesabı sil',
    dangerZoneHint:
      'Hesabını ve buna bağlı tüm verileri (takımlar, dizilişler, profil) kalıcı olarak siler. Bu işlem geri alınamaz.',
    deleteAccountButton: 'Hesabı kalıcı olarak sil',
    dangerEyebrow: 'DİKKAT',
    deleteAccountTitle: 'Hesabı kalıcı olarak sil',
    deleteAccountWarning:
      'Bu işlem hesabını ve tüm takımlarını, dizilişlerini ve profil verilerini kalıcı olarak siler. Bunu geri almanın bir yolu yoktur.',
    deleteConfirmWord: 'SİL',
    deleteAccountConfirmLabel: 'Onaylamak için SİL yaz',
    deleteAccountConfirmButton: 'Hesabı kalıcı olarak sil',
    deleteAccountConfirmMismatch: 'Onaylamak için tam olarak "SİL" yaz.',
    deleteAccountFailed: 'Hesap silinemedi. Lütfen tekrar dene.',
    deleteAccountReauthFailed: 'Yeniden kimlik doğrulama başarısız oldu. Hesabını silmek için tekrar dene.',
    toastAccountDeleted: 'Hesabın ve tüm verilerin kalıcı olarak silindi.',
    addPlayerEyebrow: 'KADROYU GENİŞLET',
    editPlayerEyebrow: 'OYUNCUYU DÜZENLE',
    addPlayerTitle: 'Oyuncu ekle',
    trainerFallback: 'Antrenör',
    myTeam: 'Takımım',
    newLineup: 'Yeni diziliş',
    toastFormationApplied: 'Diziliş uygulandı.',
    toastBenchFull: '12 yedek kulübesi yeri zaten dolu.',
    toastNumberTaken: 'Bu forma numarası zaten alınmış.',
    toastPlayerAssigned: 'doğrudan atandı.',
    toastPlayerSaved: 'Oyuncu kaydedildi.',
    toastPlayerDeleted: 'Oyuncu silindi.',
    toastLineupSaved: 'Diziliş kaydedildi.',
    toastLineupEmptyAlready: 'Diziliş zaten boş.',
    toastLineupCleared: 'Diziliş temizlendi.',
    toastLineupLoaded: 'Diziliş yüklendi.',
    toastLineupDeleted: 'Diziliş silindi.',
    toastTeamCreated: 'Takım oluşturuldu.',
    toastAtLeastOneTeam: 'En az bir takım kalmalı.',
    toastProfileSaved: 'Profil kaydedildi.',
    toastTeamUpdated: 'Takım güncellendi.',
    toastCustomFormationApplied: 'Özel diziliş uygulandı.',
    toastPngPlease: 'Lütfen bir diziliş gir.',
    toastFormationSum: 'Sayıların toplamı',
    toastFormationSumEnd: 'olmalı (şu anda',
    toastFormationSumEnd2: ', kaleci hariç).',
    toastFormationFormat: 'Lütfen geçerli bir diziliş gir, örn. 442/4-4-2',
    confirmDeletePlayer: 'gerçekten kadrodan silinsin mi?',
    confirmDeleteTeam1: 'kadrosu ve tüm kadrolarıyla birlikte gerçekten silinsin mi?',
    confirmClearLineup: 'İlk 11 ve yedek kulübesi gerçekten temizlensin mi?',
    pitchAriaLabel: 'Sahadaki ilk 11',
    editShort: 'Düzenle',
    deleteShort: 'Sil',
    nr: 'No.',
    yr: 'Yıl',
    coachAbbr: 'AN',
    preview: 'Önizleme',
    crestAlt: 'Amblem',
    pngSelectFile: 'Lütfen bir PNG dosyası seç.',
    selectionTitleDefault: 'Kadro',
    toastLineupFull: 'İlk 11 zaten dolu.',
    deleteLineupTitle: 'Dizilişi sil',
    editLineupTitle: 'Dizilişi düzenle',
    duplicateLineupTitle: 'Dizilişi çoğalt',
    toastLineupUpdated: 'Diziliş güncellendi.',
    toastLineupDuplicated: 'Diziliş çoğaltıldı.',
    copySuffix: 'Kopya',
    exportPngButton: '↗ Görseli PNG olarak al',
    exportPngEyebrow: 'GÖRSEL OLUŞTUR',
    exportPngTitle: 'Görseli PNG olarak al',
    exportTypeLabel: 'GÖRSEL TÜRÜ',
    exportTypeLineup: 'Normal görsel',
    exportTypeMatchday: 'Maç günü görseli',
    exportFormatLabel: 'FORMAT',
    exportFormatPortrait: '9:16 · Hikâye',
    exportFormatSquare: '1:1 · Kare',
    exportFormatLandscape: '16:9 · Geniş',
    exportPngConfirm: '↗ Görsel oluştur',
    shareTeam: 'Paylaş',
    leaveTeam: 'Ayrıl',
    sharedTeamHint: 'Bu takım paylaşılıyor',
    toastNoPermission: 'Bunun için yetkin yok.',
    roleOwner: 'Sahip',
    roleFull: 'Tam erişim',
    roleLineups: 'Sadece dizilişler',
    roleViewer: 'Sadece görüntüleme',
    confirmLeaveTeam: 'Bu paylaşılan takımdan gerçekten ayrılmak istiyor musun?',
    confirmRemoveMember: 'gerçekten takımdan çıkarılsın mı?',
    readOnlyBannerText: 'Bu alanda sadece görüntüleme yetkin var.',
    shareTeamEyebrow: 'TAKIMI PAYLAŞ',
    shareTeamTitle: 'Paylaş',
    inviteByEmail: 'E-posta ile davet et',
    invitePlaceholder: 'E-posta adresi',
    inviteRoleLabel: 'Yetki',
    sendInvite: 'Davet et',
    membersTitle: 'Üyeler',
    loadingMembers: 'Üyeler yükleniyor…',
    removeMember: 'Çıkar',
    invitesTitle: 'Davetler',
    noInvites: 'Bekleyen davet yok.',
    acceptInvite: 'Kabul et',
    declineInvite: 'Reddet',
    toastInviteSent: 'Davet gönderildi.',
    toastInviteAccepted: 'Davet kabul edildi.',
    toastMemberUpdated: 'Yetki değiştirildi.',
    toastMemberRemoved: 'Üye çıkarıldı.',
    openInvites: 'Davetler',
    closeDialog: 'Kapat',
    colorPickerSave: 'Rengi kaydet',
    colorPickerSavedColors: 'Kayıtlı renkler',
    colorPickerRemove: 'Kaldır',
    colorPickerChoose: 'Renk seç',
    promptConfirmEmail: 'Onaylamak için lütfen e-posta adresini gir:',
    csvExportButton: "CSV'ye aktar",
    csvImportButton: "CSV'den içe aktar",
    csvImportTitle: 'İsim, numara, doğum yılı, mevki sütunlarını içeren bir CSV içe aktar',
    toastCsvExported: 'Kadro CSV olarak indirildi.',
    toastCsvEmptyExport: 'Kadro boş, aktarılacak bir şey yok.',
    toastCsvImportFailed: 'CSV dosyası okunamadı.',
    toastCsvImportedSuffix: 'oyuncu içe aktarıldı.',
    toastCsvSkippedSuffix: 'atlandı (forma numarası zaten kullanılıyor).',
    inviteLinkTitle: 'Davet bağlantısı',
    inviteLinkHint: 'Bu bağlantıya sahip herkes takıma katılabilir – WhatsApp vb. üzerinden paylaşmak için ideal.',
    inviteLinkRoleLabel: 'Bağlantı için yetki',
    createInviteLink: 'Bağlantı oluştur',
    copyInviteLink: 'Kopyala',
    shareInviteLinkWhatsapp: "WhatsApp'ta paylaş",
    regenerateInviteLink: 'Yeniden oluştur',
    revokeInviteLink: 'Devre dışı bırak',
    toastInviteLinkCopied: 'Bağlantı kopyalandı.',
    toastInviteLinkCreated: 'Davet bağlantısı oluşturuldu.',
    toastInviteLinkRevoked: 'Davet bağlantısı devre dışı bırakıldı.',
    toastInviteLinkFailed: 'İşlem başarısız oldu.',
    confirmRevokeInviteLink: 'Mevcut davet bağlantısı gerçekten devre dışı bırakılsın mı? Zaten paylaşılan bağlantılar artık çalışmayacak.',
    joinTeamDialogEyebrow: 'DAVET',
    joinTeamDialogTitle: 'Takıma katıl',
    joinTeamConfirm: 'Katıl',
    joinTeamCancel: 'Hayır, teşekkürler',
    toastInviteLinkInvalid: 'Bu davet bağlantısı geçersiz veya devre dışı bırakılmış.',
    toastJoinedTeam: 'Takıma katıldın.',
    playerNotes: 'Notlar',
    playerNotesPlaceholder: 'ör. sakatlık, özel anlaşmalar …',
    playerNotesIndicatorTitle: 'Not mevcut',
    toastLoginToJoinTeam: 'Daveti takip etmek için giriş yap.',
    toastOfflineMode: 'Çevrimdışı: değişiklikler yerel olarak kaydediliyor.',
    toastBackOnline: 'Tekrar çevrimiçi: değişiklikleriniz senkronize ediliyor.',
    toastLineupSavedOffline: 'Çevrimdışı kaydedildi: hiçbir şeyin üzerine yazılmaması için yeni diziliş olarak oluşturuldu.',
    offlineSuffix: 'Çevrimdışı',
  },
  nl: {
    activeTeam: 'ACTIEF TEAM',
    navLineup: 'Opstelling',
    navRoster: 'Selectie',
    navArchive: 'Teams',
    navDesign: 'Ontwerp',
    navMatchday: 'Speeldag',
    pageTitleMatchday: 'Speeldag plannen',
    exportMatchdayPng: '↗ Afbeelding als PNG',
    matchdayEyebrow: 'SPEELDAG',
    matchdayDetails: 'Wedstrijdinfo',
    opponentName: 'Tegenstander',
    opponentPlaceholder: 'Naam tegenstander',
    homeAway: 'Thuis/Uit',
    home: 'Thuis',
    away: 'Uit',
    venue: 'Locatie',
    venuePlaceholder: 'Sportpark, straat',
    matchDate: 'Datum',
    matchTime: 'Aftrap',
    opponentCrest: 'Logo tegenstander',
    toastMatchdayPngCreated: 'Speeldagafbeelding als PNG gemaakt.',
    switchTheme: 'Thema wisselen',
    darkMode: 'Donkere modus',
    lightMode: 'Lichte modus',
    login: 'Inloggen',
    coachLogin: 'Trainer login',
    profileLabel: 'Profiel',
    coachArea: 'Profiel',
    brandEyebrow: 'LINEUP AMATEUR',
    saveLineup: '✓ Opstelling opslaan',
    addPlayer: '+ Speler toevoegen',
    createTeam: '+ Team aanmaken',
    pageTitleLineup: 'Opstelling plannen',
    pageTitleRoster: 'Selectie beheren',
    pageTitleArchive: 'Teams en opstellingen',
    pageTitleDesign: 'Ontwerp aanpassen',
    assignPlayerEyebrow: 'SPELER TOEWIJZEN',
    searchPlayer: 'Speler zoeken',
    newPlayerForSlot: '+ Nieuwe speler voor deze plek',
    manageRoster: 'Selectie beheren',
    selectionNoSlot: 'Kies een plek in de basisopstelling of op de bank.',
    selectionNoSlotTitle: 'Geen plek geselecteerd.',
    selectionNoSlotText: 'Kies eerst een plek in de basisopstelling of op de bank.',
    starterSlot: 'Basisopstelling · Plek',
    benchSlotTitle: 'Bank',
    playerSelected: 'is geselecteerd.',
    chooseFromRoster: 'Kies een speler uit de selectie.',
    rosterEmptyAssignTitle: 'Je selectie is leeg.',
    rosterEmptyAssignText: 'Maak meteen een nieuwe speler aan.',
    allSelectedTitle: 'Alle spelers zijn toegewezen.',
    allSelectedText: 'Maak een plek leeg om opnieuw toe te wijzen.',
    noPlayerFoundTitle: 'Geen speler gevonden.',
    noPlayerFoundText: 'Pas de zoekopdracht aan.',
    kit: 'SHIRT',
    trikotLook: 'Shirtontwerp',
    teamName: 'Teamnaam',
    sportLabel: 'Sport',
    sportFootball: 'Voetbal',
    sportFutsal: 'Zaalvoetbal',
    crestPng: 'Logo (PNG)',
    uploadPng: 'PNG uploaden',
    removeCrest: 'Logo verwijderen',
    primaryColor: 'Primaire kleur',
    secondaryColor: 'Secundaire kleur',
    numberColor: 'Nummerkleur',
    accentColor: 'Menukleur',
    grassColor: 'Veldkleur',
    lineColor: 'Lijnkleur',
    grassPattern: 'Veldstijl',
    patLinesGrass: 'Maailijnen',
    patCheckerGrass: 'Ruiten',
    patCirclesGrass: 'Cirkels',
    patTacticsGrass: 'Tactiekbord',
    pattern: 'Patroon',
    fieldEyebrow: 'VELD',
    fieldLook: 'Veldstijl',
    menuEyebrow: 'MENU',
    menuLook: 'Menustijl',
    patPlain: 'Effen',
    patStripes: 'Strepen (verticaal)',
    patHoops: 'Strepen (horizontaal)',
    patDiagonal: 'Strepen (diagonaal)',
    patSleeves: 'Mouwen in secundaire kleur',
    patHalves: 'Twee helften',
    patSash: 'Diagonale band',
    patCenterStripe: 'Brede middenstreep',
    shapeLabel: 'Vorm',
    shapeJersey: 'Shirt',
    shapeCircle: 'Cirkel',
    kitRoleField: 'Veldspelers',
    lineupNameLabel: 'NAAM OPSTELLING',
    clearLineup: '⟲ Opstelling leegmaken',
    playerCountLabel: 'AANTAL SPELERS',
    formationLabel: 'FORMATIE',
    formationPlaceholder: 'bijv. 442/4-4-2',
    confirmFormation: '✓ Bevestigen',
    freeMove: 'Spelers vastzetten',
    gridToggle: 'Raster',
    gridSizeLabel: 'RASTERGROOTTE',
    contactToggle: 'Contact & feedback',
    contactEyebrow: 'FEEDBACK',
    contactTitle: 'Contact & feedback',
    contactText: 'Een bug gevonden of een idee voor de app? Laat het ons weten.',
    contactNameLabel: 'Je naam',
    contactEmailLabel: 'Je e-mailadres',
    contactMessageLabel: 'Bericht',
    contactMessagePlaceholder: 'Wat wil je ons laten weten?',
    contactSend: '✉ Versturen',
    contactSending: 'Wordt verzonden…',
    contactCancel: 'Annuleren',
    toastContactSent: 'Bedankt! Je bericht is verzonden, je ontvangt een bevestiging per e-mail.',
    toastContactFailed: 'Versturen mislukt. Probeer het later opnieuw.',
    toastContactMissingFields: 'Vul naam, e-mailadres en bericht in.',
    benchEyebrow: 'BANK',
    benchOfMax: '/12 spelers',
    addBenchSlot: '+ Bankspeler',
    coach: 'TRAINER',
    coachPlaceholder: 'Trainersplek',
    free: 'Vrij',
    playerEyebrow: 'SPELER',
    editPlayer: 'Speler bewerken',
    appointCaptain: 'Aanvoerder aanwijzen',
    removeCaptain: 'Aanvoerderschap intrekken',
    removePlayer: 'Speler verwijderen',
    editCoach: 'Trainer bewerken',
    rosterOf: 'SELECTIE VAN',
    allPlayers: 'Alle spelers',
    playersInRoster: 'Spelers in de selectie',
    colPlayer: 'Speler',
    colNumber: 'Nr.',
    colYear: 'Geboortejaar',
    colPosition: 'Positie',
    rosterEmptyTitle: 'Je selectie is nog leeg.',
    rosterEmptyText: 'Voeg spelers toe en kies ze voor je opstelling.',
    addFirstPlayer: 'Eerste speler toevoegen',
    rosterHintEmpty: 'Nog geen selectie aangemaakt',
    rosterHintCount: 'spelers aangemaakt',
    savedEyebrow: 'OPGESLAGEN',
    teamsAndLineups: 'Teams en opstellingen',
    open: 'Openen',
    deleteTeam: 'Verwijderen',
    playersLabel: 'spelers',
    lineupsLabel: 'opstellingen',
    noLineupSaved: 'Nog geen opstelling opgeslagen.',
    showMore: '↓ Meer weergeven',
    showLess: '↑ Minder weergeven',
    custom: 'Aangepast',
    name: 'Naam',
    jerseyNumber: 'Rugnummer',
    birthYear: 'Geboortejaar',
    position: 'Positie',
    optional: 'optioneel',
    noSpecification: 'Niet opgegeven',
    statusAvailable: 'Beschikbaar',
    statusQuestionable: 'Twijfelachtig',
    statusUnavailable: 'Niet beschikbaar',
    statusLabel: 'Status',
    posGoalkeeper: 'Doelman',
    posDefense: 'Verdediging',
    posMidfield: 'Middenveld',
    posForward: 'Aanval',
    playerPhoto: 'Spelerfoto',
    profilePhoto: 'Profielfoto',
    uploadImage: 'Afbeelding uploaden',
    removeImage: 'Afbeelding verwijderen',
    deletePlayer: 'Speler verwijderen',
    cancel: 'Annuleren',
    save: 'Opslaan',
    coachNamePlaceholder: 'Naam trainer',
    coachPhoto: 'Foto trainer',
    newTeamEyebrow: 'NIEUW TEAM',
    createTeamTitle: 'Team aanmaken',
    createTeamSubmit: 'Team aanmaken',
    editTeamEyebrow: 'TEAM BEWERKEN',
    editTeamTitle: 'Team bewerken',
    editTeam: 'Bewerken',
    accountEyebrow: 'ACCOUNT',
    loginOrRegister: 'Inloggen of registreren',
    emailAddress: 'E-mailadres',
    continueWithEmail: 'Doorgaan met e-mail',
    continueWithGoogle: 'Doorgaan met Google',
    authOr: 'of',
    loggedInAs: 'Ingelogd als',
    logout: 'Uitloggen',
    close: 'Sluiten',
    emailLinkHint: 'We sturen je een inloglink per e-mail – geen wachtwoord nodig.',
    toastEmailLinkSent: 'Inloglink verzonden. Controleer je mailbox.',
    toastEmailLinkFailed: 'De inloglink kon niet worden verzonden.',
    toastGoogleLoginFailed: 'Inloggen met Google mislukt.',
    toastLoggedIn: 'Succesvol ingelogd.',
    toastLoggedOut: 'Uitgelogd.',
    toastAuthLoading: 'Inloggen wordt nog geladen, even geduld.',
    toastCloudLoaded: 'Je opgeslagen teams zijn geladen.',
    toastCloudBackupStarted: 'Je teams worden nu geback-upt naar je account.',
    toastCloudSyncFailed: 'Cloudsynchronisatie mislukt.',
    toastCloudSyncTooLarge:
      "Opslaan mislukt: te veel/te grote afbeeldingen (spelerfoto's, logo's). Verwijder of verklein een paar afbeeldingen.",
    accountSettings: 'Accountinstellingen',
    username: 'Gebruikersnaam',
    usernameHint: 'Je gebruikersnaam wordt bijvoorbeeld getoond als je je team deelt.',
    usernameInvalid: 'Gebruik 2–24 tekens, zonder spaties aan het begin of einde.',
    chooseUsernameTitle: 'Kies je gebruikersnaam',
    continueLabel: 'Doorgaan',
    chooseUsernameText: 'Voordat je begint, heeft je nieuwe account een gebruikersnaam nodig.',
    toastUsernameSaved: 'Gebruikersnaam opgeslagen.',
    toastUsernameFailed: 'Gebruikersnaam kon niet worden opgeslagen.',
    dangerZoneTitle: 'Account verwijderen',
    dangerZoneHint:
      'Verwijdert je account en alle bijbehorende gegevens (teams, opstellingen, profiel) permanent. Dit kan niet ongedaan worden gemaakt.',
    deleteAccountButton: 'Account definitief verwijderen',
    dangerEyebrow: 'LET OP',
    deleteAccountTitle: 'Account definitief verwijderen',
    deleteAccountWarning:
      'Deze actie verwijdert je account en al je teams, opstellingen en profielgegevens permanent. Dit kan niet ongedaan worden gemaakt.',
    deleteConfirmWord: 'VERWIJDEREN',
    deleteAccountConfirmLabel: 'Typ VERWIJDEREN ter bevestiging',
    deleteAccountConfirmButton: 'Account definitief verwijderen',
    deleteAccountConfirmMismatch: 'Typ precies "VERWIJDEREN" om te bevestigen.',
    deleteAccountFailed: 'Het account kon niet worden verwijderd. Probeer het opnieuw.',
    deleteAccountReauthFailed: 'Opnieuw inloggen mislukt. Probeer het opnieuw om je account te verwijderen.',
    toastAccountDeleted: 'Je account en alle gegevens zijn definitief verwijderd.',
    addPlayerEyebrow: 'SELECTIE UITBREIDEN',
    editPlayerEyebrow: 'SPELER BEWERKEN',
    addPlayerTitle: 'Speler toevoegen',
    trainerFallback: 'Trainer',
    myTeam: 'Mijn team',
    newLineup: 'Nieuwe opstelling',
    toastFormationApplied: 'Formatie toegepast.',
    toastBenchFull: 'Er zijn al 12 bankplekken bezet.',
    toastNumberTaken: 'Dit rugnummer is al vergeven.',
    toastPlayerAssigned: 'is direct toegewezen.',
    toastPlayerSaved: 'Speler opgeslagen.',
    toastPlayerDeleted: 'Speler verwijderd.',
    toastLineupSaved: 'Opstelling opgeslagen.',
    toastLineupEmptyAlready: 'De opstelling is al leeg.',
    toastLineupCleared: 'Opstelling leeggemaakt.',
    toastLineupLoaded: 'Opstelling geladen.',
    toastLineupDeleted: 'Opstelling verwijderd.',
    toastTeamCreated: 'Team aangemaakt.',
    toastAtLeastOneTeam: 'Er moet minstens één team overblijven.',
    toastProfileSaved: 'Profiel opgeslagen.',
    toastTeamUpdated: 'Team bijgewerkt.',
    toastCustomFormationApplied: 'Aangepaste formatie toegepast.',
    toastPngPlease: 'Voer een formatie in.',
    toastFormationSum: 'De getallen moeten samen',
    toastFormationSumEnd: 'zijn (momenteel',
    toastFormationSumEnd2: ', doelman niet meegerekend).',
    toastFormationFormat: 'Voer een geldige formatie in, bijv. 442/4-4-2',
    confirmDeletePlayer: 'echt uit de selectie verwijderen?',
    confirmDeleteTeam1: 'echt verwijderen met selectie en alle opstellingen?',
    confirmClearLineup: 'Basisopstelling en bank echt leegmaken?',
    pitchAriaLabel: 'Basisopstelling op het veld',
    editShort: 'Bewerken',
    deleteShort: 'Verwijderen',
    nr: 'Nr.',
    yr: 'Jr.',
    coachAbbr: 'TR',
    preview: 'Voorbeeld',
    crestAlt: 'Logo',
    pngSelectFile: 'Selecteer een PNG-bestand.',
    selectionTitleDefault: 'Selectie',
    toastLineupFull: 'De basisopstelling is al vol.',
    deleteLineupTitle: 'Opstelling verwijderen',
    editLineupTitle: 'Opstelling bewerken',
    duplicateLineupTitle: 'Opstelling dupliceren',
    toastLineupUpdated: 'Opstelling bijgewerkt.',
    toastLineupDuplicated: 'Opstelling gedupliceerd.',
    copySuffix: 'Kopie',
    exportPngButton: '↗ Afbeelding als PNG',
    exportPngEyebrow: 'AFBEELDING MAKEN',
    exportPngTitle: 'Afbeelding als PNG',
    exportTypeLabel: 'SOORT AFBEELDING',
    exportTypeLineup: 'Normale afbeelding',
    exportTypeMatchday: 'Speeldagafbeelding',
    exportFormatLabel: 'FORMAAT',
    exportFormatPortrait: '9:16 · Story',
    exportFormatSquare: '1:1 · Vierkant',
    exportFormatLandscape: '16:9 · Breed',
    exportPngConfirm: '↗ Afbeelding maken',
    shareTeam: 'Delen',
    leaveTeam: 'Verlaten',
    sharedTeamHint: 'Dit team wordt gedeeld',
    toastNoPermission: 'Daar heb je geen toestemming voor.',
    roleOwner: 'Eigenaar',
    roleFull: 'Volledige toegang',
    roleLineups: 'Alleen opstellingen',
    roleViewer: 'Alleen bekijken',
    confirmLeaveTeam: 'Dit gedeelde team echt verlaten?',
    confirmRemoveMember: 'echt uit het team verwijderen?',
    readOnlyBannerText: 'Je hebt alleen leestoegang tot dit gedeelte.',
    shareTeamEyebrow: 'TEAM DELEN',
    shareTeamTitle: 'Delen',
    inviteByEmail: 'Uitnodigen per e-mail',
    invitePlaceholder: 'E-mailadres',
    inviteRoleLabel: 'Toestemming',
    sendInvite: 'Uitnodigen',
    membersTitle: 'Leden',
    loadingMembers: 'Leden worden geladen…',
    removeMember: 'Verwijderen',
    invitesTitle: 'Uitnodigingen',
    noInvites: 'Geen openstaande uitnodigingen.',
    acceptInvite: 'Accepteren',
    declineInvite: 'Weigeren',
    toastInviteSent: 'Uitnodiging verzonden.',
    toastInviteAccepted: 'Uitnodiging geaccepteerd.',
    toastMemberUpdated: 'Toestemming gewijzigd.',
    toastMemberRemoved: 'Lid verwijderd.',
    openInvites: 'Uitnodigingen',
    closeDialog: 'Sluiten',
    colorPickerSave: 'Kleur opslaan',
    colorPickerSavedColors: 'Opgeslagen kleuren',
    colorPickerRemove: 'Verwijderen',
    colorPickerChoose: 'Kleur kiezen',
    promptConfirmEmail: 'Voer ter bevestiging je e-mailadres in:',
    csvExportButton: 'CSV exporteren',
    csvImportButton: 'CSV importeren',
    csvImportTitle: 'Importeer een CSV met de kolommen naam, nummer, jaar, positie',
    toastCsvExported: 'Selectie gedownload als CSV.',
    toastCsvEmptyExport: 'Selectie is leeg, niets te exporteren.',
    toastCsvImportFailed: 'CSV-bestand kon niet worden gelezen.',
    toastCsvImportedSuffix: 'spelers geïmporteerd.',
    toastCsvSkippedSuffix: 'overgeslagen (rugnummer al vergeven).',
    inviteLinkTitle: 'Uitnodigingslink',
    inviteLinkHint: 'Iedereen met deze link kan lid worden van het team – ideaal om te delen via WhatsApp e.d.',
    inviteLinkRoleLabel: 'Rechten voor de link',
    createInviteLink: 'Link aanmaken',
    copyInviteLink: 'Kopiëren',
    shareInviteLinkWhatsapp: 'Delen via WhatsApp',
    regenerateInviteLink: 'Opnieuw genereren',
    revokeInviteLink: 'Deactiveren',
    toastInviteLinkCopied: 'Link gekopieerd.',
    toastInviteLinkCreated: 'Uitnodigingslink aangemaakt.',
    toastInviteLinkRevoked: 'Uitnodigingslink gedeactiveerd.',
    toastInviteLinkFailed: 'Actie mislukt.',
    confirmRevokeInviteLink: 'Huidige uitnodigingslink echt deactiveren? Al gedeelde links werken daarna niet meer.',
    joinTeamDialogEyebrow: 'UITNODIGING',
    joinTeamDialogTitle: 'Lid worden van team',
    joinTeamConfirm: 'Lid worden',
    joinTeamCancel: 'Nee, bedankt',
    toastInviteLinkInvalid: 'Deze uitnodigingslink is ongeldig of gedeactiveerd.',
    toastJoinedTeam: 'Lid geworden van het team.',
    playerNotes: 'Notities',
    playerNotesPlaceholder: 'bijv. blessure, bijzondere afspraken …',
    playerNotesIndicatorTitle: 'Notitie aanwezig',
    toastLoginToJoinTeam: 'Log in om de uitnodiging te volgen.',
    toastOfflineMode: 'Offline: wijzigingen worden lokaal opgeslagen.',
    toastBackOnline: 'Weer online: je wijzigingen worden gesynchroniseerd.',
    toastLineupSavedOffline: 'Offline opgeslagen: aangemaakt als nieuwe opstelling zodat niets wordt overschreven.',
    offlineSuffix: 'Offline',
  },
};

const t = (key) => (I18N[app?.lang || 'de'] && I18N[app.lang][key]) || I18N.de[key] || key;

/* ============================================================
   DATENMODELL: Team / Aufstellung erzeugen, normalisieren, migrieren
   ============================================================ */
function initialDraft(playerCount = 11) {
  const formation = FORMATIONS[playerCount][0][0];
  // "Spieler fixieren" ist standardmäßig aus -> eine neue Aufstellung startet im freien
  // Bewegungsmodus (formation:'custom'); previousFormation merkt sich weiterhin die Standardformation
  // als Basis-Layout für die Platzhalter.
  return {
    lineupName: 'Neue Aufstellung',
    playerCount,
    formation: 'custom',
    previousFormation: formation,
    starters: Array(playerCount).fill(null),
    bench: Array(12).fill(null),
    positions: {},
    slotPositions: {},
    captainId: null,
    gridEnabled: false,
    gridSize: 5,
    positionsLocked: false,
    matchday: { opponent: '', homeAway: 'home', venue: '', date: '', time: '', opponentCrest: '' },
  };
}
function blankTeam(name = 'Mein Team') {
  // ownerUid: null = "Gast-Mannschaft" (immer lokal sichtbar). Sobald ein Konto angemeldet ist, wird
  // hier die Firebase-UID des Kontos eingetragen (siehe createTeam/syncFromCloudOnLogin) - solche
  // Mannschaften werden beim Abmelden ausgeblendet und erst nach erneutem Anmelden wieder geladen.
  // sharedId: Firestore-Dokument-ID (teams/{sharedId}), sobald diese Mannschaft geteilt wurde - dann
  // wird sie NICHT mehr im appState-Blob des Besitzers gespeichert, sondern als eigenes Dokument
  // (siehe firebase-init.js). myRole: Rechte des aktuell angemeldeten Kontos an dieser Mannschaft
  // ('owner'|'full'|'lineups'|'viewer') - für nicht geteilte Mannschaften stets 'owner' (voller Zugriff).
  return {
    id: uid('team'),
    name,
    ownerUid: null,
    sharedId: null,
    myRole: 'owner',
    // 'football' (Fußball, Standard) oder 'futsal' (Kleinfeldfußball) - steuert die verfügbaren
    // Spielerzahlen (nur 5-9 statt 5-11) sowie das Spielfeld-Design (siehe renderPitch/CSS
    // ".pitch.sport-futsal": schmaleres Spielfeld ohne Strafraum, mit Halbkreisen statt Torraum).
    sport: 'football',
    crest: '',
    squad: [],
    coach: { name: '', photo: '' },
    kit: { primary: '#000000', secondary: '#ffffff', numberColor: '#ffffff', pattern: 'sleeves', shape: 'jersey' },
    gkKit: { primary: '#1abc50', secondary: '#ffffff', numberColor: '#ffffff', pattern: 'sleeves' },
    appearance: { accent: '#1abc50', grass: '#2e5706', grassPattern: 'lines', lineColor: '#ffffff' },
    draft: initialDraft(),
    lineups: [],
    matchday: { opponent: '', homeAway: 'home', venue: '', date: '', time: '', opponentCrest: '' },
  };
}
function normalizeTeam(input = {}) {
  const playerCount = [5, 6, 7, 8, 9, 10, 11].includes(Number(input.draft?.playerCount))
    ? Number(input.draft.playerCount)
    : 11;
  const base = blankTeam(input.name || 'Mein Team');
  const team = {
    ...base,
    ...input,
    id: input.id || base.id,
    ownerUid: input.ownerUid || null,
    sharedId: input.sharedId || null,
    myRole: input.myRole || 'owner',
    coach: { ...base.coach, ...(input.coach || {}) },
    kit: { ...base.kit, ...(input.kit || {}) },
    gkKit: { ...base.gkKit, ...(input.gkKit || {}) },
    appearance: { ...base.appearance, ...(input.appearance || {}) },
    matchday: { ...base.matchday, ...(input.matchday || {}) },
  };
  // Lokal "newDraft" genannt (statt "draft"), damit diese Variable nicht den gleichnamigen globalen
  // draft()-Helper (= aktuelle Aufstellung der aktiven Mannschaft) überschattet und verwirrt.
  const newDraft = { ...initialDraft(playerCount), ...(input.draft || {}) };
  newDraft.playerCount = playerCount;
  newDraft.starters = Array.from({ length: playerCount }, (_, i) => newDraft.starters?.[i] || null);
  newDraft.bench = Array.from({ length: 12 }, (_, i) => newDraft.bench?.[i] || null);
  newDraft.positions = newDraft.positions || {};
  newDraft.slotPositions = newDraft.slotPositions || {};
  newDraft.captainId = newDraft.captainId || null;
  // Migration: Spieltag-Daten lagen bisher pro Mannschaft (team.matchday). Für bereits vorhandene
  // Nutzer:innen werden sie einmalig in die aktuell aktive Aufstellung übernommen, falls dort noch
  // keine eigenen Spieltag-Daten stehen - danach gilt der Spieltag nur noch pro Aufstellung.
  if (!input.draft?.matchday && input.matchday) newDraft.matchday = { ...newDraft.matchday, ...input.matchday };
  team.draft = newDraft;
  team.squad = (Array.isArray(team.squad) ? team.squad : []).map(migratePlayerPositions);
  // Nur unkritische Standardwerte ergänzen (nichts umsortieren/kürzen): fehlende positions/
  // slotPositions/previousFormation an gespeicherten Aufstellungen auffüllen, damit miniPitch() nicht
  // auf undefined zugreift. starters/bench bewusst UNVERÄNDERT lassen - jede Neuberechnung ihrer Länge
  // anhand von playerCount kann Spieler auf andere Indizes verschieben, wenn playerCount und die
  // tatsächliche Array-Länge historisch mal auseinanderliefen, und dadurch Positionen/Trikots (Slot 0
  // = Torwart-Trikot) sichtbar durcheinanderbringen.
  team.lineups = (Array.isArray(team.lineups) ? team.lineups : []).map((lineup) => ({
    ...lineup,
    positions: lineup.positions || {},
    slotPositions: lineup.slotPositions || {},
    previousFormation: lineup.previousFormation || (lineup.formation !== 'custom' ? lineup.formation : undefined),
  }));
  return team;
}
function sharedTeamFromHash() {
  const match = location.hash.match(/^#lineup=([^&]+)/);
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(match[1]))))).team;
  } catch (_) {
    return null;
  }
}
function migrateLegacy() {
  const legacy = readJson('lineup-amateur-v3');
  if (!legacy) return null;
  const team = blankTeam(legacy.team?.name || 'Mein Team');
  team.crest = legacy.team?.crest || '';
  team.squad = legacy.squad || [];
  team.coach =
    typeof legacy.coach === 'string' ? { name: legacy.coach, photo: '' } : { ...team.coach, ...(legacy.coach || {}) };
  team.kit = { ...team.kit, ...(legacy.kit || {}) };
  team.appearance = { ...team.appearance, ...(legacy.appearance || {}) };
  const playerCount = [5, 6, 7, 8, 9, 10, 11].includes(Number(legacy.playerCount)) ? Number(legacy.playerCount) : 11;
  team.draft = {
    ...initialDraft(playerCount),
    lineupName: legacy.lineupName || 'Neue Aufstellung',
    formation: legacy.formation || FORMATIONS[playerCount][0][0],
    starters: Array.from({ length: playerCount }, (_, i) => legacy.starters?.[i] || null),
    bench: Array.from({ length: 12 }, (_, i) => legacy.bench?.[i] || null),
    positions: legacy.positions || {},
    captainId: legacy.captainId || null,
  };
  return team;
}
/* ============================================================
   APP-STATE: laden/initialisieren
   ============================================================ */
const SUPPORTED_LANGS = ['de', 'en', 'es', 'fr', 'it', 'pt', 'tr', 'nl'];
const stored = readJson(STORAGE_KEY);
const shared = sharedTeamFromHash();
// Einladungslink (siehe firebase-init.js createInviteLink/joinViaInviteLink): der Token steckt als
// ?invite=... in der URL, wenn diese Seite über einen geteilten Link geöffnet wurde. Wird sofort aus
// der URL entfernt (damit ein Reload nicht erneut den Beitrittsdialog auslöst) und in
// pendingInviteToken gemerkt, bis ein Login-Status feststeht (siehe maybeHandlePendingInviteLink).
let pendingInviteToken = new URLSearchParams(location.search).get('invite') || null;
if (pendingInviteToken) {
  const cleanUrl = new URL(location.href);
  cleanUrl.searchParams.delete('invite');
  history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
}
const legacy = migrateLegacy();
const accountInfo = readJson(ACCOUNT_KEY);
const accountCache = accountInfo ? readJson(ACCOUNT_TEAMS_CACHE_KEY) : null;
// Offline-Fallback: passt der Cache zum zuletzt angemeldeten Konto, werden dessen Mannschaften SOFORT
// aus dem lokalen Cache angezeigt, statt (wie bisher) leer auf den Cloud-Abruf zu warten. Sobald danach
// online der echte syncFromCloudOnLogin()-Abruf durchläuft, wird das ohnehin mit den frischen
// Cloud-Daten überschrieben (siehe dort) - hier geht also nichts verloren, es schließt nur die Lücke,
// bis diese Antwort da ist bzw. füllt sie dauerhaft, falls gar keine Verbindung besteht.
const cachedAccountTeams =
  accountInfo && accountCache && accountCache.uid === accountInfo.uid && Array.isArray(accountCache.teams)
    ? accountCache.teams.map(normalizeTeam).filter((team) => team.ownerUid === accountInfo.uid)
    : [];
// Nur Gast-Mannschaften (ohne ownerUid) werden lokal aus STORAGE_KEY geladen. Mannschaften, die zu
// einem Konto gehören, kommen erst nach dem Login aus der Cloud dazu (siehe syncFromCloudOnLogin) -
// so verschwinden sie beim Abmelden automatisch aus der Ansicht.
const app = stored?.teams
  ? {
      theme: stored.theme || 'dark',
      lang: SUPPORTED_LANGS.includes(stored.lang) ? stored.lang : 'de',
      teams: [
        ...stored.teams.map(normalizeTeam).filter((team) => !team.ownerUid && !team.sharedId),
        ...cachedAccountTeams,
      ],
      activeTeamId: stored.activeTeamId,
    }
  : cachedAccountTeams.length
    ? {
        theme: accountCache.theme || 'dark',
        lang: SUPPORTED_LANGS.includes(accountCache.lang) ? accountCache.lang : 'de',
        teams: cachedAccountTeams,
        activeTeamId: accountCache.activeTeamId,
      }
    : { theme: 'dark', lang: 'de', teams: [normalizeTeam(shared || legacy || blankTeam())], activeTeamId: null };
// Wenn ein Konto angemeldet war (ACCOUNT_KEY vorhanden) und lokal keine Gast-Mannschaft mehr übrig ist
// (weil alle Mannschaften bereits dem Konto gehören), wird HIER absichtlich noch KEINE neue leere
// Mannschaft angelegt/gespeichert: Das würde eine "Geister-Mannschaft" erzeugen, die nach dem
// asynchronen Cloud-Sync (syncFromCloudOnLogin) neben den echten Mannschaften stehen bleibt, weil sie
// selbst schon lokal gespeichert wäre, bevor die echten Mannschaften aus der Cloud eintreffen. In diesem
// Fall wartet die App auf den Cloud-Sync (siehe activeTeam()-Fallback unten sowie die
// "lineup-auth-changed"-Behandlung), die bei Bedarf selbst eine Mannschaft anlegt.
const awaitingCloudSync = !app.teams.length && !!readJson(ACCOUNT_KEY);
if (!app.teams.length && !awaitingCloudSync) app.teams.push(blankTeam());
if (app.teams.length && (!app.activeTeamId || !app.teams.some((team) => team.id === app.activeTeamId)))
  app.activeTeamId = app.teams[0].id;
let selectedSlot = { type: '', index: -1 };
let drag = null;
let playerImageRemoved = false;
let coachImageRemoved = false;
let editTeamCrestRemoved = false;
let profileMode = 'player';
let expandedArchiveTeams = new Set();
let assignSearchTerm = '';
let kitEditRole = 'field';
// Geteilte Mannschaften (Mannschaft teilen): pro geteilter Mannschaft läuft ein Live-Abo auf ihr
// Firestore-Dokument (siehe attachSharedTeamListener) - hier gesammelt, damit sie beim Abmelden
// oder beim Verlassen einer Mannschaft sauber wieder abbestellt werden können.
let sharedTeamUnsubs = new Map();
let sharedSaveTimers = new Map();
let myInvites = [];
// Rechte des angemeldeten Kontos an einer Mannschaft: nicht geteilte (lokale/eigene) Mannschaften
// haben immer vollen Zugriff. Bei geteilten Mannschaften entscheidet team.myRole (vom Besitzer beim
// Teilen vergeben): 'owner' = Besitzer, 'full' = Vollzugriff (Kader+Aufstellungen, aber nicht
// verwalten/löschen/teilen), 'lineups' = darf nur Aufstellungen erstellen/bearbeiten, 'viewer' = darf
// nur ansehen.
function teamPerms(team) {
  if (!team || !team.sharedId) return { squad: true, lineups: true, manage: true };
  const role = team.myRole || 'viewer';
  if (role === 'owner') return { squad: true, lineups: true, manage: true };
  if (role === 'full') return { squad: true, lineups: true, manage: false };
  if (role === 'lineups') return { squad: false, lineups: true, manage: false };
  return { squad: false, lineups: false, manage: false };
}
function activePerms() {
  return teamPerms(activeTeam());
}
function requirePerm(kind) {
  if (activePerms()[kind]) return true;
  showToast(t('toastNoPermission'), 'error');
  return false;
}
// Reine Cloud-Nutzdaten einer Mannschaft (ohne die lokalen/flüchtigen Felder sharedId/myRole -
// ownerUid bleibt außen vor, weil er im Firestore-Dokument bereits auf oberster Ebene steht).
function teamCloudPayload(team) {
  const clean = clone(team);
  delete clean.sharedId;
  delete clean.myRole;
  delete clean.ownerUid;
  return clean;
}
// Nur als Platzhalter für's Rendern, solange auf den Cloud-Sync gewartet wird (siehe awaitingCloudSync
// oben) - wird NIE in app.teams aufgenommen oder gespeichert, verhindert also keine echte Mannschaft.
let cloudSyncPlaceholderTeam = null;
const activeTeam = () =>
  app.teams.find((team) => team.id === app.activeTeamId) || app.teams[0] || (cloudSyncPlaceholderTeam ||= blankTeam());
const draft = () => activeTeam().draft;
const playerFor = (id) => activeTeam().squad.find((player) => player.id === id);
// Speichert nur die Gast-Mannschaften (ohne ownerUid) lokal - Konto-Mannschaften landen ausschließlich
// in der Cloud (scheduleCloudSave), damit sie beim Abmelden nicht länger lokal sichtbar bleiben.
// Aktualisiert den Offline-Cache der Konto-Mannschaften (siehe ACCOUNT_TEAMS_CACHE_KEY oben) - wird
// sowohl bei jeder lokalen Änderung (save()) als auch nach jedem erfolgreichen Cloud-Sync aufgerufen,
// damit ein späterer Offline-Start immer den zuletzt bekannten Stand zeigt.
function cacheAccountTeams() {
  if (!firebaseUser) return;
  const accountTeams = app.teams.filter((team) => team.ownerUid === firebaseUser.uid && !team.sharedId);
  const activeTeamId = accountTeams.some((team) => team.id === app.activeTeamId)
    ? app.activeTeamId
    : accountTeams[0]?.id || null;
  localStorage.setItem(
    ACCOUNT_TEAMS_CACHE_KEY,
    JSON.stringify({ uid: firebaseUser.uid, theme: app.theme, lang: app.lang, teams: accountTeams, activeTeamId }),
  );
}
const save = (continuousKey) => {
  const guestTeams = app.teams.filter((team) => !team.ownerUid && !team.sharedId);
  const guestActiveId = guestTeams.some((team) => team.id === app.activeTeamId)
    ? app.activeTeamId
    : guestTeams[0]?.id || null;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ theme: app.theme, lang: app.lang, teams: guestTeams, activeTeamId: guestActiveId }),
  );
  cacheAccountTeams();
  scheduleCloudSave();
  scheduleSharedTeamsSave();
  pushHistory(continuousKey);
};
// Speichert (mit kurzer Verzögerung pro Mannschaft) alle geteilten Mannschaften, an denen man selbst
// schreibend beteiligt ist, in ihr eigenes Firestore-Dokument - unabhängig vom appState-Blob des
// Kontos (siehe scheduleCloudSave), da geteilte Mannschaften dort bewusst ausgeschlossen sind.
function scheduleSharedTeamsSave() {
  if (!firebaseUser || !window.lineupAuth) return;
  app.teams
    .filter(
      (team) =>
        (team.sharedId && teamPerms(team).manage) ||
        (team.sharedId && teamPerms(team).squad) ||
        (team.sharedId && teamPerms(team).lineups),
    )
    .forEach((team) => {
      clearTimeout(sharedSaveTimers.get(team.sharedId));
      const payload = teamCloudPayload(team);
      const timer = setTimeout(() => {
        window.lineupAuth.saveSharedTeam(team.sharedId, payload).catch((err) => {
          console.error('Speichern der geteilten Mannschaft fehlgeschlagen:', err);
          // Wie bei scheduleCloudSave: offline ist kein echter Fehler, sondern wird automatisch
          // nachgeholt, sobald wieder eine Verbindung besteht (siehe "online"-Event).
          if (!navigator.onLine) return;
          showToast(t('toastCloudSyncFailed'), 'error');
        });
      }, 800);
      sharedSaveTimers.set(team.sharedId, timer);
    });
}

/* ============================================================
   RÜCKGÄNGIG / WIEDERHOLEN (global, über alle Reiter hinweg)
   ============================================================
   Nutzt den bestehenden save()-Aufruf (der nach praktisch jeder Datenänderung in jedem Reiter
   ausgeführt wird) als Zeitpunkt, um einen Snapshot des App-Zustands abzulegen. So muss keine
   einzelne Aktion im restlichen Code angepasst werden. */
const HISTORY_LIMIT = 50;
let historyStack = [];
let historyIndex = -1;
let suppressHistory = false;
// Schnell aufeinanderfolgende Aufrufe VOM GLEICHEN Feld (z. B. jeder einzelne Tastenanschlag
// beim Tippen eines Namens, oder jedes Farb-Update während man einen Farbregler zieht) werden zu
// EINEM Verlaufsschritt gebündelt - sonst füllen wenige Sekunden Tippen den ganzen HISTORY_LIMIT
// und "Rückgängig" wirkt danach nur noch einmal. Wechselt die Quelle (z. B. Name tippen, dann
// sofort eine Farbe ändern) oder ist es eine normale Einzelaktion (kein Schlüssel), wird ein
// eventuell wartender Bündel-Schritt sofort abgeschlossen und die neue Aktion bekommt ihren
// EIGENEN Schritt - so nimmt ein Klick auf "Rückgängig" nie zwei unterschiedliche Aktionen auf
// einmal zurück.
let historyDebounceTimer = null;
let historyDebounceSource = null;
function snapshotState() {
  return { theme: app.theme, lang: app.lang, teams: clone(app.teams), activeTeamId: app.activeTeamId };
}
function commitHistory() {
  historyDebounceTimer = null;
  historyDebounceSource = null;
  const snap = snapshotState();
  if (historyIndex >= 0 && JSON.stringify(snap) === JSON.stringify(historyStack[historyIndex])) {
    updateUndoRedoButtons();
    return;
  }
  historyStack = historyStack.slice(0, historyIndex + 1);
  historyStack.push(snap);
  if (historyStack.length > HISTORY_LIMIT) historyStack.shift();
  historyIndex = historyStack.length - 1;
  updateUndoRedoButtons();
}
function pushHistory(continuousKey) {
  if (suppressHistory) return;
  if (continuousKey && continuousKey === historyDebounceSource) {
    clearTimeout(historyDebounceTimer);
    historyDebounceTimer = setTimeout(commitHistory, 400);
    return;
  }
  if (historyDebounceTimer) {
    clearTimeout(historyDebounceTimer);
    commitHistory();
  }
  if (continuousKey) {
    historyDebounceSource = continuousKey;
    historyDebounceTimer = setTimeout(commitHistory, 400);
  } else {
    commitHistory();
  }
}
function flushHistoryDebounce() {
  if (historyDebounceTimer) {
    clearTimeout(historyDebounceTimer);
    commitHistory();
  }
}
function applyHistorySnapshot(snap) {
  flushHistoryDebounce();
  suppressHistory = true;
  app.theme = snap.theme;
  app.lang = snap.lang;
  app.teams = clone(snap.teams);
  app.activeTeamId = snap.activeTeamId;
  if (!app.teams.some((team) => team.id === app.activeTeamId)) app.activeTeamId = app.teams[0]?.id || null;
  selectedSlot = { type: 'starter', index: 0 };
  applyTheme();
  renderAll();
  if (currentView === 'matchday') renderMatchday();
  suppressHistory = false;
  updateUndoRedoButtons();
}
function undoHistory() {
  flushHistoryDebounce();
  if (historyIndex <= 0) return;
  historyIndex--;
  applyHistorySnapshot(historyStack[historyIndex]);
}
function redoHistory() {
  flushHistoryDebounce();
  if (historyIndex >= historyStack.length - 1) return;
  historyIndex++;
  applyHistorySnapshot(historyStack[historyIndex]);
}
function updateUndoRedoButtons() {
  const undoBtn = byId('undoButton'),
    redoBtn = byId('redoButton');
  if (undoBtn) undoBtn.disabled = historyIndex <= 0;
  if (redoBtn) redoBtn.disabled = historyIndex >= historyStack.length - 1;
}

let cloudSaveTimer = null;
let lastCloudSaveErrorToast = 0;
// Baut das aktuell zu speichernde Cloud-Payload für das eingeloggte Konto. Ausgelagert aus
// scheduleCloudSave(), damit sowohl der verzögerte Auto-Save als auch flushCloudSave() (sofortiges,
// blockierendes Speichern z. B. vor dem Abmelden) dieselbe Logik nutzen.
function buildCloudSavePayload() {
  const accountTeams = app.teams.filter((team) => team.ownerUid === firebaseUser.uid && !team.sharedId);
  const activeTeamId = accountTeams.some((team) => team.id === app.activeTeamId)
    ? app.activeTeamId
    : accountTeams[0]?.id || null;
  return { theme: app.theme, lang: app.lang, teams: accountTeams, activeTeamId };
}
function reportCloudSaveError(err) {
  console.error('Cloud-Speichern fehlgeschlagen:', err);
  if (!navigator.onLine) return;
  const now = Date.now();
  if (now - lastCloudSaveErrorToast > 10000) {
    lastCloudSaveErrorToast = now;
    const tooLarge =
      err?.code === 'resource-exhausted' || /longer than|exceeds|too large|maximum size/i.test(err?.message || '');
    showToast(tooLarge ? t('toastCloudSyncTooLarge') : t('toastCloudSyncFailed'), 'error');
  }
}
// Schreibt den App-Zustand (mit kurzer Verzögerung, damit nicht bei jedem Tastendruck einzeln
// gespeichert wird) in die Cloud – aber nur, wenn gerade ein Firebase-Konto angemeldet ist, und nur
// die Mannschaften, die zu diesem Konto gehören (ownerUid === aktuelle UID).
function scheduleCloudSave() {
  clearTimeout(cloudSaveTimer);
  if (!firebaseUser || !window.lineupAuth) return;
  cloudSaveTimer = setTimeout(() => {
    cloudSaveTimer = null;
    const payload = buildCloudSavePayload();
    // Firestore begrenzt ein einzelnes Dokument auf ca. 1 MiB. Da Spielerfotos, Trainerbild und
    // Wappen als Base64 direkt im Team-Objekt liegen, kann dieses Limit überschritten werden -
    // ohne Vorwarnung würde der Speichervorgang dann lautlos fehlschlagen (siehe .catch unten) und
    // auf einem zweiten Gerät fehlten scheinbar grundlos Aufstellungen. Hier grob vorab schätzen.
    const approxBytes = new Blob([JSON.stringify(payload)]).size;
    if (approxBytes > 900000) {
      const now = Date.now();
      if (now - lastCloudSaveErrorToast > 10000) {
        lastCloudSaveErrorToast = now;
        showToast(t('toastCloudSyncTooLarge'), 'error');
      }
      return;
    }
    window.lineupAuth.saveCloudData(payload).catch((err) => {
      // Kein Internet? Dann ist das kein "echter" Fehler, sondern der erwartete Offline-Zustand - die
      // Änderung bleibt lokal (localStorage) erhalten und wird automatisch nachgesendet, sobald der
      // "online"-Event oben feuert. Keinen Fehler-Toast zeigen, sonst wirkt es wie ein Datenverlust.
      reportCloudSaveError(err);
    });
  }, 800);
}
// Wird vor dem Abmelden aufgerufen: Ohne diese Funktion konnte folgender Datenverlust auftreten -
// scheduleCloudSave() wartet 800ms, bevor es tatsächlich in die Cloud schreibt. Meldete sich der
// Nutzer in diesem Zeitfenster ab (z. B. direkt nachdem er eine neue Mannschaft angelegt hatte),
// wurde signOutUser() sofort ausgeführt, während der ausstehende Cloud-Save nie abgeschickt wurde.
// logoutCleanup() blendet daraufhin lokal alle Mannschaften des Kontos aus (sie "verschwinden"), und
// da sie nie in der Cloud ankamen, blieben sie auch nach erneutem Login für immer verschwunden. Diese
// Funktion storniert einen wartenden Timer und schreibt stattdessen sofort und mit await, sodass der
// Logout garantiert erst NACH dem erfolgreichen Speichern passiert.
async function flushCloudSave() {
  if (!firebaseUser || !window.lineupAuth) return;
  if (cloudSaveTimer) {
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = null;
  }
  const payload = buildCloudSavePayload();
  const approxBytes = new Blob([JSON.stringify(payload)]).size;
  if (approxBytes > 900000) {
    showToast(t('toastCloudSyncTooLarge'), 'error');
    return;
  }
  try {
    await window.lineupAuth.saveCloudData(payload);
  } catch (err) {
    reportCloudSaveError(err);
  }
}
const assigned = () => [...draft().starters, ...draft().bench].filter(Boolean);
const kitClass = (team) => `kit-${team.kit.pattern}`;
/* Feinpositionen: siehe Definition am Dateianfang (vor normalizeTeam benötigt) */
const isGoalkeeper = (player) => playerPositions(player).includes('TW');
/* Torhüter-Trikot wird über den Aufstellungs-Slot bestimmt, nicht über die Positionsangabe des
   Spielers: Slot 0 der Startelf ist immer der Torwart-Platz (siehe computePositions - erster Eintrag
   liegt am eigenen Tor). So bekommt ein Feldspieler im Tor automatisch das TW-Trikot, während ein als
   TW geführter Spieler im Feld sein normales Trikot trägt. Der freie Platzhalter auf Slot 0 zeigt
   ebenfalls schon das TW-Trikot. */
const isGoalkeeperSlot = (type, index) => type === 'starter' && index === 0;
const kitStyleVars = (kit) => ` style="--kit-a:${kit.primary};--kit-b:${kit.secondary};--number:${kit.numberColor}"`;
function currentEditKit(team = activeTeam()) {
  return kitEditRole === 'gk' ? team.gkKit || team.kit : team.kit;
}
function kitForPlayer(player, team = activeTeam()) {
  return isGoalkeeper(player) ? team.gkKit || team.kit : team.kit;
}
function kitStyleAttr(player, team = activeTeam()) {
  if (!isGoalkeeper(player)) return '';
  const kit = kitForPlayer(player, team);
  return kitStyleVars(kit);
}
const number = (player) => player?.number ?? '';
const shortPosition = (player) => {
  const codes = playerPositions(player);
  return codes.length ? codes.join('/') : '–';
};
const positionLabel = (player) => {
  const codes = playerPositions(player);
  return codes.length ? codes.join(' · ') : t('noSpecification');
};

/* ============================================================
   FORMATIONEN & SPIELER-POSITIONEN
   ============================================================ */
function customModeBaseFormation(d = draft()) {
  return resolveCustomBaseFormation(d.playerCount, d.previousFormation);
}
function customModeBaseFormationForRecord(record) {
  /* Same fallback logic as customModeBaseFormation(), but for a saved lineup record (which has no
     live draft to read from) - used so archive previews and screenshots of a lineup that was saved
     while "Spieler verschieben" was active show the formation it was actually based on, not always
     the first preset for that player count. */
  return resolveCustomBaseFormation(record.playerCount, record.previousFormation);
}
function resolveCustomBaseFormation(playerCount, previousFormation) {
  /* Shared fallback logic for customModeBaseFormation()/customModeBaseFormationForRecord(): while
     free-move ("Spieler verschieben") is active, the stored formation is just the literal 'custom'
     marker, so any fallback layout (e.g. for slots without an explicit saved position) must be based
     on whichever formation was actually selected beforehand (previousFormation), not always the very
     first preset — otherwise the pitch visually snaps back to that default formation. */
  const fallback = FORMATIONS[playerCount][0][0];
  if (!previousFormation || previousFormation === 'custom') return fallback;
  const known =
    FORMATIONS[playerCount].some(([id]) => id === previousFormation) ||
    isValidFormationString(previousFormation, playerCount);
  return known ? previousFormation : fallback;
}
function formationLabel(formation, playerCount) {
  /* Archive display label for a saved lineup's formation. Player-entered formations are stored with
     the goalkeeper as their own leading row (e.g. "1-4-4-2", see parseCustomFormationShorthand), but
     that keeper digit should not be shown here - only the outfield rows (e.g. "4-4-2"). Preset
     formations from FORMATIONS never include a keeper digit, so they are shown unchanged. */
  if (formation === 'custom') return t('custom');
  const isPreset = (FORMATIONS[playerCount] || []).some(([id]) => id === formation);
  const display = isPreset ? formation : formation.replace(/^1-/, '');
  return display.replaceAll('-', '–');
}
function parseFormationInput(text, playerCount) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return { valid: false, reason: 'empty' };
  if (!/^\d+(-\d+)*$/.test(trimmed)) return { valid: false, reason: 'format' };
  const rows = trimmed.split('-').map(Number);
  if (rows.some((n) => n <= 0 || n > 9)) return { valid: false, reason: 'range' };
  const sum = rows.reduce((a, b) => a + b, 0);
  if (sum !== playerCount) return { valid: false, reason: 'sum', sum };
  return { valid: true, formation: trimmed, rows, sum };
}
function isValidFormationString(str, playerCount) {
  return parseFormationInput(str, playerCount).valid;
}
function parseCustomFormationShorthand(text, playerCount) {
  /* User-facing shorthand: no goalkeeper digit, dash optional (e.g. "442" or "4-4-2").
     Internally still stored as "1-4-4-2" so the existing "entered formation" position logic
     (which expects the goalkeeper as its own leading row) keeps working unchanged. */
  const trimmed = String(text || '').trim();
  if (!trimmed) return { valid: false, reason: 'empty' };
  let rows;
  if (trimmed.includes('-')) {
    if (!/^\d+(-\d+)*$/.test(trimmed)) return { valid: false, reason: 'format' };
    rows = trimmed.split('-').map(Number);
  } else {
    if (!/^\d+$/.test(trimmed)) return { valid: false, reason: 'format' };
    rows = trimmed.split('').map(Number);
  }
  if (rows.some((n) => n <= 0 || n > 9)) return { valid: false, reason: 'range' };
  const sum = rows.reduce((a, b) => a + b, 0),
    required = playerCount - 1;
  if (sum !== required) return { valid: false, reason: 'sum', sum, required };
  return { valid: true, formation: `1-${rows.join('-')}`, rows, sum };
}
function setFormation(value) {
  const d = draft();
  d.formation = value;
  if (value !== 'custom') d.previousFormation = value;
}
/* Horizontale Verteilung pro Zeilengröße: keine gleichförmige Aufteilung mehr, sondern
   an echte Aufstellungen angelehnte Breiten (z. B. eine 4er-Kette näher an den Außenlinien
   als eine 3er-Kette, Einzelspieler immer zentral). */
const ROW_WIDTH_PROFILES = {
  1: [50],
  2: [32, 68],
  3: [20, 50, 80],
  4: [10, 37, 63, 90],
  5: [7, 28, 50, 72, 93],
};
function rowXPositions(players) {
  const profile = ROW_WIDTH_PROFILES[players];
  if (profile) return profile;
  // Fallback für ungewöhnlich große Reihen (>5 Spieler): gleichmäßig, aber mit Rand.
  return Array.from({ length: players }, (_, index) => 7 + (index * (93 - 7)) / (players - 1 || 1));
}
function computePositions(formation, playerCount) {
  /* Shared layout math for positionsFor() (live draft) and positionsForRecord() (saved archive
     lineups). `formation` is always a concrete formation id here - never the literal 'custom' marker -
     since every caller resolves 'custom' to its underlying base formation (via customModeBaseFormation
     / customModeBaseFormationForRecord) before calling in. */
  const rows = formation.split('-').map(Number);
  const isEnteredFormation = !(FORMATIONS[playerCount] || []).some(([id]) => id === formation);
  if (isEnteredFormation) {
    /* Player-entered formation: digits sum to playerCount directly (no separate implicit keeper slot),
       so the user is expected to include the goalkeeper as its own row, e.g. "1-4-4-2". */
    return rows.flatMap((players, rowIndex) => {
      const y = rows.length === 1 ? 50 : 88 - (rowIndex * 73) / (rows.length - 1);
      return rowXPositions(players).map((x) => ({ x, y }));
    });
  }
  // Voreingestellte Formationen (ohne expliziten Torwart-Eintrag): der Torwart wird zwar getrennt
  // fix bei y=89 platziert, die Feldspieler-Reihen aber exakt nach demselben Prinzip wie oben verteilt
  // - so ergibt z. B. die Voreinstellung "4-3-3" dieselbe Abwehr-/Mittelfeld-/Sturm-Tiefe wie das
  // gleichwertige eingetippte "1-4-3-3" (rowIndex+1, weil der Torwart hier row 0 wäre, aber separat
  // behandelt wird). Vorher stand hier eine eigene, abweichende Formel, wodurch eine neu erstellte
  // Aufstellung (die intern auf die erste Voreinstellung zurückfällt) sichtbar tiefer stand als beim
  // manuellen Eintippen derselben Formation.
  return [
    { x: 50, y: 89 },
    ...rows.flatMap((players, rowIndex) => {
      const y = rows.length === 1 ? 48 : 88 - ((rowIndex + 1) * 73) / rows.length;
      return rowXPositions(players).map((x) => ({ x, y }));
    }),
  ];
}
function positionsFor(formation) {
  return computePositions(formation, draft().playerCount);
}
/* ============================================================
   FARBEN & RENDERING: Team-Look, Trikot, Formationen, Kader-Header
   ============================================================ */
function hexToRgb(hex) {
  const clean = String(hex).replace('#', '');
  const value = parseInt(
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean,
    16,
  );
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}
function mix(first, second, amount) {
  const a = hexToRgb(first),
    b = hexToRgb(second);
  return `#${[a.r + (b.r - a.r) * amount, a.g + (b.g - a.g) * amount, a.b + (b.b - a.b) * amount].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}
/* Erzeugt die Feldlinien/-punkte (Außenlinie, Mittelkreis, Strafraum bzw. Kleinfeld-Torraum,
   Eckviertelkreise, Punkte) als SVG-String in der übergebenen Farbe - bewusst OHNE die Torlinie
   selbst (siehe .pitch::after/.mini-pitch::after in styles.css), da das Tor laut Vorgabe nicht
   mitgefärbt werden soll. */
function pitchLinesSvg(sport, color) {
  const c = color || '#ffffff';
  const base = `<rect x="0.3" y="0.3" width="77.4" height="99.4"/><circle cx="39" cy="50" r="9.5"/><line x1="0" y1="50" x2="78" y2="50"/>`;
  const areas =
    sport === 'futsal'
      ? `<path d="M18.5,0.3A16,16 0 0 0 34.5,16.3"/><path d="M43.5,16.3L34.5,16.3"/><path d="M43.5,16.3A16,16 0 0 0 59.5,0.3"/><path d="M18.5,99.7A16,16 0 0 1 34.5,83.7"/><path d="M43.5,83.7L34.5,83.7"/><path d="M43.5,83.7A16,16 0 0 1 59.5,99.7"/>`
      : `<rect x="15.88" y="0.3" width="46.25" height="15.71"/><rect x="28.49" y="0.3" width="21.01" height="5.24"/><path d="M31.08 16.01A9.5 9.5 0 0 0 46.92 16.01"/><rect x="15.88" y="83.99" width="46.25" height="15.71"/><rect x="28.49" y="94.46" width="21.01" height="5.24"/><path d="M31.08 83.99A9.5 9.5 0 0 1 46.92 83.99"/>`;
  const corners = `<path d="M2.0 0.3A2.0 2.0 0 0 1 0.3 2.0"/><path d="M76.0 0.3A2.0 2.0 0 0 0 77.7 2.0"/><path d="M0.3 98.0A2.0 2.0 0 0 1 2.0 99.7"/><path d="M77.7 98.0A2.0 2.0 0 0 0 76.0 99.7"/>`;
  const dots = `<circle cx="39" cy="50" r="0.5" fill="${c}" stroke="none"/><circle cx="39" cy="11" r="0.5" fill="${c}" stroke="none"/><circle cx="39" cy="89" r="0.5" fill="${c}" stroke="none"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -3 78 106"><g fill="none" stroke="${c}" stroke-opacity="0.82" stroke-width="0.55">${base}${areas}${corners}${dots}</g></svg>`;
}
function pitchLinesCssUrl(sport, color) {
  return `url('data:image/svg+xml,${encodeURIComponent(pitchLinesSvg(sport, color))}')`;
}
function renderAppearance() {
  const team = activeTeam(),
    root = document.documentElement,
    rgb = hexToRgb(team.appearance.accent);
  root.style.setProperty('--accent', team.appearance.accent);
  root.style.setProperty(
    '--accent-deep',
    mix(team.appearance.accent, app.theme === 'dark' ? '#ffffff' : '#000000', app.theme === 'dark' ? 0.35 : 0.28),
  );
  root.style.setProperty('--accent-shadow', `rgba(${rgb.r},${rgb.g},${rgb.b},.24)`);
  root.style.setProperty('--grass-a', team.appearance.grass);
  root.style.setProperty('--grass-b', mix(team.appearance.grass, '#000000', 0.09));
  root.style.setProperty('--line-svg', pitchLinesCssUrl(team.sport, team.appearance.lineColor));
}
const KIT_SHAPES = [
  ['jersey', 'shapeJersey'],
  ['circle', 'shapeCircle'],
];
const KIT_PATTERNS = [
  ['plain', 'patPlain'],
  ['stripes', 'patStripes'],
  ['hoops', 'patHoops'],
  ['diagonal', 'patDiagonal'],
  ['sleeves', 'patSleeves'],
  ['halves', 'patHalves'],
  ['sash', 'patSash'],
  ['centerstripe', 'patCenterStripe'],
];
const GRASS_PATTERNS = [
  ['lines', 'patLinesGrass'],
  ['checker', 'patCheckerGrass'],
  ['circles', 'patCirclesGrass'],
  ['tactics', 'patTacticsGrass'],
];
function renderGrassPatternPicker(team) {
  const container = byId('grassPatternPicker');
  if (!container) return;
  container.replaceChildren();
  GRASS_PATTERNS.forEach(([value, labelKey]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `pattern-swatch${(team.appearance.grassPattern || 'lines') === value ? ' active' : ''}`;
    button.title = t(labelKey);
    button.setAttribute('aria-label', t(labelKey));
    button.innerHTML = `<span class="swatch-grass pat-${value}" style="--grass-a:${team.appearance.grass};--grass-b:${mix(team.appearance.grass, '#000000', 0.09)}"></span>`;
    button.addEventListener('click', () => {
      activeTeam().appearance.grassPattern = value;
      renderAll();
    });
    container.append(button);
  });
}
function renderKitShapePicker(team) {
  const container = byId('kitShapePicker');
  container.replaceChildren();
  // Vorschau-Farben/Muster müssen vom gerade bearbeiteten Trikot (Feld oder TW, siehe kitEditRole)
  // kommen statt immer vom Feld-Trikot, sonst ändert sich die Formvorschau beim TW-Trikot nicht mit.
  const kit = currentEditKit(team);
  KIT_SHAPES.forEach(([value, labelKey]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `shape-swatch${team.kit.shape === value ? ' active' : ''}`;
    button.title = t(labelKey);
    button.setAttribute('aria-label', t(labelKey));
    button.innerHTML = `<span class="swatch-jersey kit-${kit.pattern}${value === 'circle' ? ' circle-shape' : ''}" style="--kit-a:${kit.primary};--kit-b:${kit.secondary}"></span>`;
    button.addEventListener('click', () => {
      activeTeam().kit.shape = value;
      renderAll();
    });
    container.append(button);
  });
}
function renderKitPatternPicker(team) {
  const container = byId('kitPatternPicker');
  container.replaceChildren();
  const kit = currentEditKit(team);
  const shapeClass = team.kit.shape === 'circle' ? ' circle-shape' : '';
  KIT_PATTERNS.forEach(([value, labelKey]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `pattern-swatch${kit.pattern === value ? ' active' : ''}`;
    button.title = t(labelKey);
    button.setAttribute('aria-label', t(labelKey));
    button.innerHTML = `<span class="swatch-jersey kit-${value}${shapeClass}" style="--kit-a:${kit.primary};--kit-b:${kit.secondary}"></span>`;
    button.addEventListener('click', () => {
      (kitEditRole === 'gk' ? activeTeam().gkKit : activeTeam().kit).pattern = value;
      renderAll();
    });
    container.append(button);
  });
}
function renderKit() {
  const team = activeTeam(),
    root = document.documentElement,
    kit = currentEditKit(team);
  root.style.setProperty('--kit-a', team.kit.primary);
  root.style.setProperty('--kit-b', team.kit.secondary);
  root.style.setProperty('--number', team.kit.numberColor);
  byId('kitPrimary').value = kit.primary;
  byId('kitSecondary').value = kit.secondary;
  byId('kitNumberColor').value = kit.numberColor;
  root.dataset.shape = team.kit.shape || 'jersey';
  const preview = byId('kitPreview');
  preview.className = `kit-preview kit-${kit.pattern}`;
  preview.style.setProperty('--kit-a', kit.primary);
  preview.style.setProperty('--kit-b', kit.secondary);
  preview.style.setProperty('--number', kit.numberColor);
  const roleToggle = byId('kitRoleToggle');
  if (roleToggle)
    roleToggle
      .querySelectorAll('button[data-role]')
      .forEach((btn) => btn.classList.toggle('active', btn.dataset.role === kitEditRole));
  renderKitShapePicker(team);
  renderKitPatternPicker(team);
}
function renderDesignPreview() {
  const team = activeTeam();
  const grassField = byId('designGrassColor');
  if (grassField) grassField.value = team.appearance.grass;
  const lineField = byId('designLineColor');
  if (lineField) lineField.value = team.appearance.lineColor || '#ffffff';
  const accentField = byId('designAccentColor');
  if (accentField) accentField.value = team.appearance.accent;
  const pitchPreview = byId('designPitchPreview');
  if (pitchPreview) {
    const grassB = mix(team.appearance.grass, '#000000', 0.09);
    pitchPreview.style.setProperty('--grass-a', team.appearance.grass);
    pitchPreview.style.setProperty('--grass-b', grassB);
    pitchPreview.style.setProperty('--line-svg', pitchLinesCssUrl(team.sport, team.appearance.lineColor));
    pitchPreview.className = `mini-pitch pat-${team.appearance.grassPattern || 'lines'}${team.sport === 'futsal' ? ' sport-futsal' : ''}`;
  }
  const accentPreview = byId('designAccentPreview');
  if (accentPreview) {
    accentPreview.style.background = team.appearance.accent;
    accentPreview.textContent = team.crest ? '' : initials(team.name);
    accentPreview.innerHTML = team.crest ? `<img src="${team.crest}" alt="">` : esc(initials(team.name));
  }
  renderGrassPatternPicker(team);
}
function renderFormations() {
  const d = draft();
  const presetIds = FORMATIONS[d.playerCount].map(([id]) => id);
  const isKnown =
    presetIds.includes(d.formation) || d.formation === 'custom' || isValidFormationString(d.formation, d.playerCount);
  if (!isKnown) d.formation = presetIds[0];
  const maxPlayers = activeTeam().sport === 'futsal' ? FUTSAL_PLAYER_COUNTS[FUTSAL_PLAYER_COUNTS.length - 1] : 11;
  byId('playerCount')
    .querySelectorAll('button')
    .forEach((button) => {
      const value = Number(button.dataset.value);
      // Kleinfeldfußball: 10/11 Spieler ausblenden (siehe FUTSAL_PLAYER_COUNTS) - für "richtigen"
      // Fußball bleiben weiterhin alle Optionen 5-11 sichtbar.
      button.classList.toggle('hidden', value > maxPlayers);
      button.classList.toggle('active', value === d.playerCount);
    });
  const freeMoveToggle = byId('freeMoveToggle');
  if (freeMoveToggle) freeMoveToggle.checked = d.formation !== 'custom' || !!d.positionsLocked;
  const gridToggle = byId('gridToggle');
  if (gridToggle) gridToggle.checked = !!d.gridEnabled;
  const gridSizeInput = byId('gridSizeInput');
  if (gridSizeInput) gridSizeInput.value = d.gridSize || 5;
  const gridSizeValue = byId('gridSizeValue');
  if (gridSizeValue) gridSizeValue.textContent = `${d.gridSize || 5}%`;
  if (gridSizeInput) gridSizeInput.classList.toggle('hidden', !d.gridEnabled);
  if (gridSizeValue) gridSizeValue.classList.toggle('hidden', !d.gridEnabled);
}
function initials(value) {
  return (value || 'LA')
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
function renderTeam() {
  const team = activeTeam();
  byId('teamNamePreview').textContent = team.name;
  byId('rosterTeamName').textContent = team.name.toUpperCase();
  const crest = byId('teamCrest');
  crest.innerHTML = team.crest
    ? `<img src="${team.crest}" alt="${esc(team.name)} ${t('crestAlt')}">`
    : `<b>${esc(initials(team.name))}</b>`;
  byId('lineupName').value = draft().lineupName;
  byId('coachNamePreview').textContent = team.coach.name || t('coachPlaceholder');
  const coach = byId('coachAvatar');
  coach.innerHTML = team.coach.photo ? `<img src="${team.coach.photo}" alt="${esc(team.coach.name)}">` : t('coachAbbr');
}
function playerVisual(player, team = activeTeam(), className = '', gkOverride = null) {
  if (player?.photo)
    return `<img class="${className || 'player-photo'}" src="${player.photo}" alt="${esc(player.name)}">`;
  const isGk = gkOverride === null ? isGoalkeeper(player) : gkOverride;
  const kit = isGk ? team.gkKit || team.kit : team.kit;
  return `<span class="jersey kit-${kit.pattern}"${isGk ? kitStyleVars(kit) : ''}>${number(player)}</span>`;
}
function placeholderJersey(isGk, team = activeTeam(), extraClass = 'placeholder') {
  const kit = isGk ? team.gkKit || team.kit : team.kit;
  return `<span class="jersey kit-${kit.pattern} ${extraClass}"${isGk ? kitStyleVars(kit) : ''}></span>`;
}

/* ============================================================
   DRAG & DROP (Maus-Events + Touch-Fallback via Pointer Events)
   ============================================================ */
function makeDropTarget(element, type, index) {
  element.dataset.slotType = type;
  element.dataset.slotIndex = String(index);
  element.addEventListener('dragover', (event) => {
    event.preventDefault();
    element.classList.add('drag-over');
  });
  element.addEventListener('dragleave', () => element.classList.remove('drag-over'));
  element.addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();
    element.classList.remove('drag-over');
    const id = event.dataTransfer.getData('application/x-lineup-player');
    if (id) assignPlayer(id, type, index);
  });
}
/* Touch fallback for drag & drop: the native HTML5 Drag and Drop API (dragstart/dragover/drop) used
   above only fires for mouse input, not for touch, so on phones/tablets dragging a player from the
   list or moving them between pitch/bench never worked. This adds a parallel, touch-only drag using
   Pointer Events (mirrors the existing beginMove/onMove/endMove pattern used for free formation move).
   It only activates for pointerType 'touch' and only once the finger has moved a few pixels, so a plain
   tap still triggers the normal click handlers (selecting a slot, choosing a player, etc.) untouched. */
let itemDrag = null;
function findItemDropTarget(clientX, clientY, sourceType) {
  const el = document.elementFromPoint(clientX, clientY);
  if (!el) return null;
  const token = el.closest('.player-token');
  if (token && token.dataset.slotType === 'starter') return { type: 'starter', index: Number(token.dataset.slotIndex) };
  const bench = el.closest('.bench-slot');
  if (bench) return { type: 'bench', index: Number(bench.dataset.slotIndex) };
  if (sourceType !== 'available') {
    const availableRow = el.closest('.available-player');
    if (availableRow && availableRow.dataset.playerId) return { type: 'assign', id: availableRow.dataset.playerId };
    if (el.closest('#selectionCard')) return { type: 'unassign' };
  }
  return null;
}
function itemDropTargetElement(target) {
  if (!target) return null;
  if (target.type === 'starter')
    return document.querySelector(`.player-token[data-slot-type="starter"][data-slot-index="${target.index}"]`);
  if (target.type === 'bench') return document.querySelector(`.bench-slot[data-slot-index="${target.index}"]`);
  if (target.type === 'assign') return document.querySelector(`.available-player[data-player-id="${target.id}"]`);
  return byId('selectionCard');
}
function attachTouchDragSource(element, id, sourceType) {
  element.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch') return;
    itemDrag = {
      id,
      sourceType,
      el: element,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      dropTarget: null,
    };
    element.addEventListener('pointermove', onItemDragMove);
    element.addEventListener('pointerup', endItemDrag, { once: true });
    element.addEventListener('pointercancel', cancelItemDrag, { once: true });
  });
}
function onItemDragMove(event) {
  if (!itemDrag || event.pointerId !== itemDrag.pointerId) return;
  if (!itemDrag.active) {
    if (Math.hypot(event.clientX - itemDrag.startX, event.clientY - itemDrag.startY) < 10) return;
    itemDrag.active = true;
    try {
      itemDrag.el.setPointerCapture(itemDrag.pointerId);
    } catch (_) {}
    itemDrag.el.classList.add('dragging');
  }
  event.preventDefault();
  document.querySelectorAll('.drag-over').forEach((element) => element.classList.remove('drag-over'));
  const target = findItemDropTarget(event.clientX, event.clientY, itemDrag.sourceType);
  itemDrag.dropTarget = target;
  const targetEl = itemDropTargetElement(target);
  if (targetEl) targetEl.classList.add('drag-over');
}
function endItemDrag(event) {
  if (!itemDrag || event.pointerId !== itemDrag.pointerId) {
    itemDrag = null;
    return;
  }
  itemDrag.el.removeEventListener('pointermove', onItemDragMove);
  const wasActive = itemDrag.active;
  if (wasActive) {
    itemDrag.el.classList.remove('dragging');
    try {
      itemDrag.el.releasePointerCapture(itemDrag.pointerId);
    } catch (_) {}
    document.querySelectorAll('.drag-over').forEach((element) => element.classList.remove('drag-over'));
  }
  const { id, dropTarget } = itemDrag;
  itemDrag = null;
  if (!wasActive) return;
  if (dropTarget?.type === 'starter') assignPlayer(id, 'starter', dropTarget.index);
  else if (dropTarget?.type === 'bench') assignPlayer(id, 'bench', dropTarget.index);
  else if (dropTarget?.type === 'assign') dropOnAvailablePlayer(id, dropTarget.id);
  else if (dropTarget?.type === 'unassign') unassignPlayer(id);
}
function cancelItemDrag() {
  if (!itemDrag) return;
  itemDrag.el.removeEventListener('pointermove', onItemDragMove);
  if (itemDrag.active) {
    itemDrag.el.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach((element) => element.classList.remove('drag-over'));
  }
  itemDrag = null;
}
/* ============================================================
   RENDERING: Spielfeld, Ersatzbank, Spieler-Zuweisung, Kader, Archiv
   ============================================================ */
function renderBench() {
  const team = activeTeam(),
    d = draft(),
    container = byId('benchSlots');
  container.replaceChildren();
  d.bench.forEach((id, index) => {
    const player = id ? playerFor(id) : null;
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = `bench-slot${selectedSlot.type === 'bench' && selectedSlot.index === index ? ' selected' : ''}${player ? '' : ' empty'}`;
    if (player) {
      slot.innerHTML = `${playerVisual(player, team, 'bench-image')}<strong>${esc(player.name)}</strong>`;
      slot.draggable = true;
      slot.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('application/x-lineup-player', player.id);
        event.dataTransfer.effectAllowed = 'move';
      });
      attachTouchDragSource(slot, player.id, 'bench');
    } else {
      slot.innerHTML = `<span class="jersey ${kitClass(team)} placeholder"></span><span>${t('free')}</span>`;
    }
    slot.addEventListener('click', () => {
      selectSlot('bench', index);
      renderPlayerProfile(player, index);
    });
    makeDropTarget(slot, 'bench', index);
    container.append(slot);
  });
  byId('benchCount').textContent = d.bench.filter(Boolean).length;
}
function miniKitBackground(kit) {
  /* Must mirror the exact stop percentages of the .jersey.kit-* rules in styles.css (and jerseyPatternCss()
     used for the PNG export) so the archive mini-preview shows the same stripe width/count as everywhere
     else. The previous repeating-linear-gradient() shorthand used a 12.5%-wide repeat unit (6.25% per colour)
     instead of the 25%-wide unit (12.5% per colour) used elsewhere, so stripes/hoops/diagonal rendered twice
     as many, half as wide, stripes here only.
     "sleeves" is NOT handled here anymore: a flat horizontal-band gradient across the full jersey height
     doesn't match the real jersey, whose white "sleeves" are two small diagonal wedges cut into the shoulders
     only (see .jersey.kit-sleeves::before/::after in styles.css). That mismatch made the sleeves look like
     stripes running past the shoulders in the archive preview. Sleeves are instead drawn via the
     .mini-kit-sleeves CSS class (see miniPitch()), which reproduces those exact shoulder-wedge clip-paths. */
  const a = kit.primary,
    b = kit.secondary,
    pattern = kit.pattern;
  switch (pattern) {
    case 'stripes':
      return `linear-gradient(90deg,${a} 0,${a} 6.25%,${b} 6.25%,${b} 18.75%,${a} 18.75%,${a} 31.25%,${b} 31.25%,${b} 43.75%,${a} 43.75%,${a} 56.25%,${b} 56.25%,${b} 68.75%,${a} 68.75%,${a} 81.25%,${b} 81.25%,${b} 93.75%,${a} 93.75%,${a} 100%)`;
    case 'hoops':
      return `linear-gradient(0deg,${a} 0,${a} 6.25%,${b} 6.25%,${b} 18.75%,${a} 18.75%,${a} 31.25%,${b} 31.25%,${b} 43.75%,${a} 43.75%,${a} 56.25%,${b} 56.25%,${b} 68.75%,${a} 68.75%,${a} 81.25%,${b} 81.25%,${b} 93.75%,${a} 93.75%,${a} 100%)`;
    case 'diagonal':
      return `linear-gradient(135deg,${b} 0,${b} 6.25%,${a} 6.25%,${a} 18.75%,${b} 18.75%,${b} 31.25%,${a} 31.25%,${a} 43.75%,${b} 43.75%,${b} 56.25%,${a} 56.25%,${a} 68.75%,${b} 68.75%,${b} 81.25%,${a} 81.25%,${a} 93.75%,${b} 93.75%,${b} 100%)`;
    case 'halves':
      return `linear-gradient(90deg,${a} 0 50%,${b} 50%)`;
    case 'sash':
      return `linear-gradient(135deg,${a} 0 38%,${b} 38% 61%,${a} 61%)`;
    case 'centerstripe':
      return `linear-gradient(90deg,${a} 0 32%,${b} 32% 68%,${a} 68%)`;
    default:
      return a;
  }
}
function miniPitch(record, team) {
  const positions =
    record.formation === 'custom'
      ? positionsForRecord({ ...record, formation: customModeBaseFormationForRecord(record) })
      : positionsForRecord(record);
  const kit = record.kit || team.kit;
  const gkKit = record.gkKit || team.gkKit || kit;
  const grassA = team.appearance.grass,
    grassB = mix(grassA, '#000000', 0.09),
    lineSvg = pitchLinesCssUrl(team.sport, team.appearance.lineColor);
  const isCircle = kit.shape === 'circle';
  const shapeStyle = isCircle ? 'clip-path:none;border-radius:50%;aspect-ratio:1;' : '';
  const grassPattern = team.appearance.grassPattern || 'lines';
  return `<div class="mini-pitch pat-${grassPattern}${team.sport === 'futsal' ? ' sport-futsal' : ''}" style="--grass-a:${grassA};--grass-b:${grassB};--line-svg:${lineSvg}">${record.starters
    .map((id, index) => {
      const pos = id ? record.positions?.[id] || positions[index] : record.slotPositions?.[index] || positions[index];
      const player = id ? (team.squad || []).find((entry) => entry.id === id) : null;
      const numberText = player && player.number != null ? esc(String(player.number)) : '';
      const useKit = index === 0 ? gkKit : kit;
      const isSleeves = useKit.pattern === 'sleeves';
      const kitClass = isSleeves ? ` mini-kit-sleeves${isCircle ? ' mini-kit-circle' : ''}` : '';
      const backgroundStyle = isSleeves
        ? `--kit-a:${useKit.primary};--kit-b:${useKit.secondary};background:var(--kit-a)`
        : `background:${miniKitBackground(useKit)}`;
      return `<i class="mini-player${kitClass}" style="left:${pos.x}%;top:${pos.y}%;${backgroundStyle};color:${useKit.numberColor || '#fff'};${shapeStyle}">${numberText}</i>`;
    })
    .join('')}</div>`;
}
function positionsForRecord(record) {
  const pc = record.playerCount || 11;
  return computePositions(record.formation || FORMATIONS[pc][0][0], pc);
}
function startNewLineupForTeam(teamId) {
  /* "Neue Aufstellung" tile in the archive: switches to that team, starts a fresh blank draft
     (same shape as a brand-new team's draft) and jumps straight into the lineup editor for it -
     mirrors loadLineup()'s team-switch/view-switch pattern but with a blank draft instead of a saved one. */
  const team = app.teams.find((entry) => entry.id === teamId);
  if (!team) return;
  if (!teamPerms(team).lineups) {
    showToast(t('toastNoPermission'), 'error');
    return;
  }
  app.activeTeamId = team.id;
  team.draft = initialDraft(team.draft.playerCount);
  selectedSlot = { type: 'starter', index: 0 };
  setView('lineup');
  renderAll();
  renderPlayerProfile(null, 0);
}
const LOCALE_MAP = {
  de: 'de-DE',
  en: 'en-GB',
  es: 'es-ES',
  fr: 'fr-FR',
  it: 'it-IT',
  pt: 'pt-PT',
  tr: 'tr-TR',
  nl: 'nl-NL',
};
function formatLineupTimestamp(ms) {
  if (!ms) return '';
  try {
    return new Date(ms).toLocaleString(LOCALE_MAP[app.lang] || 'de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (_) {
    return '';
  }
}
const ARCHIVE_LINEUPS_PER_ROW = 5; /* Grid has 6 columns (see .lineup-archive), but the "Neue Aufstellung"
  tile always occupies the first slot, so a full row only fits 5 saved lineups alongside it. */
function renderArchive() {
  const container = byId('teamArchive');
  container.replaceChildren();
  byId('archiveNavCount').textContent = app.teams.length;
  const sortedTeams = [...app.teams].sort((a, b) =>
    a.name.localeCompare(b.name, LOCALE_MAP[app.lang] || 'de-DE', { sensitivity: 'base' }),
  );
  sortedTeams.forEach((team) => {
    const perms = teamPerms(team);
    const record = document.createElement('article');
    record.className = 'team-record';
    const lineups = team.lineups || [];
    const expanded = expandedArchiveTeams.has(team.id);
    const visibleLineups = expanded ? lineups : lineups.slice(0, ARCHIVE_LINEUPS_PER_ROW);
    const hasMore = lineups.length > ARCHIVE_LINEUPS_PER_ROW;
    const newLineupTile = perms.lineups
      ? `<button type="button" class="archive-lineup archive-lineup-new" data-new-lineup="1"><span class="archive-lineup-new-icon">+</span><strong>${esc(t('newLineup'))}</strong></button>`
      : '';
    const shareBadge = team.sharedId
      ? `<span class="share-badge" title="${esc(t('sharedTeamHint'))}">👥 ${esc(t(ROLE_LABEL_KEY[team.myRole] || 'roleViewer'))}</span>`
      : '';
    const teamActions = perms.manage
      ? `<button class="archive-button share-team">${t('shareTeam')}</button><button class="archive-button edit-team">${t('editTeam')}</button><button class="archive-button danger delete-team">${t('deleteTeam')}</button>`
      : (perms.squad ? `<button class="archive-button edit-team">${t('editTeam')}</button>` : '') +
        (team.sharedId && team.myRole !== 'owner'
          ? `<button class="archive-button danger leave-team">${t('leaveTeam')}</button>`
          : '');
    record.innerHTML = `<div class="team-record-head"><span class="archive-crest" style="background:${team.appearance.accent}">${team.crest ? `<img src="${team.crest}" alt="">` : esc(initials(team.name))}</span><span><strong>${esc(team.name)}</strong>${shareBadge}<small>${team.squad.length} ${t('playersLabel')} · ${lineups.length} ${t('lineupsLabel')}</small></span><span class="team-record-actions">${teamActions}</span></div><div class="lineup-archive">${newLineupTile}${visibleLineups.length ? visibleLineups.map((lineup) => `<article class="archive-lineup" data-lineup="${lineup.id}">${perms.lineups ? `<div class="archive-lineup-actions"><button class="edit-lineup" title="${t('editLineupTitle')}">✎</button><button class="duplicate-lineup" title="${t('duplicateLineupTitle')}">⧉</button><button class="delete-lineup" title="${t('deleteLineupTitle')}">✕</button></div>` : ''}<strong>${esc(lineup.lineupName)}</strong><small>${formationLabel(lineup.formation, lineup.playerCount)} · ${lineup.starters.filter(Boolean).length}/${lineup.playerCount}</small><small class="archive-lineup-date">${esc(formatLineupTimestamp(lineup.savedAt))}</small>${miniPitch(lineup, team)}</article>`).join('') : newLineupTile ? `<p class="archive-empty">${t('noLineupSaved')}</p>` : ''}</div>${hasMore ? `<button class="show-more-lineups" type="button">${expanded ? t('showLess') : `${t('showMore')} (${lineups.length - ARCHIVE_LINEUPS_PER_ROW})`}</button>` : ''}`;
    record.querySelector('.edit-team')?.addEventListener('click', () => openEditTeamDialog(team.id));
    record.querySelector('.delete-team')?.addEventListener('click', () => deleteTeam(team.id));
    record.querySelector('.share-team')?.addEventListener('click', () => openShareDialog(team.id));
    record.querySelector('.leave-team')?.addEventListener('click', () => leaveTeam(team.id));
    record.querySelector('.archive-lineup-new')?.addEventListener('click', () => startNewLineupForTeam(team.id));
    record.querySelectorAll('.archive-lineup[data-lineup]').forEach((card) => {
      const lineup = lineups.find((entry) => entry.id === card.dataset.lineup);
      card.addEventListener('click', () => loadLineup(team.id, lineup.id));
      card.querySelector('.edit-lineup')?.addEventListener('click', (event) => {
        event.stopPropagation();
        loadLineup(team.id, lineup.id);
      });
      card.querySelector('.duplicate-lineup')?.addEventListener('click', (event) => {
        event.stopPropagation();
        duplicateLineup(team.id, lineup.id);
      });
      card.querySelector('.delete-lineup')?.addEventListener('click', (event) => {
        event.stopPropagation();
        deleteLineup(team.id, lineup.id);
      });
    });
    const moreButton = record.querySelector('.show-more-lineups');
    if (moreButton)
      moreButton.addEventListener('click', () => {
        if (expanded) expandedArchiveTeams.delete(team.id);
        else expandedArchiveTeams.add(team.id);
        renderArchive();
      });
    container.append(record);
  });
}
function updateHighlights() {
  document
    .querySelectorAll('[data-slot-type]')
    .forEach((element) =>
      element.classList.toggle(
        'selected',
        element.dataset.slotType === selectedSlot.type && Number(element.dataset.slotIndex) === selectedSlot.index,
      ),
    );
  byId('editCoach').classList.toggle('selected', profileMode === 'coach');
}
function renderAll(continuousKey) {
  applyStaticTranslations();
  renderAppearance();
  renderKit();
  renderDesignPreview();
  renderTeam();
  renderFormations();
  renderPitch();
  renderBench();
  updateHighlights();
  renderSelection();
  renderRoster();
  renderArchive();
  applyPermissionLocks();
  save(continuousKey);
}

/* ============================================================
   AKTIONEN: Spieler zuweisen/entfernen/verschieben, Formationen anwenden
   ============================================================ */
function selectSlot(type, index) {
  selectedSlot = { type, index };
  profileMode = 'player';
  updateHighlights();
  renderSelection();
}
function clearPlayer(id) {
  const d = draft();
  /* Before removing the player from a starter slot, remember the exact spot they were standing on
     as that slot's "remembered" position. Otherwise, once the slot is empty, whoever gets placed
     there next (via swap, drag & drop, or the assign list) falls back to the base formation's
     generic default coordinate for that index, making the player visibly land in a slightly
     different spot than the one that was just vacated. */
  if (d.formation === 'custom') {
    const starterIndex = d.starters.indexOf(id);
    if (starterIndex !== -1 && d.positions[id]) d.slotPositions[starterIndex] = { ...d.positions[id] };
  }
  d.starters = d.starters.map((entry) => (entry === id ? null : entry));
  d.bench = d.bench.map((entry) => (entry === id ? null : entry));
  if (d.captainId === id) d.captainId = null;
  delete d.positions[id];
}
function unassignPlayer(id) {
  const d = draft(),
    wasShown = (selectedSlot.type === 'starter' ? d.starters : d.bench)[selectedSlot.index] === id;
  clearPlayer(id);
  renderAll();
  if (wasShown) renderPlayerProfile(null, selectedSlot.index);
}
function makeUnassignTarget(element) {
  element.addEventListener('dragover', (event) => {
    event.preventDefault();
    element.classList.add('drag-over');
  });
  element.addEventListener('dragleave', () => element.classList.remove('drag-over'));
  element.addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();
    element.classList.remove('drag-over');
    const id = event.dataTransfer.getData('application/x-lineup-player');
    if (id) unassignPlayer(id);
  });
}
// Begrenzt die Spielerzahl eines (nicht zwingend aktiven) Aufstellungsentwurfs auf maxCount - u. a.
// beim Umstellen einer Mannschaft auf Kleinfeldfußball (siehe saveEditTeam), wenn deren aktueller
// Entwurf mit einer dort nicht mehr wählbaren Spielerzahl (10/11) angelegt wurde. Bewusst schlanker
// als changePlayerCount() (kein renderAll()/Toast), da hier auch eine gerade NICHT aktive Mannschaft
// betroffen sein kann (Bearbeiten-Button in der Archiv-Liste).
function clampDraftPlayerCount(targetDraft, maxCount) {
  if (targetDraft.playerCount <= maxCount) return;
  const former = targetDraft.starters;
  targetDraft.playerCount = maxCount;
  targetDraft.starters = Array.from({ length: maxCount }, (_, i) => former[i] || null);
  targetDraft.positions = {};
  targetDraft.slotPositions = {};
  if (!FORMATIONS[maxCount].some(([id]) => id === targetDraft.formation)) targetDraft.formation = 'custom';
  targetDraft.previousFormation = FORMATIONS[maxCount][0][0];
}
function applyFormation() {
  const d = draft();
  if (d.formation === 'custom') return;
  const positions = positionsFor(d.formation);
  d.positions = {};
  d.slotPositions = {};
  d.starters.forEach((id, index) => {
    if (id) d.positions[id] = { ...positions[index] };
  });
  renderAll();
  showToast(t('toastFormationApplied'));
}
function changePlayerCount(value) {
  const d = draft(),
    count = Number(value),
    former = d.starters;
  d.playerCount = count;
  d.starters = Array.from({ length: count }, (_, i) => former[i] || null);
  if (selectedSlot.type === 'starter' && selectedSlot.index >= count) selectedSlot = { type: 'starter', index: 0 };
  if (!FORMATIONS[count].some(([id]) => id === d.formation)) d.formation = FORMATIONS[count][0][0];
  if (d.formation !== 'custom') d.previousFormation = d.formation;
  applyFormation();
}
function beginMove(event, index) {
  if (event.button !== undefined && event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  const d = draft(),
    id = d.starters[index];
  // Allow moving even if slot is empty (placeholder gets its own slot-based position)
  selectedSlot = { type: 'starter', index };
  updateHighlights();
  renderSelection();
  const token = event.currentTarget;
  drag = { id, index, token, move: onMove };
  token.classList.add('dragging');
  token.setPointerCapture(event.pointerId);
  token.addEventListener('pointermove', drag.move);
  token.addEventListener('pointerup', endMove, { once: true });
  token.addEventListener('pointercancel', endMove, { once: true });
}
function onMove(event) {
  if (!drag) return;
  document
    .querySelectorAll('.bench-slot.drag-over,#selectionCard.drag-over,.available-player.drag-over')
    .forEach((el) => el.classList.remove('drag-over'));
  const hoverEl = document.elementFromPoint(event.clientX, event.clientY);
  const benchSlot = hoverEl?.closest('.bench-slot');
  const availableRow = hoverEl?.closest('.available-player');
  const dropZone = hoverEl?.closest('#selectionCard');
  if (benchSlot) {
    benchSlot.classList.add('drag-over');
    drag.dropTarget = { type: 'bench', index: Number(benchSlot.dataset.slotIndex) };
    return;
  }
  if (availableRow && availableRow.dataset.playerId) {
    availableRow.classList.add('drag-over');
    drag.dropTarget = { type: 'assign', id: availableRow.dataset.playerId };
    return;
  }
  if (dropZone) {
    dropZone.classList.add('drag-over');
    drag.dropTarget = { type: 'available' };
    return;
  }
  drag.dropTarget = null;
  const d = draft(),
    rect = byId('pitch').getBoundingClientRect();
  let x = Math.min(93, Math.max(7, ((event.clientX - rect.left) / rect.width) * 100)),
    y = Math.min(92, Math.max(8, ((event.clientY - rect.top) / rect.height) * 100));
  if (d.gridEnabled) {
    const size = d.gridSize || 5;
    x = Math.min(93, Math.max(7, Math.round(x / size) * size));
    y = Math.min(92, Math.max(8, Math.round(y / size) * size));
  }
  const pos = { x: +x.toFixed(1), y: +y.toFixed(1) };
  if (drag.id) d.positions[drag.id] = pos;
  else d.slotPositions[drag.index] = pos;
  drag.token.style.left = `${x}%`;
  drag.token.style.top = `${y}%`;
}
function endMove(event) {
  if (!drag) return;
  drag.token.removeEventListener('pointermove', drag.move);
  drag.token.classList.remove('dragging');
  try {
    drag.token.releasePointerCapture(event.pointerId);
  } catch (_) {}
  document
    .querySelectorAll('.bench-slot.drag-over,#selectionCard.drag-over,.available-player.drag-over')
    .forEach((el) => el.classList.remove('drag-over'));
  const { id, dropTarget } = drag;
  drag = null;
  if (dropTarget?.type === 'bench') {
    if (id) assignPlayer(id, 'bench', dropTarget.index);
  } else if (dropTarget?.type === 'assign') {
    if (id) dropOnAvailablePlayer(id, dropTarget.id);
  } else if (dropTarget?.type === 'available') {
    if (id) unassignPlayer(id);
  } else {
    save();
  }
}

/* ============================================================
   DIALOGE: Spieler, Trainer & Team anlegen/bearbeiten
   ============================================================ */
function openPlayerDialog(player = null) {
  if (!requirePerm('squad')) return;
  playerImageRemoved = false;
  byId('playerForm').reset();
  byId('editingPlayerId').value = player?.id || '';
  byId('playerDialogEyebrow').textContent = player ? t('editPlayerEyebrow') : t('addPlayerEyebrow');
  byId('playerDialogTitle').textContent = player ? player.name : t('addPlayerTitle');
  byId('newPlayerName').value = player?.name || '';
  byId('newPlayerNumber').value = player?.number ?? '';
  byId('newPlayerYear').value = player?.year ?? '';
  byId('newPlayerNotes').value = player?.notes || '';
  const selected = new Set(playerPositions(player));
  document.querySelectorAll('#playerPositionGroup input[type="checkbox"]').forEach((input) => {
    input.checked = selected.has(input.value);
  });
  byId('removePlayerImage').classList.toggle('hidden', !player?.photo);
  byId('playerImagePreview').innerHTML = playerVisual(player, activeTeam());
  byId('playerDialog').showModal();
}
const readFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
/* Erlaubt Drag & Drop einer Bilddatei direkt auf ein file-label (Spielerbild, Trainerbild, Wappen):
   die gedroppte Datei wird ins zugehörige <input type="file"> übernommen und ein 'change'-Event
   ausgelöst, damit die bestehende Upload-/Vorschau-Logik unverändert weiterläuft. */
function makeImageDropTarget(labelId, inputId, previewId) {
  const label = byId(labelId),
    input = byId(inputId);
  if (!label || !input) return;
  const targets = [label];
  const preview = previewId ? byId(previewId) : null;
  if (preview) targets.push(preview);
  targets.forEach((target) => {
    target.addEventListener('dragover', (event) => {
      event.preventDefault();
      target.classList.add('drag-over');
    });
    target.addEventListener('dragleave', () => target.classList.remove('drag-over'));
    target.addEventListener('drop', (event) => {
      event.preventDefault();
      target.classList.remove('drag-over');
      const file = event.dataTransfer.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
}
function deletePlayer() {
  if (!requirePerm('squad')) return;
  const team = activeTeam(),
    id = byId('editingPlayerId').value,
    player = team.squad.find((entry) => entry.id === id);
  if (!player || !confirm(`${player.name} ${t('confirmDeletePlayer')}`)) return;
  const wasShown = (selectedSlot.type === 'starter' ? draft().starters : draft().bench)[selectedSlot.index] === id;
  team.squad = team.squad.filter((entry) => entry.id !== id);
  clearPlayer(id);
  byId('playerDialog').close();
  renderAll();
  if (wasShown) renderPlayerProfile(null, selectedSlot.index);
  showToast(t('toastPlayerDeleted'));
}
function openCoachDialog() {
  coachImageRemoved = false;
  const coach = activeTeam().coach;
  byId('coachForm').reset();
  byId('coachName').value = coach.name || '';
  byId('removeCoachImage').classList.toggle('hidden', !coach.photo);
  byId('coachImagePreview').innerHTML = coach.photo
    ? `<img src="${coach.photo}" alt="${esc(coach.name || t('trainerFallback'))}">`
    : `<span class="jersey ${kitClass(activeTeam())}">${t('coachAbbr')}</span>`;
  byId('coachDialog').showModal();
}
async function saveCoach(event) {
  event.preventDefault();
  const team = activeTeam(),
    file = byId('coachImageUpload').files?.[0];
  team.coach = {
    name: byId('coachName').value.trim(),
    photo: file ? await readFile(file) : coachImageRemoved ? '' : team.coach.photo || '',
  };
  byId('coachDialog').close();
  renderAll();
  if (profileMode === 'coach') renderCoachProfile();
}
async function createTeam(event) {
  event.preventDefault();
  const name = byId('newTeamName').value.trim();
  if (!name) return;
  const file = byId('newTeamCrest').files?.[0],
    team = blankTeam(name),
    sport = byId('newTeamSport').value === 'futsal' ? 'futsal' : 'football';
  team.ownerUid = firebaseUser?.uid || null;
  team.sport = sport;
  // Kleinfeldfußball startet direkt mit einer kleinfeld-typischen Spielerzahl statt der
  // 11-a-side-Vorbelegung aus blankTeam()/initialDraft() - siehe FUTSAL_DEFAULT_PLAYER_COUNT.
  if (sport === 'futsal') team.draft = initialDraft(FUTSAL_DEFAULT_PLAYER_COUNT);
  team.kit.primary = byId('newTeamKitPrimary').value;
  team.kit.secondary = byId('newTeamKitSecondary').value;
  team.kit.numberColor = byId('newTeamKitNumberColor').value;
  team.appearance.grass = byId('newTeamGrassColor').value;
  team.appearance.accent = byId('newTeamAccentColor').value;
  if (file) team.crest = await readFile(file);
  app.teams.push(team);
  app.activeTeamId = team.id;
  byId('teamDialog').close();
  setView('lineup');
  renderAll();
  showToast(t('toastTeamCreated'));
}
function deleteTeam(id) {
  const team = app.teams.find((entry) => entry.id === id);
  if (!team) return;
  if (!teamPerms(team).manage) {
    showToast(t('toastNoPermission'), 'error');
    return;
  }
  if (!confirm(`${team.name} ${t('confirmDeleteTeam1')}`)) return;
  if (app.teams.length === 1) {
    showToast(t('toastAtLeastOneTeam'), 'error');
    return;
  }
  if (team.sharedId) {
    const sharedId = team.sharedId;
    sharedTeamUnsubs.get(sharedId)?.();
    sharedTeamUnsubs.delete(sharedId);
    window.lineupAuth
      ?.deleteSharedTeamCompletely(sharedId)
      .catch((err) => console.error('Geteilte Mannschaft konnte nicht gelöscht werden:', err));
  }
  app.teams = app.teams.filter((entry) => entry.id !== id);
  if (app.activeTeamId === id) app.activeTeamId = app.teams[0].id;
  renderAll();
}
// Verlässt eine geteilte Mannschaft, in der man nur Mitglied (nicht Besitzer) ist.
function leaveTeam(id) {
  const team = app.teams.find((entry) => entry.id === id);
  if (!team || !team.sharedId || team.myRole === 'owner') return;
  if (!confirm(`${team.name}: ${t('confirmLeaveTeam')}`)) return;
  const sharedId = team.sharedId;
  sharedTeamUnsubs.get(sharedId)?.();
  sharedTeamUnsubs.delete(sharedId);
  window.lineupAuth
    ?.leaveSharedTeam(sharedId)
    .catch((err) => console.error('Mannschaft konnte nicht verlassen werden:', err));
  app.teams = app.teams.filter((entry) => entry.id !== id);
  if (!app.teams.length) app.teams.push(blankTeam());
  if (app.activeTeamId === id) app.activeTeamId = app.teams[0].id;
  renderAll();
}
function crestPreviewMarkup(kit, crest, name) {
  return crest
    ? `<img src="${crest}" alt="${esc(name)} ${t('crestAlt')}">`
    : `<span class="jersey kit-${kit.pattern || 'plain'}" style="--kit-a:${kit.primary};--kit-b:${kit.secondary};--number:${kit.numberColor}">${esc(initials(name))}</span>`;
}
function renderEditTeamCrestPreview(team) {
  byId('editTeamCrestPreview').innerHTML = crestPreviewMarkup(team.kit, team.crest, team.name);
}
function renderNewTeamCrestPreview() {
  const kit = {
    pattern: blankTeam().kit.pattern,
    primary: byId('newTeamKitPrimary').value,
    secondary: byId('newTeamKitSecondary').value,
    numberColor: byId('newTeamKitNumberColor').value,
  };
  byId('newTeamCrestPreview').innerHTML = crestPreviewMarkup(kit, '', byId('newTeamName').value);
}
function openEditTeamDialog(teamId) {
  const team = app.teams.find((entry) => entry.id === teamId);
  if (!team) return;
  if (!teamPerms(team).squad) {
    showToast(t('toastNoPermission'), 'error');
    return;
  }
  editTeamCrestRemoved = false;
  byId('editTeamForm').reset();
  byId('editingTeamId').value = team.id;
  byId('editTeamName').value = team.name;
  byId('editTeamSport').value = team.sport === 'futsal' ? 'futsal' : 'football';
  byId('editTeamKitPrimary').value = team.kit.primary;
  byId('editTeamKitSecondary').value = team.kit.secondary;
  byId('editTeamKitNumberColor').value = team.kit.numberColor;
  byId('editTeamGrassColor').value = team.appearance.grass;
  byId('editTeamAccentColor').value = team.appearance.accent;
  byId('removeEditTeamCrest').classList.toggle('hidden', !team.crest);
  renderEditTeamCrestPreview(team);
  byId('editTeamDialog').showModal();
}
async function saveEditTeam(event) {
  event.preventDefault();
  const team = app.teams.find((entry) => entry.id === byId('editingTeamId').value);
  if (!team) return;
  if (!teamPerms(team).squad) {
    showToast(t('toastNoPermission'), 'error');
    return;
  }
  const file = byId('editTeamCrestUpload').files?.[0];
  team.name = byId('editTeamName').value.trim() || 'Mein Team';
  team.sport = byId('editTeamSport').value === 'futsal' ? 'futsal' : 'football';
  // Beim Umstellen auf Kleinfeldfußball eine zu hohe Spielerzahl (10/11, dort nicht wählbar) auf die
  // Kleinfeld-Höchstzahl begrenzen - ansonsten bliebe der aktuelle Entwurf z. B. bei 11 Spielern
  // hängen, obwohl das Spielerzahl-Menü fortan nur noch bis 9 anzeigt (siehe renderFormations).
  if (team.sport === 'futsal') clampDraftPlayerCount(team.draft, FUTSAL_PLAYER_COUNTS[FUTSAL_PLAYER_COUNTS.length - 1]);
  if (file) team.crest = await readFile(file);
  else if (editTeamCrestRemoved) team.crest = '';
  team.appearance.grass = byId('editTeamGrassColor').value;
  team.appearance.accent = byId('editTeamAccentColor').value;
  byId('editTeamDialog').close();
  renderAll();
  showToast(t('toastTeamUpdated'));
}
/* ============================================================
   AUFSTELLUNGEN: Speichern / Leeren / Laden / Löschen
   ============================================================ */
// Spieltag-Eingaben (Gegner, Ort, Datum, ...) ändern bisher nur den aktuell aktiven Arbeitsentwurf
// (team.draft). Der im Archiv gespeicherte Datensatz (team.lineups) ist davon unabhängig und bleibt
// auf dem Stand von der letzten "Aufstellung speichern"-Aktion stehen. Öffnet man die Aufstellung
// danach erneut über "Mannschaften" (loadLineup), werden die zwischenzeitlich eingegebenen
// Spieltag-Infos durch die veralteten Daten aus dem Datensatz überschrieben und wirken "nicht
// gespeichert". Deshalb hier bei jeder Spieltag-Änderung den bereits gespeicherten Datensatz (falls
// vorhanden) synchron mitpflegen.
function syncMatchdayToSavedLineup() {
  const d = draft();
  if (!d.editingLineupId) return;
  const lineup = activeTeam().lineups.find((entry) => entry.id === d.editingLineupId);
  if (lineup) lineup.matchday = { ...d.matchday };
}
function saveLineup() {
  if (!requirePerm('lineups')) return;
  const team = activeTeam(),
    d = draft(),
    draftData = clone(d);
  delete draftData.id;
  delete draftData.savedAt;
  delete draftData.kit;
  delete draftData.gkKit;
  delete draftData.editingLineupId;
  delete draftData.offlineForkId;
  const existing = d.editingLineupId ? team.lineups.find((lineup) => lineup.id === d.editingLineupId) : null;
  // Offline nie eine bereits gespeicherte (und damit potenziell schon synchronisierte) Aufstellung
  // direkt überschreiben: Auf einem anderen Gerät - oder von einem Mitspieler bei einer geteilten
  // Mannschaft - könnte sich zwischenzeitlich eine andere Version in der Cloud befinden. Stattdessen
  // wird die Änderung als NEUE Aufstellung abgelegt, die beim nächsten "online"-Event ganz normal
  // (als zusätzliche, eigenständige Aufstellung) mitsynchronisiert wird, ohne etwas zu überschreiben.
  // Mehrfaches Speichern in derselben Offline-Sitzung landet dabei immer in derselben Offline-Kopie
  // (d.offlineForkId), statt bei jedem Klick auf "Speichern" eine weitere neue Kopie zu erzeugen.
  const offlineFork = existing && !isOnline;
  const offlineForkExisting = offlineFork && d.offlineForkId ? team.lineups.find((l) => l.id === d.offlineForkId) : null;
  let didCreateOfflineFork = false;
  if (offlineForkExisting) {
    Object.assign(offlineForkExisting, draftData, {
      kit: clone(team.kit),
      gkKit: clone(team.gkKit),
      savedAt: Date.now(),
    });
  } else if (existing && !offlineFork) {
    Object.assign(existing, draftData, { kit: clone(team.kit), gkKit: clone(team.gkKit), savedAt: Date.now() });
  } else {
    const record = {
      ...draftData,
      id: uid('lineup'),
      kit: clone(team.kit),
      gkKit: clone(team.gkKit),
      savedAt: Date.now(),
    };
    if (offlineFork) {
      record.lineupName = `${record.lineupName} (${t('offlineSuffix')})`;
      didCreateOfflineFork = true;
    }
    team.lineups.push(record);
    d.editingLineupId = record.id;
    if (offlineFork) d.offlineForkId = record.id;
  }
  renderAll();
  showToast(didCreateOfflineFork ? t('toastLineupSavedOffline') : existing ? t('toastLineupUpdated') : t('toastLineupSaved'));
  lineupSaveStatusAt = Date.now();
  updateLineupSaveStatus();
  if (!lineupSaveStatusTimer) lineupSaveStatusTimer = setInterval(updateLineupSaveStatus, 1000);
}
let lineupSaveStatusAt = null,
  lineupSaveStatusTimer = null;
function updateLineupSaveStatus() {
  const el = byId('lineupSaveStatus');
  if (!el) return;
  if (!lineupSaveStatusAt) {
    el.textContent = '';
    return;
  }
  const seconds = Math.max(0, Math.round((Date.now() - lineupSaveStatusAt) / 1000));
  let rtf;
  try {
    rtf = new Intl.RelativeTimeFormat(LOCALE_MAP[app.lang] || 'de-DE', { numeric: 'auto' });
  } catch (_) {
    el.textContent = '';
    return;
  }
  let text;
  if (seconds < 60) text = rtf.format(-seconds, 'second');
  else if (seconds < 3600) text = rtf.format(-Math.round(seconds / 60), 'minute');
  else if (seconds < 86400) text = rtf.format(-Math.round(seconds / 3600), 'hour');
  else text = rtf.format(-Math.round(seconds / 86400), 'day');
  el.textContent = text.charAt(0).toUpperCase() + text.slice(1);
}
function clearLineup() {
  if (!requirePerm('lineups')) return;
  const d = draft(),
    defaultFormation = FORMATIONS[d.playerCount][0][0];
  // Bisher tat "Aufstellung leeren" nichts, sobald keine Spieler zugewiesen waren (nur die Fehlermeldung
  // "bereits leer") - auch wenn noch eine andere Formation als die Standardformation gewählt war. Jetzt
  // setzt der Button in diesem Fall stattdessen die Formation zurück, statt gar nichts zu tun.
  const hasPlayers = assigned().length > 0;
  const hasFormationChange = d.formation !== defaultFormation || d.previousFormation !== defaultFormation;
  if (!hasPlayers && !hasFormationChange) {
    showToast(t('toastLineupEmptyAlready'), 'error');
    return;
  }
  if (!confirm(t('confirmClearLineup'))) return;
  d.starters = d.starters.map(() => null);
  d.bench = d.bench.map(() => null);
  d.positions = {};
  d.slotPositions = {};
  d.captainId = null;
  d.formation = defaultFormation;
  d.previousFormation = defaultFormation;
  selectedSlot = { type: 'starter', index: 0 };
  renderAll();
  renderPlayerProfile(null, 0);
  showToast(t('toastLineupCleared'));
}
function loadLineup(teamId, lineupId) {
  const team = app.teams.find((entry) => entry.id === teamId),
    lineup = team?.lineups.find((entry) => entry.id === lineupId);
  if (!team || !lineup) return;
  app.activeTeamId = team.id;
  const { id, savedAt, kit, gkKit, ...lineupData } = clone(lineup);
  /* Restore the kit that was actually saved with this lineup (if any) onto the team, so opening an
     older archived lineup shows the jersey it was saved with instead of the team's current/latest kit.
     Kit is otherwise a team-level (not lineup-level) setting, so this intentionally becomes the new
     "current" kit for the team going forward too, matching what the archive preview/PNG already show. */
  if (kit) team.kit = { ...team.kit, ...kit };
  if (gkKit) team.gkKit = { ...team.gkKit, ...gkKit };
  team.draft = {
    ...initialDraft(lineup.playerCount),
    ...lineupData,
    starters: Array.from({ length: lineup.playerCount }, (_, i) => lineup.starters[i] || null),
    bench: Array.from({ length: 12 }, (_, i) => lineup.bench[i] || null),
    editingLineupId: lineup.id,
  };
  selectedSlot = { type: 'starter', index: 0 };
  setView('lineup');
  renderAll();
  showToast(t('toastLineupLoaded'));
}
function duplicateLineup(teamId, lineupId) {
  const team = app.teams.find((entry) => entry.id === teamId),
    lineup = team?.lineups.find((entry) => entry.id === lineupId);
  if (!team || !lineup) return;
  if (!teamPerms(team).lineups) {
    showToast(t('toastNoPermission'), 'error');
    return;
  }
  const copy = clone(lineup);
  copy.id = uid('lineup');
  copy.savedAt = Date.now();
  copy.lineupName = `${lineup.lineupName} (${t('copySuffix')})`;
  team.lineups.push(copy);
  renderAll();
  showToast(t('toastLineupDuplicated'));
}
function deleteLineup(teamId, lineupId) {
  const team = app.teams.find((entry) => entry.id === teamId);
  if (!team) return;
  if (!teamPerms(team).lineups) {
    showToast(t('toastNoPermission'), 'error');
    return;
  }
  team.lineups = team.lineups.filter((lineup) => lineup.id !== lineupId);
  renderAll();
  showToast(t('toastLineupDeleted'));
}

/* ============================================================
   MANNSCHAFT TEILEN (Einladungen, Mitglieder, Live-Sync)
   ============================================================ */
const ROLE_LABEL_KEY = { owner: 'roleOwner', full: 'roleFull', lineups: 'roleLineups', viewer: 'roleViewer' };
// Hängt einen Live-Listener an eine geteilte Mannschaft: läuft dauerhaft, solange man Mitglied ist,
// und übernimmt jede Änderung (auch von anderen Mitgliedern) automatisch in app.teams.
function attachSharedTeamListener(teamId, role) {
  if (sharedTeamUnsubs.has(teamId)) return;
  const unsub = window.lineupAuth.listenSharedTeam(teamId, (remote) => {
    if (remote === undefined) {
      // Verbindungsfehler (z. B. offline): zuletzt bekannten Stand dieser Mannschaft unverändert
      // lassen statt sie fälschlich zu entfernen - siehe listenSharedTeam in firebase-init.js. Der
      // Live-Listener meldet sich automatisch wieder, sobald die Verbindung zurückkehrt.
      return;
    }
    if (!remote || !remote.data) {
      // Dokument existiert nicht mehr oder kein Zugriff mehr (z. B. aus der Mannschaft entfernt).
      app.teams = app.teams.filter((entry) => entry.sharedId !== teamId);
      sharedTeamUnsubs.get(teamId)?.();
      sharedTeamUnsubs.delete(teamId);
      if (!app.teams.some((entry) => entry.id === app.activeTeamId)) app.activeTeamId = app.teams[0]?.id || null;
      if (!app.teams.length) app.teams.push(blankTeam());
      renderAll();
      return;
    }
    const incoming = normalizeTeam({ ...remote.data, sharedId: teamId, ownerUid: remote.ownerUid, myRole: role });
    const idx = app.teams.findIndex((entry) => entry.sharedId === teamId || entry.id === incoming.id);
    if (idx === -1) {
      app.teams.push(incoming);
      if (!app.activeTeamId) app.activeTeamId = incoming.id;
    } else app.teams[idx] = incoming;
    renderAll();
  });
  sharedTeamUnsubs.set(teamId, unsub);
}
// Wird nach dem Login (und nach dem Annehmen einer Einladung) aufgerufen: findet alle Mannschaften,
// in denen man Mitglied ist, und hängt für jede einen Live-Listener an (siehe oben).
async function syncSharedTeams() {
  if (!firebaseUser || !window.lineupAuth) return;
  try {
    const memberships = await window.lineupAuth.listMyMemberships();
    memberships.forEach(({ teamId, role }) => attachSharedTeamListener(teamId, role));
  } catch (err) {
    console.error('Geteilte Mannschaften konnten nicht geladen werden:', err);
  }
}
async function refreshMyInvites() {
  if (!firebaseUser || !window.lineupAuth) {
    myInvites = [];
    renderInvitesBadge();
    return;
  }
  try {
    myInvites = await window.lineupAuth.listMyInvites();
  } catch (err) {
    console.error('Einladungen konnten nicht geladen werden:', err);
    myInvites = [];
  }
  renderInvitesBadge();
}
function renderInvitesBadge() {
  const badge = byId('invitesBadge');
  if (!badge) return;
  badge.textContent = myInvites.length;
  badge.classList.toggle('hidden', !myInvites.length);
}
function renderInvitesDialog() {
  const list = byId('invitesList');
  if (!list) return;
  list.replaceChildren();
  if (!myInvites.length) {
    list.innerHTML = `<p class="archive-empty">${t('noInvites')}</p>`;
    return;
  }
  myInvites.forEach((invite) => {
    const row = document.createElement('div');
    row.className = 'invite-row';
    row.innerHTML = `<span><strong>${esc(invite.teamName || '')}</strong><small>${esc(invite.invitedByEmail || '')} · ${t(ROLE_LABEL_KEY[invite.role] || 'roleViewer')}</small></span><span class="invite-row-actions"><button class="secondary-button small-button decline-invite">${t('declineInvite')}</button><button class="primary-button small-button accept-invite">${t('acceptInvite')}</button></span>`;
    row.querySelector('.accept-invite').addEventListener('click', async () => {
      try {
        await window.lineupAuth.acceptInvite(invite);
        attachSharedTeamListener(invite.teamId, invite.role);
        myInvites = myInvites.filter((entry) => entry.id !== invite.id);
        renderInvitesBadge();
        renderInvitesDialog();
        showToast(t('toastInviteAccepted'));
      } catch (err) {
        console.error('Einladung konnte nicht angenommen werden:', err);
        showToast(t('toastCloudSyncFailed'), 'error');
      }
    });
    row.querySelector('.decline-invite').addEventListener('click', async () => {
      try {
        await window.lineupAuth.declineInvite(invite.id);
        myInvites = myInvites.filter((entry) => entry.id !== invite.id);
        renderInvitesBadge();
        renderInvitesDialog();
      } catch (err) {
        console.error('Einladung konnte nicht abgelehnt werden:', err);
        showToast(t('toastCloudSyncFailed'), 'error');
      }
    });
    list.append(row);
  });
}
// Wandelt eine bisher lokale Mannschaft (falls nötig) in eine geteilte Mannschaft um und öffnet
// danach den "Teilen"-Dialog mit Einladungsformular + Mitgliederliste.
async function openShareDialog(teamId) {
  const team = app.teams.find((entry) => entry.id === teamId);
  if (!team) return;
  if (!firebaseUser || !window.lineupAuth) {
    showToast(t('toastAuthLoading'), 'error');
    return;
  }
  if (!teamPerms(team).manage) {
    showToast(t('toastNoPermission'), 'error');
    return;
  }
  byId('shareTeamId').value = team.id;
  byId('shareTeamDialogName').textContent = team.name;
  byId('shareInviteEmail').value = '';
  if (!team.sharedId) {
    try {
      const payload = teamCloudPayload(team);
      const id = await window.lineupAuth.createSharedTeam(payload);
      team.sharedId = id;
      team.myRole = 'owner';
      if (!team.ownerUid) team.ownerUid = firebaseUser.uid;
      attachSharedTeamListener(id, 'owner');
      renderAll();
    } catch (err) {
      console.error('Mannschaft konnte nicht geteilt werden:', err);
      showToast(t('toastCloudSyncFailed'), 'error');
      return;
    }
  }
  byId('shareTeamDialog').showModal();
  await renderShareMembers(team.sharedId);
  await renderInviteLinkArea(team.sharedId);
}
// Baut die absolute, teilbare URL für einen Einladungslink-Token (siehe firebase-init.js).
function inviteLinkUrl(token) {
  return `${location.origin}${location.pathname}?invite=${encodeURIComponent(token)}`;
}
// Zeigt im "Teilen"-Dialog entweder das Formular zum Erstellen eines Einladungslinks (noch keiner
// aktiv) oder den bestehenden Link mit Kopieren/WhatsApp/Neu-erzeugen/Deaktivieren-Aktionen.
async function renderInviteLinkArea(sharedId) {
  const roleSelect = byId('inviteLinkRole'),
    createButton = byId('createInviteLinkButton'),
    linkRow = byId('inviteLinkRow'),
    actions = byId('inviteLinkActions'),
    input = byId('inviteLinkValue');
  if (!roleSelect || !createButton || !linkRow || !actions || !input) return;
  try {
    const link = await window.lineupAuth.getInviteLink(sharedId);
    if (link) {
      roleSelect.value = link.role;
      roleSelect.disabled = true;
      createButton.classList.add('hidden');
      input.value = inviteLinkUrl(link.token);
      linkRow.classList.remove('hidden');
      actions.classList.remove('hidden');
    } else {
      roleSelect.disabled = false;
      createButton.classList.remove('hidden');
      linkRow.classList.add('hidden');
      actions.classList.add('hidden');
      input.value = '';
    }
  } catch (err) {
    console.error('Einladungslink konnte nicht geladen werden:', err);
  }
}
async function renderShareMembers(sharedId) {
  const list = byId('shareMembersList');
  if (!list) return;
  list.innerHTML = `<p class="archive-empty">${t('loadingMembers')}</p>`;
  try {
    const members = await window.lineupAuth.listTeamMembers(sharedId);
    list.replaceChildren();
    members
      .sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0))
      .forEach((member) => {
        const row = document.createElement('div');
        row.className = 'invite-row';
        if (member.role === 'owner') {
          row.innerHTML = `<span><strong>${esc(member.email || '')}</strong><small>${t('roleOwner')}</small></span>`;
        } else {
          row.innerHTML = `<span><strong>${esc(member.email || '')}</strong></span><span class="invite-row-actions"><select class="member-role-select"><option value="full">${t('roleFull')}</option><option value="lineups">${t('roleLineups')}</option><option value="viewer">${t('roleViewer')}</option></select><button class="delete-button small-button remove-member">${t('removeMember')}</button></span>`;
          row.querySelector('.member-role-select').value = member.role;
          row.querySelector('.member-role-select').addEventListener('change', async (event) => {
            try {
              await window.lineupAuth.updateMemberRole(sharedId, member.uid, event.target.value);
              showToast(t('toastMemberUpdated'));
            } catch (err) {
              console.error('Rolle konnte nicht geändert werden:', err);
              showToast(t('toastCloudSyncFailed'), 'error');
            }
          });
          row.querySelector('.remove-member').addEventListener('click', async () => {
            if (!confirm(`${member.email || ''} ${t('confirmRemoveMember')}`)) return;
            try {
              await window.lineupAuth.removeMember(sharedId, member.uid);
              await renderShareMembers(sharedId);
              showToast(t('toastMemberRemoved'));
            } catch (err) {
              console.error('Mitglied konnte nicht entfernt werden:', err);
              showToast(t('toastCloudSyncFailed'), 'error');
            }
          });
        }
        list.append(row);
      });
  } catch (err) {
    console.error('Mitglieder konnten nicht geladen werden:', err);
    list.innerHTML = `<p class="archive-empty">${t('toastCloudSyncFailed')}</p>`;
  }
}
async function inviteMemberSubmit(event) {
  event.preventDefault();
  const teamId = byId('shareTeamId').value,
    team = app.teams.find((entry) => entry.id === teamId);
  if (!team || !team.sharedId) return;
  const email = byId('shareInviteEmail').value.trim();
  if (!email) return;
  const role = byId('shareInviteRole').value;
  try {
    await window.lineupAuth.inviteMember(team.sharedId, team.name, email, role);
    byId('shareInviteEmail').value = '';
    showToast(t('toastInviteSent'));
  } catch (err) {
    console.error('Einladung konnte nicht verschickt werden:', err);
    showToast(t('toastCloudSyncFailed'), 'error');
  }
}
byId('createInviteLinkButton')?.addEventListener('click', async () => {
  const teamId = byId('shareTeamId').value,
    team = app.teams.find((entry) => entry.id === teamId);
  if (!team || !team.sharedId) return;
  const role = byId('inviteLinkRole').value;
  try {
    await window.lineupAuth.createInviteLink(team.sharedId, team.name, role);
    await renderInviteLinkArea(team.sharedId);
    showToast(t('toastInviteLinkCreated'));
  } catch (err) {
    console.error('Einladungslink konnte nicht erstellt werden:', err);
    showToast(t('toastInviteLinkFailed'), 'error');
  }
});
byId('copyInviteLinkButton')?.addEventListener('click', async () => {
  const value = byId('inviteLinkValue').value;
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    showToast(t('toastInviteLinkCopied'));
  } catch (err) {
    console.error('Link konnte nicht kopiert werden:', err);
    byId('inviteLinkValue').select();
  }
});
byId('whatsappInviteLinkButton')?.addEventListener('click', () => {
  const value = byId('inviteLinkValue').value;
  if (!value) return;
  window.open(`https://wa.me/?text=${encodeURIComponent(value)}`, '_blank', 'noopener');
});
byId('regenerateInviteLinkButton')?.addEventListener('click', async () => {
  const teamId = byId('shareTeamId').value,
    team = app.teams.find((entry) => entry.id === teamId);
  if (!team || !team.sharedId) return;
  try {
    const existing = await window.lineupAuth.getInviteLink(team.sharedId);
    if (existing) await window.lineupAuth.revokeInviteLink(team.sharedId, existing.token);
    await window.lineupAuth.createInviteLink(team.sharedId, team.name, existing?.role || byId('inviteLinkRole').value);
    await renderInviteLinkArea(team.sharedId);
    showToast(t('toastInviteLinkCreated'));
  } catch (err) {
    console.error('Einladungslink konnte nicht neu erzeugt werden:', err);
    showToast(t('toastInviteLinkFailed'), 'error');
  }
});
byId('revokeInviteLinkButton')?.addEventListener('click', async () => {
  const teamId = byId('shareTeamId').value,
    team = app.teams.find((entry) => entry.id === teamId);
  if (!team || !team.sharedId) return;
  if (!confirm(t('confirmRevokeInviteLink'))) return;
  try {
    const existing = await window.lineupAuth.getInviteLink(team.sharedId);
    if (existing) await window.lineupAuth.revokeInviteLink(team.sharedId, existing.token);
    await renderInviteLinkArea(team.sharedId);
    showToast(t('toastInviteLinkRevoked'));
  } catch (err) {
    console.error('Einladungslink konnte nicht deaktiviert werden:', err);
    showToast(t('toastInviteLinkFailed'), 'error');
  }
});

/* ============================================================
   ANSICHT, THEME & TEILEN
   ============================================================ */
function applyTheme() {
  document.documentElement.dataset.theme = app.theme;
  byId('themeLabel').textContent = app.theme === 'dark' ? t('darkMode') : t('lightMode');
  byId('themeToggle').querySelector('.theme-icon').textContent = app.theme === 'dark' ? '☾' : '☀';
  document.querySelector('meta[name="theme-color"]').content = app.theme === 'dark' ? '#0e1017' : '#f4f5f9';
}
const VIEW_KEY = 'lineup-amateur-view';
const VALID_VIEWS = ['lineup', 'roster', 'archive', 'design', 'matchday'];
let currentView = 'lineup';
// scroll: bei true wird nach dem Wechsel nach oben gescrollt (Standard, z. B. bei Klick im Menü).
// Beim Wiederherstellen der Ansicht nach einem Seiten-Reload (siehe restoreView) wird das unterdrückt.
// Sperrt die Aufstellungs-/Kader-Oberfläche optisch (kein Klicken/Ziehen mehr möglich) und zeigt
// einen Hinweisbanner, wenn die aktive Mannschaft geteilt ist und die eigene Rolle die jeweilige
// Aktion nicht erlaubt. Wird nach jedem Ansichtswechsel und nach jedem renderAll() aufgerufen.
function applyPermissionLocks() {
  const perms = activePerms();
  byId('lineupView')?.classList.toggle('locked-view', !perms.lineups);
  byId('matchdayView')?.classList.toggle('locked-view', !perms.lineups);
  byId('rosterView')?.classList.toggle('locked-view', !perms.squad);
  byId('saveLineup')?.classList.toggle('hidden', !perms.lineups);
  byId('clearLineup')?.classList.toggle('hidden', !perms.lineups);
  byId('openPlayerDialog')?.classList.toggle('hidden', !perms.squad);
  const lockedNow =
    (currentView === 'roster' && !perms.squad) ||
    ((currentView === 'lineup' || currentView === 'matchday') && !perms.lineups);
  let banner = byId('readOnlyBanner');
  if (lockedNow) {
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'readOnlyBanner';
      banner.className = 'readonly-banner';
      document.querySelector('main')?.insertBefore(banner, document.querySelector('main').firstChild.nextSibling);
    }
    banner.textContent = t('readOnlyBannerText');
    banner.classList.remove('hidden');
  } else if (banner) {
    banner.classList.add('hidden');
  }
}
function setView(view, scroll = true) {
  currentView = view;
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch (_) {}
  const roster = view === 'roster',
    archive = view === 'archive',
    design = view === 'design',
    matchday = view === 'matchday',
    lineup = !roster && !archive && !design && !matchday;
  byId('lineupView').classList.toggle('active', lineup);
  byId('rosterView').classList.toggle('active', roster);
  byId('archiveView').classList.toggle('active', archive);
  byId('designView').classList.toggle('active', design);
  byId('matchdayView').classList.toggle('active', matchday);
  document
    .querySelectorAll('.main-nav [data-view]')
    .forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  document.querySelectorAll('.lineup-action').forEach((el) => el.classList.toggle('hidden', !lineup));
  document.querySelectorAll('.roster-action').forEach((el) => el.classList.toggle('hidden', !roster));
  document.querySelectorAll('.archive-action').forEach((el) => el.classList.toggle('hidden', !archive));
  document.querySelectorAll('.matchday-action').forEach((el) => el.classList.toggle('hidden', !matchday));
  document.querySelectorAll('.export-png-action').forEach((el) => el.classList.toggle('hidden', !(lineup || matchday)));
  byId('pageTitle').textContent = roster
    ? t('pageTitleRoster')
    : archive
      ? t('pageTitleArchive')
      : design
        ? t('pageTitleDesign')
        : matchday
          ? t('pageTitleMatchday')
          : t('pageTitleLineup');
  if (matchday) renderMatchday();
  applyPermissionLocks();
  if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
}
// Stellt nach einem Seiten-Reload die zuletzt aktive Ansicht (Aufstellung/Kader/Archiv) wieder her.
// Nicht bei geteilten Lineup-Links (#lineup=...), die sollen immer auf der Aufstellung starten.
function restoreView() {
  if (location.hash.startsWith('#lineup=')) return;
  let saved = null;
  try {
    saved = localStorage.getItem(VIEW_KEY);
  } catch (_) {}
  if (saved && VALID_VIEWS.includes(saved) && saved !== 'lineup') setView(saved, false);
}
/* ============================================================
   SPRACHUMSCHALTER (DE/EN)
   ============================================================ */
function applyStaticTranslations() {
  document.documentElement.lang = app.lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
  document
    .querySelectorAll('#langToggle button')
    .forEach((button) => button.classList.toggle('active', button.dataset.lang === app.lang));
  byId('pitch').setAttribute('aria-label', t('pitchAriaLabel'));
  byId('pageTitle').textContent =
    currentView === 'roster'
      ? t('pageTitleRoster')
      : currentView === 'archive'
        ? t('pageTitleArchive')
        : currentView === 'design'
          ? t('pageTitleDesign')
          : currentView === 'matchday'
            ? t('pageTitleMatchday')
            : t('pageTitleLineup');
}
function setLanguage(lang) {
  if (lang !== app.lang) {
    app.lang = lang;
    applyStaticTranslations();
    renderAll();
    applyTheme();
    renderAccount();
  }
}
byId('langToggle').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-lang]');
  if (button) setLanguage(button.dataset.lang);
});
function loadImageAsync(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
/* Same base64 field-line graphic as .pitch::before / .mini-pitch::before in styles.css, so the pitch, the
   archive preview and this screenshot all show identical, correctly-round, correctly-aligned field lines. */
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer),
    chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  return btoa(binary);
}
let outfitFontFaceCssPromise = null;
/* The pitch/bench snapshot below is rendered as an SVG <foreignObject> that gets rasterised via <img>, which
   does NOT have access to the 'Outfit' webfont loaded on the page (that link tag only helps real DOM/canvas
   text) - without this, the SVG silently falls back to Arial and the jersey numbers/player names end up in a
   different, thinner typeface than everywhere else in the app. Embedding the actual font file as a base64
   @font-face inside the SVG's own <style> fixes that. Fetched once and cached for the rest of the session;
   if the fetch fails (offline etc.) we just fall back to Arial as before. */
async function getOutfitFontFaceCss() {
  if (outfitFontFaceCssPromise) return outfitFontFaceCssPromise;
  outfitFontFaceCssPromise = (async () => {
    try {
      const cssRes = await fetch('https://fonts.googleapis.com/css2?family=Outfit:wght@500;700;800&display=swap');
      const cssText = await cssRes.text();
      const faceRegex = /@font-face\s*{([^}]*)}/g;
      let match,
        rules = '';
      while ((match = faceRegex.exec(cssText))) {
        const block = match[1];
        const weightMatch = block.match(/font-weight:\s*(\d+)/);
        const urlMatch = block.match(/url\((https:\/\/[^)]+\.woff2)\)\s*format\('woff2'\)/);
        if (!weightMatch || !urlMatch) continue;
        const fontRes = await fetch(urlMatch[1]);
        const base64 = arrayBufferToBase64(await fontRes.arrayBuffer());
        rules += `@font-face{font-family:'Outfit';font-style:normal;font-weight:${weightMatch[1]};src:url(data:font/woff2;base64,${base64}) format('woff2');}`;
      }
      return rules;
    } catch (_) {
      return '';
    }
  })();
  return outfitFontFaceCssPromise;
}
/* ============================================================
   SCREENSHOT-EXPORT (PNG)
   ============================================================ */
/* Nur der Torrahmen, fest weiß - unabhängig von team.appearance.lineColor (siehe .pitch::after in
   styles.css, gleiches Prinzip hier für den PNG-Export). */
const PITCH_GOAL_DATA_URI =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgLTMgNzggMTA2Ij48ZyBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS1vcGFjaXR5PSIwLjgyIiBzdHJva2Utd2lkdGg9IjAuNCI+PHBhdGggZD0iTTM0LjUsMCBMMzQuNSwtMi4yIEw0My41LC0yLjIgTDQzLjUsMCIvPjxwYXRoIGQ9Ik0zNC41LDEwMCBMMzQuNSwxMDIuMiBMNDMuNSwxMDIuMiBMNDMuNSwxMDAiLz48L2c+PC9zdmc+';
function grassPatternCss(pattern) {
  switch (pattern) {
    case 'checker':
      return `background-image:conic-gradient(var(--grass-a) 90deg,var(--grass-b) 90deg 180deg,var(--grass-a) 180deg 270deg,var(--grass-b) 270deg);background-size:32.1% 25%`;
    case 'circles':
      return `background:repeating-radial-gradient(circle at 50% 50%,var(--grass-a) 0,var(--grass-a) 14%,var(--grass-b) 14%,var(--grass-b) 28%)`;
    case 'tactics':
      return `background:var(--grass-a)`;
    default:
      return `background:repeating-linear-gradient(0deg,var(--grass-a) 0,var(--grass-a) 12.5%,var(--grass-b) 12.5%,var(--grass-b) 25%)`;
  }
}
function jerseyPatternCss(prefix, shape = 'jersey', size = 56, benchSize = 32) {
  /* Reproduces the exact .jersey pattern rules from styles.css (kit-stripes/hoops/diagonal/sleeves/halves/sash)
     so a screenshot jersey looks identical to the one shown on the pitch. When shape is 'circle', the jersey
     silhouette is swapped for a plain circle (border-radius instead of clip-path). The kit-sleeves pattern relies
     on polygon corners specific to the jersey silhouette, so for circles it instead gets a secondary-coloured
     rim ring around a primary-coloured disc (radial-gradient), so it doesn't look like "Breiter Mittelstreifen".
     "size" is the on-field jersey width in px for the starters; "benchSize" is the width used for the ".ss-sm"
     (bench) variant, computed per export format/layout so bench jerseys scale with the chosen bench grid. */
  const circleOverrides =
    shape === 'circle'
      ? `
  .${prefix}{clip-path:none;border-radius:50%;width:${size}px;height:${size}px}
  .${prefix}.ss-sm{width:${benchSize}px;height:${benchSize}px}
  .${prefix}.kit-sleeves{background:radial-gradient(circle closest-side,var(--kit-a) 0 75%,var(--kit-b) 75% 100%)}
  .${prefix}.kit-sleeves::before,.${prefix}.kit-sleeves::after{content:none}`
      : '';
  return `.${prefix}{display:grid;place-items:center;width:${size}px;height:${Math.round((size * 61) / 56)}px;margin:0 auto 5px;clip-path:polygon(30% 0%,50% 7%,70% 0%,86% 9%,100% 27%,89% 37%,76% 26%,79% 97%,73% 100%,27% 100%,21% 97%,24% 26%,11% 37%,0% 27%,14% 9%);background:var(--kit-a);color:var(--number);text-shadow:0 1px 3px #0008;font:800 ${Math.round((size * 17) / 56)}px 'Outfit',Arial,sans-serif}
  .${prefix}.kit-stripes{background:linear-gradient(90deg,var(--kit-a) 0,var(--kit-a) 6.25%,var(--kit-b) 6.25%,var(--kit-b) 18.75%,var(--kit-a) 18.75%,var(--kit-a) 31.25%,var(--kit-b) 31.25%,var(--kit-b) 43.75%,var(--kit-a) 43.75%,var(--kit-a) 56.25%,var(--kit-b) 56.25%,var(--kit-b) 68.75%,var(--kit-a) 68.75%,var(--kit-a) 81.25%,var(--kit-b) 81.25%,var(--kit-b) 93.75%,var(--kit-a) 93.75%,var(--kit-a) 100%)}
  .${prefix}.kit-hoops{background:linear-gradient(0deg,var(--kit-a) 0,var(--kit-a) 6.25%,var(--kit-b) 6.25%,var(--kit-b) 18.75%,var(--kit-a) 18.75%,var(--kit-a) 31.25%,var(--kit-b) 31.25%,var(--kit-b) 43.75%,var(--kit-a) 43.75%,var(--kit-a) 56.25%,var(--kit-b) 56.25%,var(--kit-b) 68.75%,var(--kit-a) 68.75%,var(--kit-a) 81.25%,var(--kit-b) 81.25%,var(--kit-b) 93.75%,var(--kit-a) 93.75%,var(--kit-a) 100%)}
  .${prefix}.kit-diagonal{background:linear-gradient(135deg,var(--kit-b) 0,var(--kit-b) 6.25%,var(--kit-a) 6.25%,var(--kit-a) 18.75%,var(--kit-b) 18.75%,var(--kit-b) 31.25%,var(--kit-a) 31.25%,var(--kit-a) 43.75%,var(--kit-b) 43.75%,var(--kit-b) 56.25%,var(--kit-a) 56.25%,var(--kit-a) 68.75%,var(--kit-b) 68.75%,var(--kit-b) 81.25%,var(--kit-a) 81.25%,var(--kit-a) 93.75%,var(--kit-b) 93.75%,var(--kit-b) 100%)}
  .${prefix}.kit-sleeves{position:relative;background:var(--kit-a)}
  .${prefix}.kit-sleeves::before,.${prefix}.kit-sleeves::after{content:"";position:absolute;inset:0;background:var(--kit-b)}
  .${prefix}.kit-sleeves::before{clip-path:polygon(30% 0%,14% 9%,0% 27%,11% 37%,24% 26%)}
  .${prefix}.kit-sleeves::after{clip-path:polygon(70% 0%,86% 9%,100% 27%,89% 37%,76% 26%)}
  .${prefix}.kit-halves{background:linear-gradient(90deg,var(--kit-a) 0 50%,var(--kit-b) 50%)}
  .${prefix}.kit-sash{background:linear-gradient(135deg,var(--kit-a) 0 38%,var(--kit-b) 38% 61%,var(--kit-a) 61%)}
  .${prefix}.kit-centerstripe{background:linear-gradient(90deg,var(--kit-a) 0 32%,var(--kit-b) 32% 68%,var(--kit-a) 68%)}
  .${prefix}.ss-placeholder{color:transparent}
  .${prefix}.ss-sm{width:${benchSize}px;height:${Math.round(benchSize * 1.125)}px;font-size:${Math.max(7, Math.round(benchSize * 0.31))}px;margin:0}${circleOverrides}`;
}
/* Export-Formate für "Grafik als PNG": jedes Format hat eine eigene Bank-/Layout-Anordnung
   (Spalten/Zeilen bzw. Seitenleiste), damit die Ersatzbank auf schmalen/hohen oder breiten
   Formaten sinnvoll mitwächst statt gequetscht zu werden. */
const LINEUP_FORMAT_LAYOUTS = {
  '1:1': { layout: 'side', pitchH: 660, rightW: 230, gapX: 20, benchCols: 2, benchSide: 'left' },
  '9:16': { layout: 'below', W: 640, benchCols: 6, coachBelow: true },
  '16:9': { layout: 'side', pitchH: 560, rightW: 300, gapX: 24, benchCols: 2, benchSide: 'right' },
};
function benchSlotHtml(team, id) {
  const player = id ? playerFor(id) : null;
  if (player) {
    const benchKit = kitForPlayer(player, team);
    return `<div class="ss-bench-slot">${player.photo ? `<img class="ss-bench-photo" src="${player.photo}"/>` : `<span class="ss-jersey ss-sm kit-${benchKit.pattern}"${kitStyleAttr(player, team)}>${esc(number(player))}</span>`}<strong>${esc(player.name)}</strong></div>`;
  }
  return `<div class="ss-bench-slot ss-bench-empty"><span class="ss-jersey ss-sm kit-${team.kit.pattern} ss-placeholder"></span><span>${esc(t('free'))}</span></div>`;
}
async function buildLineupSnapshotImage(team, d, format = '1:1', availW, availH) {
  /* Rebuilds the pitch, the bench and the coach slot with the exact same markup/CSS classes used on screen
     (renderPitch/renderBench/coach-slot), at a fixed export size, so the PNG matches the live Aufstellung
     exactly: same field-line graphic, same player positions, same jersey patterns, same bench and coach card.
     The bench/coach arrangement varies per export format (see LINEUP_FORMAT_LAYOUTS above).
     availW/availH (optional): the space the caller will actually draw this snapshot into on the final
     canvas. Since every format's native snapshot geometry differs, the uniform "fit" scale-factor the
     caller applies afterwards differs too - without correction the player name tags would end up a
     different final pixel size in every export format. Passing the target area lets us pre-compute that
     scale factor and counter-scale the bench/coach font sizes so they read consistently across formats.
     The on-pitch player-name tag is deliberately excluded from that normalisation: it's sized as a fixed
     share of the token width (tokenW), exactly like ".player-token .player-name{font-size:1.83cqw}" in
     styles.css, so it keeps the same proportion to the pitch as in the live Aufstellung - which also means
     it comes out visibly bigger in 16:9 (wide pitch) than in 9:16 (narrow pitch), matching the app. */
  const cfg = LINEUP_FORMAT_LAYOUTS[format] || LINEUP_FORMAT_LAYOUTS['1:1'];
  const PITCH_ASPECT = 0.78,
    gapY = 16;
  const positions = d.formation === 'custom' ? positionsFor(customModeBaseFormation(d)) : positionsFor(d.formation);
  const grassB = mix(team.appearance.grass, '#000000', 0.09);
  const coachVisual = team.coach.photo
    ? `<img class="ss-coach-photo" src="${team.coach.photo}"/>`
    : `<span class="ss-coach-avatar">${t('coachAbbr')}</span>`;
  const coachBox = (boxStyle = '') =>
    `<div class="ss-coach" style="${boxStyle}">${coachVisual}<div><small>${t('coach')}</small><strong>${esc(team.coach.name || t('coachPlaceholder'))}</strong></div></div>`;
  let W, pitchW, pitchH, totalH, bodyHtml, tokenW, visualSize;
  const buildTokens = (pitchWidth) => {
    const tokenW = Math.round(pitchWidth * 0.1933),
      visualSize = Math.round(tokenW * 0.54);
    const tokens = d.starters
      .map((id, index) => {
        const player = playerFor(id),
          pos =
            d.formation === 'custom'
              ? player && d.positions[id]
                ? d.positions[id]
                : !player && d.slotPositions[index]
                  ? d.slotPositions[index]
                  : positions[index]
              : positions[index];
        const isGkSlot = index === 0;
        const tokenKit = isGkSlot ? team.gkKit || team.kit : team.kit;
        const visual = player
          ? player.photo
            ? `<img class="ss-photo" src="${player.photo}"/>`
            : `<span class="ss-jersey kit-${tokenKit.pattern}"${isGkSlot ? kitStyleVars(tokenKit) : ''}>${esc(number(player))}</span>`
          : `<span class="ss-jersey kit-${tokenKit.pattern} ss-placeholder"${isGkSlot ? kitStyleVars(tokenKit) : ''}></span>`;
        const nameTag = player ? `<span class="ss-name">${esc(player.name)}</span>` : '';
        const captain = player && d.captainId === player.id ? '<b class="ss-captain">C</b>' : '';
        return `<div class="ss-token" style="left:${pos.x}%;top:${pos.y}%">${visual}${nameTag}${captain}</div>`;
      })
      .join('');
    return { tokens, tokenW, visualSize };
  };
  let jerseyCss;
  if (cfg.layout === 'side') {
    pitchH = cfg.pitchH;
    pitchW = Math.round(pitchH * PITCH_ASPECT);
    W = pitchW + cfg.gapX + cfg.rightW;
    totalH = pitchH;
    const built = buildTokens(pitchW);
    const { tokens } = built;
    tokenW = built.tokenW;
    visualSize = built.visualSize;
    const coachH = Math.round(cfg.rightW * 0.42);
    const benchAreaH = pitchH - coachH - 10;
    const benchRows = Math.ceil(12 / cfg.benchCols);
    const colGap = 8,
      rowGap = 8;
    const colWidth = Math.round((cfg.rightW - colGap * (cfg.benchCols - 1)) / cfg.benchCols);
    const benchSize = Math.max(24, Math.round(colWidth * 0.24));
    const rowH = Math.round((benchAreaH - rowGap * (benchRows - 1)) / benchRows);
    jerseyCss = jerseyPatternCss('ss-jersey', team.kit.shape, visualSize, benchSize);
    const benchItems = d.bench.map((id) => benchSlotHtml(team, id)).join('');
    const pitchBlock = `<div class="ss-pitch" style="width:${pitchW}px;height:${pitchH}px">${tokens}</div>`;
    const sideBlock = `<div class="ss-side-col" style="width:${cfg.rightW}px;display:flex;flex-direction:column;gap:10px">
        <div class="ss-bench-slots" style="grid-template-columns:repeat(${cfg.benchCols},1fr);grid-auto-rows:${rowH}px">${benchItems}</div>
        ${coachBox(`height:${coachH}px;box-sizing:border-box`)}
      </div>`;
    bodyHtml = `<div class="ss-side-wrap" style="display:flex;gap:${cfg.gapX}px">
      ${cfg.benchSide === 'left' ? sideBlock + pitchBlock : pitchBlock + sideBlock}
    </div>`;
  } else {
    W = cfg.W;
    pitchW = W;
    pitchH = Math.round(W / PITCH_ASPECT);
    const built = buildTokens(pitchW);
    const { tokens } = built;
    tokenW = built.tokenW;
    visualSize = built.visualSize;
    const benchRows = Math.ceil(12 / cfg.benchCols);
    const benchRowH = 84,
      benchGridH = benchRowH * benchRows + 8;
    const benchSize = 32;
    jerseyCss = jerseyPatternCss('ss-jersey', team.kit.shape, visualSize, benchSize);
    const benchItems = d.bench.map((id) => benchSlotHtml(team, id)).join('');
    if (cfg.coachBelow) {
      const coachH = 64;
      totalH = pitchH + gapY + benchGridH + 10 + coachH;
      bodyHtml = `<div class="ss-pitch" style="width:${pitchW}px;height:${pitchH}px">${tokens}</div>
      <div class="ss-bench-wrap" style="margin-top:${gapY}px;display:flex;flex-direction:column;gap:10px">
        <div class="ss-bench-slots" style="grid-template-columns:repeat(${cfg.benchCols},1fr)">${benchItems}</div>
        ${coachBox('width:100%;box-sizing:border-box')}
      </div>`;
    } else {
      totalH = pitchH + gapY + benchGridH;
      bodyHtml = `<div class="ss-pitch" style="width:${pitchW}px;height:${pitchH}px">${tokens}</div>
      <div class="ss-bench-wrap" style="margin-top:${gapY}px;display:grid;grid-template-columns:1fr 148px;gap:10px">
        <div class="ss-bench-slots" style="grid-template-columns:repeat(${cfg.benchCols},1fr)">${benchItems}</div>
        ${coachBox('box-sizing:border-box')}
      </div>`;
    }
  }
  const tokenCss = `.ss-token{position:absolute;transform:translate(-50%,-50%);width:${tokenW}px;text-align:center}.ss-photo{width:${visualSize}px;height:${visualSize}px}.ss-name{max-width:${tokenW}px}`;
  const fontScale =
    availW && availH ? Math.min(2.2, Math.max(0.55, 15 / (11 * Math.min(availW / W, availH / totalH)))) : 1;
  /* Same ratio as ".player-token .player-name{font-size:1.83cqw}" in styles.css, where the cqw base is the
     pitch width and a token is 19.33% of the pitch (1.83/19.33): keeps the on-pitch name proportional to
     the pitch/token size in every export format, exactly like on the live Aufstellung. */
  const nameFontSize = Math.max(1, Math.round(tokenW * 0.0947));
  const fontFaceCss = await getOutfitFontFaceCss();
  const html = `<div xmlns="http://www.w3.org/1999/xhtml" class="ss-root" style="--kit-a:${team.kit.primary};--kit-b:${team.kit.secondary};--number:${team.kit.numberColor}"><style>
  ${fontFaceCss}
  *{box-sizing:border-box;margin:0;padding:0;font-family:'Outfit',Arial,sans-serif}
  .ss-root{width:${W}px}
  .ss-pitch{position:relative;border-radius:8px;overflow:hidden;--grass-a:${team.appearance.grass};--grass-b:${grassB};${grassPatternCss(team.appearance.grassPattern)}}
  .ss-pitch::before{content:"";position:absolute;inset:12px;background-repeat:no-repeat;background-position:center;background-size:100% 100%;background-image:url("data:image/svg+xml,${encodeURIComponent(pitchLinesSvg(team.sport, team.appearance.lineColor))}")}
  .ss-pitch::after{content:"";position:absolute;inset:12px;background-repeat:no-repeat;background-position:center;background-size:100% 100%;background-image:url("${PITCH_GOAL_DATA_URI}")}
  ${tokenCss}
  ${jerseyCss}
  .ss-photo{display:block;margin:0 auto 5px;object-fit:cover;border-radius:50%;border:3px solid #fff;box-shadow:0 4px 9px #00331466}
  .ss-name{display:inline-block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-radius:5px;padding:3px 7px;background:#fffffff5;color:#203120;font-size:${nameFontSize}px;font-weight:800}
  .ss-captain{position:absolute;top:-4px;right:18px;border-radius:50%;height:19px;width:19px;display:grid;place-items:center;background:var(--kit-a);color:var(--kit-b);font:800 10px 'Outfit';box-shadow:0 2px 5px #0004}
  .ss-bench-slots{display:grid;gap:8px}
  .ss-bench-slot{border:1px solid #ffffff40;border-radius:7px;background:#ffffff14;display:grid;justify-items:center;align-content:center;gap:3px;padding:6px 3px;color:#fff}
  .ss-bench-slot strong{font-size:${Math.round(9 * fontScale)}px;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ss-bench-empty span:last-child{font-size:${Math.round(8 * fontScale)}px;color:#ffffff90}
  .ss-bench-photo{display:block;width:34px;height:34px;margin:0 auto;border-radius:50%;object-fit:cover;border:2px solid #fff}
  .ss-coach{border:1px solid #ffffff40;border-radius:7px;background:#ffffff14;padding:10px;display:flex;gap:9px;align-items:center;color:#fff}
  .ss-coach-avatar{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:${team.appearance.accent};color:#fff;font:800 12px 'Outfit',Arial,sans-serif;flex:0 0 auto}
  .ss-coach-photo{width:44px;height:44px;border-radius:50%;object-fit:cover;flex:0 0 auto}
  .ss-coach small{display:block;color:#ffffffaa;font:500 8px 'Outfit',sans-serif}
  .ss-coach strong{display:block;max-width:88px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:${Math.round(11 * fontScale)}px}
  </style>${bodyHtml}</div>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${totalH}"><foreignObject width="${W}" height="${totalH}">${html}</foreignObject></svg>`;
  const dataUri = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  const img = await loadImageAsync(dataUri);
  return { img, width: W, height: totalH };
}
const EXPORT_CANVAS_DIMS = { '1:1': { w: 1080, h: 1080 }, '16:9': { w: 1920, h: 1080 }, '9:16': { w: 1080, h: 1920 } };
async function downloadScreenshot(format = '1:1') {
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (_) {}
  }
  const team = activeTeam(),
    d = draft();
  const { w: canvasW, h: canvasH } = EXPORT_CANVAS_DIMS[format] || EXPORT_CANVAS_DIMS['1:1'];
  const u = canvasW / 1080; // Skalierungsfaktor für Header-/Footer-Elemente relativ zur 1080px-Referenzbreite
  const headingScale = format === '9:16' ? 1.5 : 1; // Überschrift im Story-Format deutlich größer
  const PAD = Math.round(40 * u),
    HEADER_H = Math.round(88 * u * headingScale),
    FOOTER_H = Math.round(40 * u);
  const availW = canvasW - PAD * 2,
    availH = canvasH - HEADER_H - FOOTER_H - PAD * 2;
  const { img, width: snapW, height: snapH } = await buildLineupSnapshotImage(team, d, format, availW, availH);
  const fit = Math.min(availW / snapW, availH / snapH);
  const drawW = Math.round(snapW * fit),
    drawH = Math.round(snapH * fit);
  const drawX = Math.round((canvasW - drawW) / 2),
    drawY = HEADER_H + PAD + Math.round((availH - drawH) / 2);
  const canvas = document.createElement('canvas'),
    ctx = canvas.getContext('2d');
  canvas.width = canvasW;
  canvas.height = canvasH;
  ctx.fillStyle = '#0e1017';
  ctx.fillRect(0, 0, canvasW, canvasH);
  let textX = PAD;
  if (team.crest) {
    try {
      const crestImg = await loadImageAsync(team.crest),
        crestSize = Math.round(64 * u * headingScale),
        cx = PAD,
        cy = PAD - Math.round(8 * u),
        r = Math.round(12 * u);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx + r, cy);
      ctx.arcTo(cx + crestSize, cy, cx + crestSize, cy + crestSize, r);
      ctx.arcTo(cx + crestSize, cy + crestSize, cx, cy + crestSize, r);
      ctx.arcTo(cx, cy + crestSize, cx, cy, r);
      ctx.arcTo(cx, cy, cx + crestSize, cy, r);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(crestImg, cx, cy, crestSize, crestSize);
      ctx.restore();
      textX = cx + crestSize + Math.round(16 * u);
    } catch (_) {}
  }
  ctx.fillStyle = '#f5fbf2';
  ctx.font = `800 ${Math.round(30 * u * headingScale)}px 'Outfit'`;
  ctx.textAlign = 'left';
  ctx.fillText(d.lineupName, textX, PAD + Math.round(10 * u * headingScale));
  ctx.fillStyle = team.appearance.accent;
  ctx.font = `700 ${Math.round(13 * u * headingScale)}px Outfit`;
  ctx.fillText(team.name.toUpperCase(), textX + 2, PAD + Math.round(34 * u * headingScale));
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  const footerY = canvasH - PAD * 0.55;
  ctx.textAlign = 'center';
  ctx.font = `800 ${Math.round(17 * u)}px 'Outfit'`;
  const lineupW = ctx.measureText('LINEUP ').width,
    amateurW = ctx.measureText('AMATEUR').width,
    logoX = canvasW / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f5fbf2';
  ctx.fillText('LINEUP ', logoX - (lineupW + amateurW) / 2, footerY + 6);
  ctx.fillStyle = team.appearance.accent;
  ctx.fillText('AMATEUR', logoX - (lineupW + amateurW) / 2 + lineupW, footerY + 6);
  ctx.textAlign = 'left';
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `${d.lineupName.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'aufstellung'}.png`;
  document.body.append(link);
  link.click();
  link.remove();
}
/* ============================================================
   MATCHDAY (Gegner, Heim/Auswärts, Spielort, Datum, Uhrzeit, Wappen-Upload)
   ============================================================ */
function renderMatchday() {
  const d = draft(),
    m =
      d.matchday || (d.matchday = { opponent: '', homeAway: 'home', venue: '', date: '', time: '', opponentCrest: '' });
  byId('matchdayOpponent').value = m.opponent || '';
  byId('matchdayVenue').value = m.venue || '';
  byId('matchdayDate').value = m.date || '';
  byId('matchdayTime').value = m.time || '';
  document
    .querySelectorAll('#matchdayHomeAway button')
    .forEach((button) => button.classList.toggle('active', button.dataset.value === (m.homeAway || 'home')));
  byId('matchdayCrestPreview').innerHTML = m.opponentCrest
    ? `<img src="${m.opponentCrest}" alt="${t('crestAlt')}">`
    : '<span class="jersey"></span>';
  byId('removeMatchdayCrest').classList.toggle('hidden', !m.opponentCrest);
}
async function downloadMatchdayPng(format = '16:9') {
  /* Die Spieltagsgrafik zeigt jetzt dieselbe Aufstellung wie die normale Grafik (buildLineupSnapshotImage),
     ergänzt um einen Kopfbereich mit Gegner-Infos (Wappen, Heim/Auswärts, Datum/Uhrzeit, Spielort). */
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (_) {}
  }
  const team = activeTeam(),
    d = draft(),
    m = d.matchday || {};
  const { w: W, h: H } = EXPORT_CANVAS_DIMS[format] || EXPORT_CANVAS_DIMS['16:9'];
  const isHome = m.homeAway !== 'away';
  const homeAwayLabel = (m.homeAway === 'away' ? t('away') : t('home')).toUpperCase();
  const dateLabel = formatMatchDate(m.date),
    timeLabel = m.time || '';
  const dateTimeLine = [dateLabel, timeLabel].filter(Boolean).join(' · ');
  const leftName = isHome ? team.name : m.opponent || t('opponentName');
  const rightName = isHome ? m.opponent || t('opponentName') : team.name;

  const s = Math.min(W, H) / 1080; // Skalierungsbasis, unabhängig vom Seitenverhältnis
  const PAD = Math.round(46 * s);
  const FOOTER_H = Math.round(56 * s);
  const crestSize = Math.round(148 * s);
  const leftCenterX = Math.round(W * 0.24),
    rightCenterX = Math.round(W * 0.76);
  const labelFont = Math.round(20 * s),
    nameFont = Math.round(26 * s),
    vsFont = Math.round(46 * s),
    infoFont = Math.round(22 * s),
    venueFont = Math.round(18 * s);

  /* Höhe des Kopfbereichs rein rechnerisch ermitteln (ohne zu zeichnen), damit wir die Aufstellung
     bereits mit der korrekten Zielgröße bauen können, bevor der Canvas überhaupt existiert. */
  let cursorY = PAD;
  cursorY += labelFont + Math.round(14 * s);
  const crestTop = cursorY;
  cursorY = crestTop + crestSize + Math.round(30 * s);
  cursorY += Math.round(30 * s);
  if (dateTimeLine) cursorY += Math.round(26 * s);
  if (m.venue) cursorY += Math.round(22 * s);
  const headerBottom = cursorY + Math.round(18 * s);
  const availW = W - PAD * 2,
    availH = Math.max(1, H - headerBottom - FOOTER_H - Math.round(PAD * 0.4));

  const {
    img: lineupImg,
    width: snapW,
    height: snapH,
  } = await buildLineupSnapshotImage(team, d, format, availW, availH);
  const canvas = document.createElement('canvas'),
    ctx = canvas.getContext('2d');
  canvas.width = W;
  canvas.height = H;
  ctx.fillStyle = '#0e1017';
  ctx.fillRect(0, 0, W, H);
  const ownImg = team.crest ? await loadImageAsync(team.crest).catch(() => null) : null;
  const oppImg = m.opponentCrest ? await loadImageAsync(m.opponentCrest).catch(() => null) : null;
  const drawCrest = async (img, cx, cy, size) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx + size / 2, cy + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx, cy, size, size);
    if (img) ctx.drawImage(img, cx, cy, size, size);
    ctx.restore();
  };
  const leftImg = isHome ? ownImg : oppImg,
    rightImg = isHome ? oppImg : ownImg;

  /* Kopfbereich zeichnen - dieselben Positionen wie in der Höhenberechnung oben. */
  cursorY = PAD;
  ctx.fillStyle = team.appearance.accent;
  ctx.font = `700 ${labelFont}px Outfit`;
  ctx.textAlign = 'center';
  ctx.fillText(homeAwayLabel, W / 2, cursorY + labelFont);
  cursorY += labelFont + Math.round(14 * s);
  await drawCrest(leftImg, leftCenterX - crestSize / 2, cursorY, crestSize);
  await drawCrest(rightImg, rightCenterX - crestSize / 2, cursorY, crestSize);
  ctx.fillStyle = team.appearance.accent;
  ctx.font = `800 ${vsFont}px 'Outfit'`;
  ctx.textAlign = 'center';
  ctx.fillText('VS', W / 2, cursorY + crestSize * 0.58);
  cursorY = cursorY + crestSize + Math.round(30 * s);
  ctx.fillStyle = '#f5fbf2';
  ctx.font = `800 ${nameFont}px 'Outfit'`;
  ctx.textAlign = 'center';
  ctx.fillText(truncateToWidth(ctx, leftName, W * 0.22), leftCenterX, cursorY);
  ctx.fillText(truncateToWidth(ctx, rightName, W * 0.22), rightCenterX, cursorY);
  cursorY += Math.round(30 * s);
  if (dateTimeLine) {
    ctx.fillStyle = '#f5fbf2';
    ctx.font = `700 ${infoFont}px 'Outfit'`;
    ctx.fillText(dateTimeLine, W / 2, cursorY);
    cursorY += Math.round(26 * s);
  }
  if (m.venue) {
    ctx.fillStyle = '#b7c2c9';
    ctx.font = `500 ${venueFont}px Outfit`;
    ctx.fillText(m.venue, W / 2, cursorY);
    cursorY += Math.round(22 * s);
  }

  /* Aufstellung unterhalb des Kopfbereichs einpassen (Skalierung darf auch vergrößern, kein "1"-Deckel). */
  const fit = Math.min(availW / snapW, availH / snapH);
  const drawW = Math.round(snapW * fit),
    drawH = Math.round(snapH * fit);
  const drawX = Math.round((W - drawW) / 2),
    drawY = headerBottom + Math.round((availH - drawH) / 2);
  ctx.drawImage(lineupImg, drawX, drawY, drawW, drawH);

  const footerY = H - Math.round(PAD * 0.35);
  ctx.font = `800 ${Math.round(17 * s)}px 'Outfit'`;
  const lineupW = ctx.measureText('LINEUP ').width,
    amateurW = ctx.measureText('AMATEUR').width,
    logoX = W / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f5fbf2';
  ctx.fillText('LINEUP ', logoX - (lineupW + amateurW) / 2, footerY);
  ctx.fillStyle = team.appearance.accent;
  ctx.fillText('AMATEUR', logoX - (lineupW + amateurW) / 2 + lineupW, footerY);
  ctx.textAlign = 'left';
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `${(m.opponent || 'spieltag').replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'spieltag'}.png`;
  document.body.append(link);
  link.click();
  link.remove();
  showToast(t('toastMatchdayPngCreated'));
}
function truncateToWidth(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(result + '…').width > maxWidth) result = result.slice(0, -1);
  return result + '…';
}
function formatMatchDate(value) {
  if (!value) return '';
  const parts = value.split('-');
  if (parts.length !== 3) return value;
  const [y, mo, d] = parts;
  return `${d}.${mo}.${y}`;
}
let renderAllFrame = null;
let renderAllFrameKey = null;
function scheduleRenderAll(continuousKey) {
  renderAllFrameKey = continuousKey;
  if (renderAllFrame) return;
  renderAllFrame = requestAnimationFrame(() => {
    renderAllFrame = null;
    renderAll(renderAllFrameKey);
  });
}
let toastTimer;
function showToast(message, type = 'success') {
  const toast = byId('toast');
  toast.textContent = message;
  toast.classList.toggle('toast--error', type === 'error');
  if (toast.showPopover && !toast.matches(':popover-open')) {
    try {
      toast.showPopover();
    } catch (_) {}
  }
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    if (toast.hidePopover && toast.matches(':popover-open')) {
      try {
        toast.hidePopover();
      } catch (_) {}
    }
  }, 2600);
}

/* ============================================================
   EVENT-LISTENER: Navigation, Aufstellungs-Toolbar, Team/Kit/Konto
   ============================================================ */
document
  .querySelectorAll('[data-view]')
  .forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
byId('openArchiveFromTeam').addEventListener('click', () => setView('archive'));
byId('confirmCustomFormation').addEventListener('click', () => {
  const d = draft();
  const result = parseCustomFormationShorthand(byId('customFormationInput').value, d.playerCount);
  if (!result.valid) {
    if (result.reason === 'sum')
      showToast(
        `${t('toastFormationSum')} ${result.required} ${t('toastFormationSumEnd')} ${result.sum}${t('toastFormationSumEnd2')}`,
        'error',
      );
    else if (result.reason === 'format' || result.reason === 'range') showToast(t('toastFormationFormat'), 'error');
    else showToast(t('toastPngPlease'), 'error');
    return;
  }
  setFormation(result.formation);
  applyFormation();
  byId('customFormationInput').value = '';
  showToast(t('toastCustomFormationApplied'));
});
byId('customFormationInput').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    byId('confirmCustomFormation').click();
  }
});
byId('freeMoveToggle').addEventListener('change', (event) => {
  const d = draft();
  if (!event.target.checked) {
    // Frei verschieben aktivieren: Formation auf 'custom' setzen, aktuelle Positionen bleiben erhalten.
    const defaults = positionsFor(d.formation === 'custom' ? customModeBaseFormation(d) : d.formation);
    setFormation('custom');
    d.positionsLocked = false;
    d.starters.forEach((id, index) => {
      if (id && !d.positions[id]) d.positions[id] = { ...defaults[index] };
    });
    renderAll();
    save();
  } else {
    // Fixieren: nur das Verschieben sperren (Drag&Drop auf dem Feld), die Formation bleibt 'custom'
    // und d.positions/d.slotPositions bleiben unverändert - Spieler springen NICHT zurück.
    if (d.formation !== 'custom') {
      const defaults = positionsFor(d.formation);
      setFormation('custom');
      d.starters.forEach((id, index) => {
        if (id && !d.positions[id]) d.positions[id] = { ...defaults[index] };
      });
    }
    d.positionsLocked = true;
    renderAll();
    save();
  }
});
byId('gridToggle').addEventListener('change', (event) => {
  draft().gridEnabled = event.target.checked;
  byId('gridSizeInput').classList.toggle('hidden', !event.target.checked);
  byId('gridSizeValue').classList.toggle('hidden', !event.target.checked);
  save();
});
byId('gridSizeInput').addEventListener('input', (event) => {
  const size = Number(event.target.value);
  draft().gridSize = size;
  byId('gridSizeValue').textContent = `${size}%`;
  save();
});
byId('playerCount').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-value]');
  if (button) changePlayerCount(button.dataset.value);
});
byId('addBenchSlot').addEventListener('click', () => {
  const index = draft().bench.findIndex((id) => !id);
  if (index < 0) {
    showToast(t('toastBenchFull'), 'error');
    return;
  }
  selectSlot('bench', index);
});
byId('lineupName').addEventListener('input', (event) => {
  draft().lineupName = event.target.value;
  save('lineupName');
});
byId('saveLineup').addEventListener('click', saveLineup);
byId('clearLineup').addEventListener('click', clearLineup);
byId('pitch').addEventListener('dragover', (event) => event.preventDefault());
byId('pitch').addEventListener('drop', (event) => {
  event.preventDefault();
  const id = event.dataTransfer.getData('application/x-lineup-player'),
    slot = selectedSlot.type === 'starter' ? selectedSlot.index : draft().starters.findIndex((entry) => !entry);
  if (!id) return;
  if (slot < 0) {
    showToast(t('toastLineupFull'), 'error');
    return;
  }
  assignPlayer(id, 'starter', slot);
  if (draft().formation === 'custom' && !draft().positionsLocked) {
    const rect = byId('pitch').getBoundingClientRect();
    draft().positions[id] = {
      x: Math.round(((event.clientX - rect.left) / rect.width) * 100),
      y: Math.round(((event.clientY - rect.top) / rect.height) * 100),
    };
    renderPitch();
    save();
  }
});
byId('benchSlots').addEventListener('dragover', (event) => event.preventDefault());
byId('benchSlots').addEventListener('drop', (event) => {
  event.preventDefault();
  const id = event.dataTransfer.getData('application/x-lineup-player'),
    index = draft().bench.findIndex((entry) => !entry);
  if (id && index >= 0) assignPlayer(id, 'bench', index);
});
function deselectAll() {
  selectedSlot = { type: '', index: -1 };
  profileMode = 'player';
  updateHighlights();
  renderSelection();
  renderPlayerProfile(null);
}
const DESELECT_BACKGROUND_CLASSES = ['pitch'];
byId('lineupView').addEventListener('click', (event) => {
  const target = event.target;
  if (target && target.classList && DESELECT_BACKGROUND_CLASSES.some((cls) => target.classList.contains(cls)))
    deselectAll();
});
[
  ['kitPrimary', 'primary'],
  ['kitSecondary', 'secondary'],
  ['kitNumberColor', 'numberColor'],
].forEach(([id, key]) =>
  byId(id).addEventListener('input', (event) => {
    const team = activeTeam();
    const kit = kitEditRole === 'gk' ? team.gkKit : team.kit;
    kit[key] = event.target.value;
    scheduleRenderAll('kitColor');
  }),
);
byId('kitRoleToggle').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-role]');
  if (!button) return;
  kitEditRole = button.dataset.role;
  renderKit();
});
byId('designGrassColor').addEventListener('input', (event) => {
  activeTeam().appearance.grass = event.target.value;
  scheduleRenderAll('grassColor');
});
byId('designLineColor').addEventListener('input', (event) => {
  activeTeam().appearance.lineColor = event.target.value;
  scheduleRenderAll('lineColor');
});
byId('designAccentColor').addEventListener('input', (event) => {
  activeTeam().appearance.accent = event.target.value;
  scheduleRenderAll('accentColor');
});
byId('undoButton').addEventListener('click', undoHistory);
byId('redoButton').addEventListener('click', redoHistory);
document.addEventListener('keydown', (event) => {
  if (!(event.ctrlKey || event.metaKey)) return;
  const key = event.key.toLowerCase();
  if (key === 'z') {
    event.preventDefault();
    event.shiftKey ? redoHistory() : undoHistory();
  } else if (key === 'y') {
    event.preventDefault();
    redoHistory();
  }
});
byId('themeToggle').addEventListener('click', () => {
  app.theme = app.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  renderAll();
});
/* Kontaktformular via EmailJS (https://www.emailjs.com):
   - EMAILJS_PUBLIC_KEY / EMAILJS_SERVICE_ID: aus dem EmailJS-Dashboard ("Account" bzw. "Email Services").
   - EMAILJS_TEMPLATE_FEEDBACK: Vorlage, die EUCH die Nachricht des Nutzers zuschickt
     (To Email = lineup.amateur@gmail.com, Reply To = {{from_email}}).
   - EMAILJS_TEMPLATE_CONFIRMATION: Auto-Reply-Vorlage, die dem NUTZER eine Bestätigung schickt
     (To Email = {{from_email}}).*/
const EMAILJS_PUBLIC_KEY='4CJhLup4RARs4NVuS';
const EMAILJS_SERVICE_ID='service_3fxmt6w';
const EMAILJS_TEMPLATE_FEEDBACK='template_lugpjuq';
const EMAILJS_TEMPLATE_CONFIRMATION='template_zodxdeu';
if (window.emailjs) window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
byId('contactToggle').addEventListener('click', () => {
  byId('contactForm').reset();
  byId('contactError').style.display = 'none';
  byId('contactDialog').showModal();
});
byId('closeContactDialog').addEventListener('click', () => byId('contactDialog').close());
byId('cancelContactDialog').addEventListener('click', () => byId('contactDialog').close());
byId('contactForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target,
    errorEl = byId('contactError'),
    submitButton = byId('contactSubmitButton');
  const name = byId('contactName').value.trim(),
    email = byId('contactEmail').value.trim(),
    message = byId('contactMessage').value.trim();
  errorEl.style.display = 'none';
  if (!name || !email || !message) {
    errorEl.textContent = t('toastContactMissingFields');
    errorEl.style.display = 'block';
    return;
  }
  if (!window.emailjs) {
    errorEl.textContent = t('toastContactFailed');
    errorEl.style.display = 'block';
    return;
  }
  submitButton.disabled = true;
  const originalLabel = submitButton.textContent;
  submitButton.textContent = t('contactSending');
  try {
    /* 1) Feedback-Mail an uns, mit dem Anhang (falls im EmailJS-Plan unterstützt). */
    await emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_FEEDBACK, form);
    /* 2) Automatische Bestätigungsmail an den Absender. */
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_CONFIRMATION, {
      from_name: name,
      from_email: email,
      message,
    });
    showToast(t('toastContactSent'));
    byId('contactDialog').close();
  } catch (err) {
    console.error('EmailJS-Versand fehlgeschlagen:', err);
    errorEl.textContent = t('toastContactFailed');
    errorEl.style.display = 'block';
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalLabel;
  }
});
byId('playerSearch').addEventListener('input', renderRoster);
byId('openPlayerDialog').addEventListener('click', () => openPlayerDialog());
byId('emptyAddPlayer').addEventListener('click', () => openPlayerDialog());
byId('closePlayerDialog').addEventListener('click', () => byId('playerDialog').close());
byId('cancelPlayerDialog').addEventListener('click', () => byId('playerDialog').close());
byId('playerForm').addEventListener('submit', savePlayer);
byId('deletePlayer').addEventListener('click', deletePlayer);
byId('removePlayerImage').addEventListener('click', () => {
  playerImageRemoved = true;
  byId('removePlayerImage').classList.add('hidden');
  const id = byId('editingPlayerId').value,
    current = id ? playerFor(id) : null;
  byId('playerImagePreview').innerHTML = playerVisual(current ? { ...current, photo: '' } : null, activeTeam());
});
byId('playerImageUpload').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  playerImageRemoved = false;
  byId('removePlayerImage').classList.add('hidden');
  byId('playerImagePreview').innerHTML = `<img src="${await readFile(file)}" alt="${t('preview')}">`;
});
byId('editCoach').addEventListener('click', renderCoachProfile);
byId('closeCoachDialog').addEventListener('click', () => byId('coachDialog').close());
byId('cancelCoachDialog').addEventListener('click', () => byId('coachDialog').close());
byId('coachForm').addEventListener('submit', saveCoach);
byId('removeCoachImage').addEventListener('click', () => {
  coachImageRemoved = true;
  byId('removeCoachImage').classList.add('hidden');
  byId('coachImagePreview').innerHTML = `<span class="jersey ${kitClass(activeTeam())}">${t('coachAbbr')}</span>`;
});
byId('coachImageUpload').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  coachImageRemoved = false;
  byId('removeCoachImage').classList.add('hidden');
  byId('coachImagePreview').innerHTML = `<img src="${await readFile(file)}" alt="${t('preview')}">`;
});
byId('openTeamDialog').addEventListener('click', () => {
  const defaults = blankTeam();
  byId('teamForm').reset();
  byId('newTeamCrest').value = '';
  byId('newTeamKitPrimary').value = defaults.kit.primary;
  byId('newTeamKitSecondary').value = defaults.kit.secondary;
  byId('newTeamKitNumberColor').value = defaults.kit.numberColor;
  byId('newTeamGrassColor').value = defaults.appearance.grass;
  byId('newTeamAccentColor').value = defaults.appearance.accent;
  renderNewTeamCrestPreview();
  byId('teamDialog').showModal();
});
byId('newTeamCrest').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  byId('newTeamCrestPreview').innerHTML = `<img src="${await readFile(file)}" alt="${t('preview')}">`;
});
[
  ['newTeamKitPrimary', 'primary'],
  ['newTeamKitSecondary', 'secondary'],
  ['newTeamKitNumberColor', 'numberColor'],
].forEach(([id]) =>
  byId(id).addEventListener('input', () => {
    if (!byId('newTeamCrest').files?.[0]) renderNewTeamCrestPreview();
  }),
);
byId('newTeamName').addEventListener('input', () => {
  if (!byId('newTeamCrest').files?.[0]) renderNewTeamCrestPreview();
});
byId('closeTeamDialog').addEventListener('click', () => byId('teamDialog').close());
byId('cancelTeamDialog').addEventListener('click', () => byId('teamDialog').close());
byId('teamForm').addEventListener('submit', createTeam);
byId('closeEditTeamDialog').addEventListener('click', () => byId('editTeamDialog').close());
byId('cancelEditTeamDialog').addEventListener('click', () => byId('editTeamDialog').close());
byId('editTeamForm').addEventListener('submit', saveEditTeam);
byId('removeEditTeamCrest').addEventListener('click', () => {
  editTeamCrestRemoved = true;
  byId('removeEditTeamCrest').classList.add('hidden');
  const team = app.teams.find((entry) => entry.id === byId('editingTeamId').value);
  if (team) renderEditTeamCrestPreview({ ...team, crest: '' });
});
byId('editTeamCrestUpload').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  editTeamCrestRemoved = false;
  byId('removeEditTeamCrest').classList.remove('hidden');
  byId('editTeamCrestPreview').innerHTML = `<img src="${await readFile(file)}" alt="${t('preview')}">`;
});
byId('closeShareTeamDialog').addEventListener('click', () => byId('shareTeamDialog').close());
byId('closeShareTeamDialog2').addEventListener('click', () => byId('shareTeamDialog').close());
byId('shareInviteForm').addEventListener('submit', inviteMemberSubmit);
byId('openInvitesDialog').addEventListener('click', async () => {
  await refreshMyInvites();
  renderInvitesDialog();
  byId('invitesDialog').showModal();
});
byId('closeInvitesDialog').addEventListener('click', () => byId('invitesDialog').close());
byId('closeInvitesDialog2').addEventListener('click', () => byId('invitesDialog').close());
[
  ['editTeamKitPrimary', 'primary'],
  ['editTeamKitSecondary', 'secondary'],
  ['editTeamKitNumberColor', 'numberColor'],
].forEach(([id, key]) =>
  byId(id).addEventListener('input', (event) => {
    const team = app.teams.find((entry) => entry.id === byId('editingTeamId').value);
    if (!team) return;
    team.kit[key] = event.target.value;
    renderEditTeamCrestPreview(team);
    renderAll();
  }),
);
/* Explicit player controls: selection, editing and captain selection work independently of drag gestures. */
function renderPitch() {
  const pitch = byId('pitch');
  pitch.replaceChildren();
  pitch.className = `pitch pat-${activeTeam().appearance.grassPattern || 'lines'}${activeTeam().sport === 'futsal' ? ' sport-futsal' : ''}`;
  pitch.style.setProperty('--line-svg', pitchLinesCssUrl(activeTeam().sport, activeTeam().appearance.lineColor));
  const d = draft(),
    positions = d.formation === 'custom' ? positionsFor(customModeBaseFormation(d)) : positionsFor(d.formation),
    freeMovable = d.formation === 'custom' && !d.positionsLocked;
  d.starters.forEach((id, index) => {
    const player = playerFor(id),
      pos =
        d.formation === 'custom'
          ? player && d.positions[id]
            ? d.positions[id]
            : !player && d.slotPositions[index]
              ? d.slotPositions[index]
              : positions[index]
          : positions[index],
      token = document.createElement('div');
    const isGkSlot = isGoalkeeperSlot('starter', index);
    token.className = `player-token${freeMovable ? '' : ' position-locked'}${selectedSlot.type === 'starter' && selectedSlot.index === index ? ' selected' : ''}`;
    token.style.left = `${pos.x}%`;
    token.style.top = `${pos.y}%`;
    token.dataset.playerSlot = String(index);
    token.tabIndex = 0;
    token.setAttribute('role', 'button');
    token.innerHTML = player
      ? `${playerVisual(player, activeTeam(), '', isGkSlot)}<span class="player-name">${esc(player.name)}</span>${d.captainId === player.id ? '<b class="captain-mark" title="Kapitän">C</b>' : ''}`
      : placeholderJersey(isGkSlot);
    token.addEventListener('click', () => {
      selectSlot('starter', index);
      if (player) renderPlayerProfile(player, index);
      else renderPlayerProfile(null, index);
    });
    token.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectSlot('starter', index);
      }
    });
    if (freeMovable)
      token.addEventListener('pointerdown', (event) => {
        beginMove(event, index);
      });
    if (player) {
      token.draggable = true;
      token.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('application/x-lineup-player', player.id);
        event.dataTransfer.effectAllowed = 'move';
      });
      if (!freeMovable) attachTouchDragSource(token, player.id, 'starter');
    }
    makeDropTarget(token, 'starter', index);
    pitch.append(token);
  });
}
/* ============================================================
   FIREBASE-KONTO (Google + E-Mail-Link)
   Der eigentliche Firebase-Code läuft in firebase-init.js (ES-Modul).
   Hier wird nur auf das Event "lineup-auth-changed" reagiert und
   window.lineupAuth für Login/Logout/E-Mail-Link aufgerufen.
   ============================================================ */
let firebaseUser = null;
// Online/Offline-Status: die App selbst funktioniert dank Service Worker (App-Shell) und
// localStorage (kompletter appState) bereits vollständig offline. Was offline NICHT klappt, ist das
// Schreiben in Firestore (scheduleCloudSave/scheduleSharedTeamsSave unten) - diese Aufrufe schlagen
// dann einfach fehl. Damit offline gespeicherte Änderungen nicht verloren gehen, sondern automatisch
// nachgeholt werden, sobald wieder Internet da ist, merken wir uns hier den Verbindungsstatus und
// stoßen bei "online" sofort einen erneuten Sync-Versuch an (ohne dass der Nutzer selbst nochmal
// etwas ändern muss).
let isOnline = navigator.onLine;
window.addEventListener('offline', () => {
  isOnline = false;
  showToast(t('toastOfflineMode'));
});
window.addEventListener('online', () => {
  isOnline = true;
  showToast(t('toastBackOnline'));
  // Alle Teams neu anstoßen, nicht nur die Firestore-Timer: es kann sein, dass während der Offline-
  // Zeit mehrfach gespeichert wurde und der letzte Versuch bereits (erfolglos) verpuffte, ohne dass
  // seither noch eine neue Änderung einen weiteren Versuch ausgelöst hätte.
  scheduleCloudSave();
  scheduleSharedTeamsSave();
});
function currentAccount() {
  return firebaseUser || readJson(ACCOUNT_KEY);
}
function accountLabel(account) {
  return account?.username || account?.displayName || account?.email || t('login');
}
function accountAvatarText(account) {
  return account?.username
    ? initials(account.username)
    : account?.displayName
      ? initials(account.displayName)
      : account?.email
        ? initials(account.email)
        : t('coachAbbr');
}
// Setzt den Inhalt eines .avatar-Elements: Foto (falls im Konto hinterlegt) als <img>, sonst die
// Initialen als Text. Die Avatar-Größe selbst ist rein per CSS fixiert (siehe .avatar/.avatar-lg),
// damit sie sich nie in Abhängigkeit vom Namen/Text verändert.
function renderAvatarInto(el, account, fallbackText) {
  if (!el) return;
  if (account?.photo) el.innerHTML = `<img src="${account.photo}" alt="${esc(accountLabel(account))}">`;
  else el.textContent = fallbackText;
}
function renderAccount() {
  const account = currentAccount();
  const label = accountLabel(account);
  const detail = account?.email || account?.displayName ? t('profileLabel') : t('coachArea');
  const avatarText = accountAvatarText(account);
  byId('accountName').textContent = label;
  byId('accountDetail').textContent = detail;
  renderAvatarInto(byId('accountAvatar'), account, avatarText);
  byId('openInvitesDialog')?.classList.toggle('hidden', !firebaseUser);
  const mobileName = byId('mobileAccountName'),
    mobileDetail = byId('mobileAccountDetail'),
    mobileAvatar = byId('mobileAccountAvatar');
  if (mobileName) mobileName.textContent = label;
  if (mobileDetail) mobileDetail.textContent = detail;
  renderAvatarInto(mobileAvatar, account, avatarText);
  const loggedInSection = byId('authLoggedInSection'),
    guestSection = byId('authGuestSection');
  const loggedInUsername = byId('authLoggedInUsername'),
    loggedInEmail = byId('authLoggedInEmail'),
    loggedInAvatar = byId('authLoggedInAvatar');
  if (loggedInSection && guestSection) {
    if (account?.email || account?.displayName) {
      loggedInSection.classList.remove('hidden');
      guestSection.classList.add('hidden');
      if (loggedInUsername)
        loggedInUsername.textContent = account.username || account.displayName || account.email || '';
      if (loggedInEmail) loggedInEmail.textContent = account.username ? account.email || '' : '';
      renderAvatarInto(loggedInAvatar, account, avatarText);
    } else {
      loggedInSection.classList.add('hidden');
      guestSection.classList.remove('hidden');
    }
  }
}
window.addEventListener('lineup-auth-changed', async (event) => {
  const detail = event.detail || {};
  if (detail.status === 'ready') {
    const wasLoggedIn = !!firebaseUser;
    const previousUid = firebaseUser?.uid;
    firebaseUser = detail.user;
    if (firebaseUser) {
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify(firebaseUser));
      renderAccount();
      if (!wasLoggedIn) await syncFromCloudOnLogin();
      await maybeHandlePendingInviteLink();
    } else {
      localStorage.removeItem(ACCOUNT_KEY);
      if (wasLoggedIn) {
        logoutCleanup(previousUid);
        showToast(t('toastLoggedOut'));
      } else {
        // Kein Login (auch keins mehr aus einer vorherigen Sitzung, sonst wäre firebaseUser gesetzt):
        // falls beim Start mangels Cloud-Antwort noch keine Mannschaft angelegt wurde (siehe
        // awaitingCloudSync), jetzt eine Gast-Mannschaft anlegen, damit die App nicht leer bleibt.
        if (!app.teams.length) {
          app.teams.push(blankTeam());
          app.activeTeamId = app.teams[0].id;
          renderAll();
        }
        renderAccount();
        if (pendingInviteToken) {
          showToast(t('toastLoginToJoinTeam'));
          byId('accountEmail').value = '';
          byId('authDialog').showModal();
        }
      }
    }
  } else if (detail.status === 'email-link-error') {
    showToast(t('toastEmailLinkFailed'), 'error');
  }
});
// Wird nach jedem bestätigten Login-Status aufgerufen, falls beim Öffnen der Seite ein
// Einladungslink-Token in der URL stand (siehe pendingInviteToken oben): lädt die Metadaten des
// Links und zeigt bei Erfolg den Bestätigungsdialog "Mannschaft beitreten" an.
async function maybeHandlePendingInviteLink() {
  if (!pendingInviteToken || !firebaseUser || !window.lineupAuth) return;
  const token = pendingInviteToken;
  try {
    const info = await window.lineupAuth.getInviteLinkInfo(token);
    if (!info) {
      showToast(t('toastInviteLinkInvalid'), 'error');
      pendingInviteToken = null;
      return;
    }
    byId('joinTeamDialogText').innerHTML =
      `<strong>${esc(info.teamName || '')}</strong> · ${esc(t(ROLE_LABEL_KEY[info.role] || 'roleViewer'))}`;
    byId('confirmJoinTeamButton').onclick = async () => {
      try {
        const result = await window.lineupAuth.joinViaInviteLink(token);
        attachSharedTeamListener(result.teamId, result.role);
        byId('joinTeamDialog').close();
        showToast(t('toastJoinedTeam'));
      } catch (err) {
        console.error('Beitritt über Einladungslink fehlgeschlagen:', err);
        showToast(t('toastInviteLinkFailed'), 'error');
      }
      pendingInviteToken = null;
    };
    byId('joinTeamDialog').showModal();
  } catch (err) {
    console.error('Einladungslink konnte nicht geladen werden:', err);
    showToast(t('toastInviteLinkFailed'), 'error');
    pendingInviteToken = null;
  }
}
function closeJoinTeamDialog() {
  byId('joinTeamDialog').close();
  pendingInviteToken = null;
}
byId('closeJoinTeamDialog').addEventListener('click', closeJoinTeamDialog);
byId('cancelJoinTeamDialog').addEventListener('click', closeJoinTeamDialog);
// Wird beim Abmelden aufgerufen (egal ob über den Abmelden-Button oder anderweitig ausgelöst):
// blendet alle Mannschaften aus, die zum abgemeldeten Konto gehörten. Sie bleiben in der Cloud
// gespeichert und tauchen erst nach dem nächsten Login wieder auf (siehe syncFromCloudOnLogin).
function logoutCleanup(previousUid) {
  sharedTeamUnsubs.forEach((unsub) => unsub());
  sharedTeamUnsubs.clear();
  myInvites = [];
  renderInvitesBadge();
  app.teams = app.teams.filter((team) => (!team.ownerUid || team.ownerUid !== previousUid) && !team.sharedId);
  if (!app.teams.length) app.teams.push(blankTeam());
  if (!app.teams.some((team) => team.id === app.activeTeamId)) app.activeTeamId = app.teams[0].id;
  renderAccount();
  renderAll();
  applyTheme();
  applyStaticTranslations();
}
// Wird einmalig direkt nach dem Login aufgerufen: lädt gespeicherte Mannschaften des Kontos aus der
// Cloud dazu (Gast-Mannschaften bleiben erhalten) und prüft, ob für dieses Konto schon ein
// Benutzername angelegt wurde - falls nicht, muss er jetzt vergeben werden (openUsernameDialog).
async function syncFromCloudOnLogin() {
  if (!window.lineupAuth) return;
  let profile = null;
  try {
    const [cloud, fetchedProfile] = await Promise.all([
      window.lineupAuth.loadCloudData(),
      window.lineupAuth.getUserProfile(),
    ]);
    profile = fetchedProfile;
    if (profile?.username || profile?.photo) {
      if (profile.username) firebaseUser.username = profile.username;
      if (profile.photo) firebaseUser.photo = profile.photo;
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify(firebaseUser));
      renderAccount();
    }
    const guestTeams = app.teams.filter((team) => !team.ownerUid);
    if (cloud && Array.isArray(cloud.teams) && cloud.teams.length) {
      const accountTeams = cloud.teams.map((team) => normalizeTeam({ ...team, ownerUid: firebaseUser.uid }));
      app.theme = cloud.theme || app.theme;
      app.lang = SUPPORTED_LANGS.includes(cloud.lang) ? cloud.lang : app.lang;
      app.teams = [...guestTeams, ...accountTeams];
      app.activeTeamId =
        cloud.activeTeamId && accountTeams.some((team) => team.id === cloud.activeTeamId)
          ? cloud.activeTeamId
          : accountTeams[0].id;
      renderAll();
      applyTheme();
      applyStaticTranslations();
      showToast(t('toastCloudLoaded'));
      cacheAccountTeams();
      syncSharedTeams();
      refreshMyInvites();
    } else {
      // Erstes Login mit diesem Konto und noch keine Cloud-Mannschaften: die aktuell aktive
      // Gast-Mannschaft (falls vorhanden) wird dem neuen Konto zugeordnet, statt bei null zu starten.
      const currentGuestActive = guestTeams.find((team) => team.id === app.activeTeamId);
      if (currentGuestActive) {
        currentGuestActive.ownerUid = firebaseUser.uid;
      } else if (!app.teams.length) {
        // Keine Gast-Mannschaft (mehr) vorhanden, z.B. weil beim Start bewusst auf den Cloud-Sync
        // gewartet wurde (siehe awaitingCloudSync): jetzt eine neue Mannschaft für das Konto anlegen.
        const team = blankTeam();
        team.ownerUid = firebaseUser.uid;
        app.teams.push(team);
        app.activeTeamId = team.id;
      }
      renderAll();
      scheduleCloudSave();
      showToast(t('toastCloudBackupStarted'));
      syncSharedTeams();
      refreshMyInvites();
    }
  } catch (err) {
    console.error('Cloud-Synchronisierung fehlgeschlagen:', err);
    // Offline beim Login/Start: kein echter Fehler, sondern der erwartete Zustand - die App zeigt
    // bereits den lokalen Konto-Cache (siehe cachedAccountTeams oben) bzw. arbeitet mit den zuletzt
    // bekannten Daten weiter. Keinen "fehlgeschlagen"-Toast zeigen, das wirkt sonst wie ein echter
    // Fehler; der normale "toastOfflineMode"/"toastBackOnline"-Hinweis reicht hier aus.
    if (!navigator.onLine) {
      if (!app.teams.length) {
        app.teams.push(blankTeam());
        app.activeTeamId = app.teams[0].id;
        renderAll();
      }
      if (!profile?.username) openUsernameDialog();
      return;
    }
    showToast(t('toastCloudSyncFailed'), 'error');
    // Falls beim Start mangels Cloud-Antwort noch keine Mannschaft angelegt wurde (awaitingCloudSync)
    // und der Cloud-Abruf jetzt fehlschlägt, trotzdem eine lokale Gast-Mannschaft anlegen, damit die
    // App nicht dauerhaft leer bleibt.
    if (!app.teams.length) {
      app.teams.push(blankTeam());
      app.activeTeamId = app.teams[0].id;
      renderAll();
    }
  }
  if (!profile?.username) openUsernameDialog();
}
byId('openAuthDialog').addEventListener('click', () => {
  const account = currentAccount();
  byId('accountEmail').value = account?.email || '';
  renderAccount();
  byId('authDialog').showModal();
});
byId('openAuthDialogMobile')?.addEventListener('click', () => byId('openAuthDialog').click());
byId('closeAuthDialog').addEventListener('click', () => byId('authDialog').close());
byId('cancelAuthDialog').addEventListener('click', () => byId('authDialog').close());
byId('authForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = byId('accountEmail').value.trim();
  if (!email) return;
  if (!window.lineupAuth) {
    showToast(t('toastAuthLoading'), 'error');
    return;
  }
  try {
    await window.lineupAuth.sendEmailLink(email);
    byId('authDialog').close();
    showToast(t('toastEmailLinkSent'));
  } catch (err) {
    console.error('E-Mail-Link-Anmeldung fehlgeschlagen:', err);
    showToast(t('toastEmailLinkFailed'), 'error');
  }
});
byId('authGoogle').addEventListener('click', async () => {
  if (!window.lineupAuth) {
    showToast(t('toastAuthLoading'), 'error');
    return;
  }
  try {
    await window.lineupAuth.signInWithGoogle();
    byId('authDialog').close();
    showToast(t('toastLoggedIn'));
  } catch (err) {
    console.error('Google-Anmeldung fehlgeschlagen:', err);
    showToast(t('toastGoogleLoginFailed'), 'error');
  }
});
async function logoutAccount() {
  if (window.lineupAuth) {
    try {
      // Sicherstellen, dass keine noch nicht in die Cloud geschriebene Änderung verloren geht (siehe
      // Kommentar bei flushCloudSave): erst fertig speichern, dann erst abmelden.
      await flushCloudSave();
      await window.lineupAuth.signOutUser();
    } catch (err) {
      console.error('Abmelden fehlgeschlagen:', err);
    }
  }
  byId('authDialog').close();
  byId('accountSettingsDialog')?.close();
}
byId('authLogout')?.addEventListener('click', logoutAccount);
byId('settingsLogout')?.addEventListener('click', logoutAccount);
/* -------- Konto-Einstellungen (Benutzername ändern) -------- */
function usernameIsValid(value) {
  return value.trim().length >= 2 && value.length <= 24 && value === value.trim();
}
let settingsAvatarRemoved = false;
byId('openAccountSettings')?.addEventListener('click', () => {
  byId('authDialog').close();
  const account = currentAccount();
  settingsAvatarRemoved = false;
  byId('settingsAvatarUpload').value = '';
  byId('settingsUsername').value = account?.username || '';
  byId('settingsEmailDisplay').textContent = account?.email || account?.displayName || '';
  renderAvatarInto(byId('settingsAvatar'), account, accountAvatarText(account));
  byId('removeSettingsAvatar').classList.toggle('hidden', !account?.photo);
  byId('accountSettingsDialog').showModal();
});
byId('closeAccountSettingsDialog')?.addEventListener('click', () => byId('accountSettingsDialog').close());
byId('cancelAccountSettingsDialog')?.addEventListener('click', () => byId('accountSettingsDialog').close());
byId('settingsAvatarUpload')?.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  settingsAvatarRemoved = false;
  byId('settingsAvatar').innerHTML = `<img src="${await readFile(file)}" alt="${t('preview')}">`;
  byId('removeSettingsAvatar').classList.remove('hidden');
});
byId('removeSettingsAvatar')?.addEventListener('click', () => {
  settingsAvatarRemoved = true;
  byId('settingsAvatarUpload').value = '';
  byId('removeSettingsAvatar').classList.add('hidden');
  byId('settingsAvatar').textContent = accountAvatarText(currentAccount());
});
makeImageDropTarget('settingsAvatarDrop', 'settingsAvatarUpload', 'settingsAvatar');
byId('accountSettingsForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const value = byId('settingsUsername').value.trim();
  if (!usernameIsValid(value)) {
    showToast(t('usernameInvalid'), 'error');
    return;
  }
  if (!window.lineupAuth || !firebaseUser) {
    showToast(t('toastAuthLoading'), 'error');
    return;
  }
  try {
    const file = byId('settingsAvatarUpload').files?.[0];
    const photo = file ? await readFile(file) : settingsAvatarRemoved ? '' : firebaseUser.photo || '';
    if (window.lineupAuth.saveProfile) await window.lineupAuth.saveProfile({ username: value, photo });
    else await window.lineupAuth.saveUsername(value);
    firebaseUser.username = value;
    firebaseUser.photo = photo;
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(firebaseUser));
    byId('accountSettingsDialog').close();
    renderAccount();
    showToast(t('toastUsernameSaved'));
  } catch (err) {
    console.error('Benutzername konnte nicht gespeichert werden:', err);
    showToast(t('toastUsernameFailed'), 'error');
  }
});
/* -------- Konto unwiderruflich löschen -------- */
// Öffnet den Bestätigungsdialog. Erfordert getipptes "LÖSCHEN" (bzw. die jeweilige
// Sprachvariante über deleteConfirmWord), damit ein Konto nicht versehentlich durch einen
// einzelnen Klick gelöscht werden kann.
byId('openDeleteAccountDialog')?.addEventListener('click', () => {
  byId('deleteAccountConfirmInput').value = '';
  byId('deleteAccountError').style.display = 'none';
  byId('deleteAccountConfirmInput').placeholder = t('deleteConfirmWord');
  byId('deleteAccountDialog').showModal();
});
byId('closeDeleteAccountDialog')?.addEventListener('click', () => byId('deleteAccountDialog').close());
byId('cancelDeleteAccountDialog')?.addEventListener('click', () => byId('deleteAccountDialog').close());
function deleteConfirmWordMatches(value) {
  return value.trim().toLowerCase() === t('deleteConfirmWord').trim().toLowerCase();
}
byId('deleteAccountForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const errorEl = byId('deleteAccountError');
  const value = byId('deleteAccountConfirmInput').value;
  if (!deleteConfirmWordMatches(value)) {
    errorEl.textContent = t('deleteAccountConfirmMismatch');
    errorEl.style.display = 'block';
    return;
  }
  if (!window.lineupAuth || !firebaseUser) {
    errorEl.textContent = t('toastAuthLoading');
    errorEl.style.display = 'block';
    return;
  }
  const submitButton = byId('confirmDeleteAccountButton');
  submitButton.disabled = true;
  try {
    await window.lineupAuth.deleteAccountCompletely();
    // Alle lokal gespeicherten Spuren des Kontos entfernen (Cloud-Daten sind bereits gelöscht).
    localStorage.removeItem(ACCOUNT_KEY);
    byId('deleteAccountDialog').close();
    byId('accountSettingsDialog')?.close();
    byId('authDialog')?.close();
    showToast(t('toastAccountDeleted'));
  } catch (err) {
    console.error('Konto konnte nicht gelöscht werden:', err);
    if (err?.code === 'auth/requires-recent-login') {
      try {
        await window.lineupAuth.reauthenticateWithGoogle();
        await window.lineupAuth.deleteAccountCompletely();
        localStorage.removeItem(ACCOUNT_KEY);
        byId('deleteAccountDialog').close();
        byId('accountSettingsDialog')?.close();
        byId('authDialog')?.close();
        showToast(t('toastAccountDeleted'));
      } catch (reauthErr) {
        console.error('Erneute Anmeldung zum Löschen fehlgeschlagen:', reauthErr);
        errorEl.textContent = t('deleteAccountReauthFailed');
        errorEl.style.display = 'block';
      }
    } else {
      errorEl.textContent = t('deleteAccountFailed');
      errorEl.style.display = 'block';
    }
  } finally {
    submitButton.disabled = false;
  }
});
/* -------- Pflicht-Dialog: Benutzername nach Kontoerstellung -------- */
function suggestUsername(name) {
  return String(name || '')
    .trim()
    .slice(0, 24);
}
function openUsernameDialog() {
  const input = byId('chooseUsername');
  if (!input) return;
  input.value = suggestUsername(firebaseUser?.displayName || firebaseUser?.email?.split('@')[0]);
  const errorEl = byId('usernameError');
  if (errorEl) errorEl.style.display = 'none';
  byId('usernameDialog').showModal();
}
byId('usernameDialog')?.addEventListener('cancel', (event) => event.preventDefault());
byId('usernameForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const value = byId('chooseUsername').value.trim();
  const errorEl = byId('usernameError');
  if (!usernameIsValid(value)) {
    errorEl.textContent = t('usernameInvalid');
    errorEl.style.display = 'block';
    return;
  }
  if (!window.lineupAuth || !firebaseUser) {
    errorEl.textContent = t('toastAuthLoading');
    errorEl.style.display = 'block';
    return;
  }
  try {
    await window.lineupAuth.saveUsername(value);
    firebaseUser.username = value;
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(firebaseUser));
    byId('usernameDialog').close();
    renderAccount();
    showToast(t('toastUsernameSaved'));
  } catch (err) {
    console.error('Benutzername konnte nicht gespeichert werden:', err);
    errorEl.textContent = t('toastUsernameFailed');
    errorEl.style.display = 'block';
  }
});
function cyclePlayerStatus(player) {
  if (!requirePerm('squad')) return;
  const current = PLAYER_STATUSES.includes(player.status) ? player.status : 'available';
  const next = PLAYER_STATUSES[(PLAYER_STATUSES.indexOf(current) + 1) % PLAYER_STATUSES.length];
  player.status = next;
  renderAll();
  save();
}
function removePlayerFromRoster(id) {
  if (!requirePerm('squad')) return;
  const team = activeTeam(),
    player = team.squad.find((entry) => entry.id === id);
  if (!player) return;
  if (!confirm(`${player.name} ${t('confirmDeletePlayer')}`)) return;
  team.squad = team.squad.filter((entry) => entry.id !== id);
  clearPlayer(id);
  renderAll();
  showToast(t('toastPlayerDeleted'));
}
/* ============================================================
   KADER-TABELLE: Löschen & Spalten-Sortierung
   ============================================================ */
let rosterSort = { column: null, direction: 1 };
const POSITION_ORDER = Object.fromEntries(POSITION_CODES.map((code, index) => [code, index]));
function bestPositionOrder(player) {
  const codes = playerPositions(player);
  if (!codes.length) return 99;
  return Math.min(...codes.map((code) => POSITION_ORDER[code] ?? 99));
}
function sortPlayers(players) {
  if (!rosterSort.column) return players;
  const { column, direction } = rosterSort;
  return [...players].sort((a, b) => {
    let av, bv;
    if (column === 'name') {
      av = (a.name || '').toLowerCase();
      bv = (b.name || '').toLowerCase();
      return av.localeCompare(bv) * direction;
    }
    if (column === 'number') {
      av = a.number ?? Infinity;
      bv = b.number ?? Infinity;
      return (av - bv) * direction;
    }
    if (column === 'year') {
      av = a.year ?? Infinity;
      bv = b.year ?? Infinity;
      return (av - bv) * direction;
    }
    if (column === 'position') {
      av = bestPositionOrder(a);
      bv = bestPositionOrder(b);
      return (av - bv) * direction;
    }
    return 0;
  });
}
function updateRosterSortHeaders() {
  document.querySelectorAll('.roster-table th.sortable').forEach((th) => {
    const arrow = th.querySelector('.sort-arrow');
    if (!arrow) return;
    arrow.textContent = rosterSort.column === th.dataset.sort ? (rosterSort.direction === 1 ? '↑' : '↓') : '';
  });
}
/* ============================================================
   CSV IMPORT/EXPORT DES KADERS
   Spalten: Name, Nummer, Jahrgang, Position (mehrere Positionen mit ";" getrennt).
   Export nutzt ein Semikolon als Feldtrenner (Excel-freundlich in DE-Gebietsschemata) und
   eine UTF-8 BOM, damit Umlaute in Excel korrekt angezeigt werden.
   ============================================================ */
const CSV_DELIMITER = ';';
function csvEscapeField(value = '') {
  const str = String(value ?? '');
  return /[";\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}
// Splittet den kompletten Dateitext in Zeilen und berücksichtigt dabei, dass Zeilenumbrüche
// innerhalb von Anführungszeichen (z.B. mehrzeilige Notizen) nicht als neue Zeile zählen dürfen.
function csvParseRows(text, delimiter = CSV_DELIMITER) {
  const rows = [];
  let row = [],
    field = '',
    inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += char;
    } else if (char === '"') inQuotes = true;
    else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else field += char;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((entries) => entries.some((entry) => entry.trim() !== ''));
}
function exportRosterCsv() {
  const team = activeTeam();
  if (!team.squad.length) {
    showToast(t('toastCsvEmptyExport'), 'error');
    return;
  }
  const header = ['Name', 'Nummer', 'Jahrgang', 'Position'];
  const lines = [header.map(csvEscapeField).join(CSV_DELIMITER)];
  sortPlayers(team.squad).forEach((player) => {
    lines.push(
      [player.name, player.number ?? '', player.year ?? '', playerPositions(player).join(';')]
        .map(csvEscapeField)
        .join(CSV_DELIMITER),
    );
  });
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${team.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'kader'}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast(t('toastCsvExported'));
}
const CSV_HEADER_ALIASES = {
  name: ['name'],
  number: ['nummer', 'rückennummer', 'number', 'no', 'nr'],
  year: ['jahrgang', 'year', 'geburtsjahr'],
  position: ['position', 'positionen', 'positions'],
};
function csvHeaderIndex(headerRow, key) {
  const aliases = CSV_HEADER_ALIASES[key];
  return headerRow.findIndex((cell) => aliases.includes(cell.trim().toLowerCase()));
}
async function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file, 'utf-8');
  });
}
async function importRosterCsvFile(file) {
  if (!requirePerm('squad')) return;
  let text;
  try {
    text = await readTextFile(file);
  } catch (_) {
    showToast(t('toastCsvImportFailed'), 'error');
    return;
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  // Erkennt automatisch, ob die Datei Semikolons oder Kommas als Trenner verwendet
  // (z.B. wenn die CSV nicht von dieser App, sondern von Excel/Google Sheets exportiert wurde).
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const delimiter = firstLine.includes(';') ? ';' : ',';
  const rows = csvParseRows(text, delimiter);
  if (!rows.length) {
    showToast(t('toastCsvImportFailed'), 'error');
    return;
  }
  const header = rows[0];
  const idx = {
    name: csvHeaderIndex(header, 'name'),
    number: csvHeaderIndex(header, 'number'),
    year: csvHeaderIndex(header, 'year'),
    position: csvHeaderIndex(header, 'position'),
  };
  if (idx.name === -1) {
    showToast(t('toastCsvImportFailed'), 'error');
    return;
  }
  const team = activeTeam();
  const usedNumbers = new Set(team.squad.map((player) => player.number).filter((n) => n != null));
  let imported = 0,
    skipped = 0;
  rows.slice(1).forEach((cells) => {
    const name = (cells[idx.name] || '').trim();
    if (!name) return;
    const rawNumber = idx.number !== -1 ? (cells[idx.number] || '').trim() : '';
    const number = rawNumber ? Number(rawNumber) : null;
    if (number && usedNumbers.has(number)) {
      skipped++;
      return;
    }
    const rawYear = idx.year !== -1 ? (cells[idx.year] || '').trim() : '';
    const year = rawYear ? Number(rawYear) : null;
    const positions =
      idx.position !== -1
        ? (cells[idx.position] || '')
            .split(/[;,+/]/)
            .map((code) => code.trim().toUpperCase())
            .filter((code) => POSITION_CODES.includes(code))
        : [];
    team.squad.push({
      id: uid('player'),
      name,
      number,
      year,
      positions,
      notes: '',
      photo: '',
      status: 'available',
    });
    if (number) usedNumbers.add(number);
    imported++;
  });
  if (!imported) {
    showToast(t('toastCsvImportFailed'), 'error');
    return;
  }
  save();
  renderAll();
  const parts = [`${imported} ${t('toastCsvImportedSuffix')}`];
  if (skipped) parts.push(`${skipped} ${t('toastCsvSkippedSuffix')}`);
  showToast(parts.join(' '));
}
byId('csvExportButton')?.addEventListener('click', exportRosterCsv);
byId('csvImportButton')?.addEventListener('click', () => {
  if (!requirePerm('squad')) return;
  byId('csvImportInput').click();
});
byId('csvImportInput')?.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (file) await importRosterCsvFile(file);
});

function renderRoster() {
  const team = activeTeam(),
    filter = byId('playerSearch').value.trim().toLowerCase();
  let players = team.squad.filter((player) =>
    `${player.name} ${player.number ?? ''} ${player.year ?? ''} ${playerPositions(player).join(' ')}`
      .toLowerCase()
      .includes(filter),
  );
  players = sortPlayers(players);
  const list = byId('rosterList');
  list.replaceChildren();
  players.forEach((player) => {
    const row = document.createElement('tr');
    row.className =
      player.status === 'questionable'
        ? 'roster-row-questionable'
        : player.status === 'unavailable'
          ? 'roster-row-unavailable'
          : '';
    const rosterKit = kitForPlayer(player, team);
    row.innerHTML = `<td><div class="roster-player">${player.photo ? `<img class="roster-image" src="${player.photo}" alt="">` : `<span class="roster-jersey kit-${rosterKit.pattern}"${kitStyleAttr(player, team)}>${number(player)}</span>`}<strong>${esc(player.name)}</strong></div></td><td>${player.number ?? '–'}</td><td>${player.year ?? '–'}</td><td>${esc(positionLabel(player))}</td><td><div class="roster-status-cell"><button type="button" class="status-toggle status-${player.status || 'available'}" title="${t(STATUS_LABEL_KEY[player.status] || 'statusAvailable')}">${STATUS_ICON[player.status] || STATUS_ICON.available}</button>${player.notes ? `<span class="roster-notes-text" title="${esc(player.notes)}">${esc(player.notes)}</span>` : ''}</div></td><td><button class="edit-player">${t('editShort')}</button><button class="delete-list-player">${t('deleteShort')}</button></td>`;
    const [editButton, deleteButton] = row.querySelectorAll('.edit-player,.delete-list-player');
    editButton.addEventListener('click', () => openPlayerDialog(player));
    deleteButton.addEventListener('click', () => removePlayerFromRoster(player.id));
    row.querySelector('.status-toggle').addEventListener('click', () => cyclePlayerStatus(player));
    list.append(row);
  });
  byId('rosterCount').textContent = team.squad.length;
  byId('rosterNavCount').textContent = team.squad.length;
  byId('rosterHint').textContent = team.squad.length
    ? `${team.squad.length} ${t('rosterHintCount')}`
    : t('rosterHintEmpty');
  byId('rosterEmpty').classList.toggle('hidden', team.squad.length > 0);
  byId('rosterList').parentElement.classList.toggle('hidden', team.squad.length === 0);
  updateRosterSortHeaders();
}
/* Dropping a player (from the pitch or bench) directly onto a specific row in the "Spieler zuweisen"
   (assign player) list swaps them in one step: the dragged player is looked up by id to find their
   current slot, then the player from the list takes over exactly that slot - instead of the drop
   just unassigning the dragged player with no way to pick which replacement takes their place. */
function dropOnAvailablePlayer(draggedId, targetPlayerId) {
  if (!draggedId || !targetPlayerId || draggedId === targetPlayerId) return;
  const d = draft();
  const starterIndex = d.starters.indexOf(draggedId);
  if (starterIndex !== -1) {
    assignPlayer(targetPlayerId, 'starter', starterIndex);
    return;
  }
  const benchIndex = d.bench.indexOf(draggedId);
  if (benchIndex !== -1) assignPlayer(targetPlayerId, 'bench', benchIndex);
}
function assignPlayer(id, type, index) {
  if (!requirePerm('lineups')) return;
  const d = draft(),
    player = playerFor(id);
  if (!player) return;
  /* Locate the player's current slot (if any) BEFORE mutating anything. Drag & drop moves a player
     who is already on the pitch/bench; the "assign from list" flow moves a player who has no slot yet. */
  const sourceStarterIndex = d.starters.indexOf(id),
    sourceBenchIndex = d.bench.indexOf(id);
  const sourceType = sourceStarterIndex !== -1 ? 'starter' : sourceBenchIndex !== -1 ? 'bench' : null;
  const sourceIndex = sourceStarterIndex !== -1 ? sourceStarterIndex : sourceBenchIndex;
  const destinationArr = type === 'starter' ? d.starters : d.bench;
  const replaced = destinationArr[index];
  if (sourceType === type && sourceIndex === index) {
    selectedSlot = { type, index };
    renderAll();
    return;
  }
  /* Positions are fixed: dragging a player who is already placed on the pitch/bench onto an EMPTY
     pitch spot should do nothing at all (only swapping onto an occupied spot is allowed while
     fixed). Assigning a brand-new player from the roster list into an empty spot is unaffected,
     since that player has no sourceType yet. */
  if (sourceType && !replaced && type === 'starter' && d.positionsLocked) return;
  if (sourceType && replaced && replaced !== id) {
    /* Destination already occupied and the dragged player already has a slot: swap the two players
       instead of deleting whoever was on the destination slot (this is the drag & drop case, e.g.
       bench-to-bench, bench-to-starter, or starter-to-starter).
       Capture each player's CURRENT on-pitch position before either slot array is touched, so the
       displaced player keeps the exact spot it is swapped into instead of snapping back to the
       formation's generic default coordinate for that index. Without this, substituting/assigning
       players could make an unrelated player on the pitch visibly jump to a different spot. */
    const sourceArr = sourceType === 'starter' ? d.starters : d.bench;
    const sourcePos = sourceType === 'starter' ? d.positions[id] : null;
    const destPos = type === 'starter' ? d.positions[replaced] : null;
    sourceArr[sourceIndex] = replaced;
    destinationArr[index] = id;
    if (sourceType === 'starter') {
      const pos =
        sourcePos ||
        (d.formation === 'custom' ? positionsFor(customModeBaseFormation(d)) : positionsFor(d.formation))[sourceIndex];
      d.positions[replaced] = { ...pos };
    } else {
      delete d.positions[replaced];
    }
    if (type === 'starter') {
      const pos =
        destPos ||
        d.slotPositions[index] ||
        (d.formation === 'custom' ? positionsFor(customModeBaseFormation(d)) : positionsFor(d.formation))[index];
      d.positions[id] = { ...pos };
    } else {
      delete d.positions[id];
    }
    selectedSlot = { type, index };
    renderAll();
    return;
  }
  /* clearPlayer replaces the slot arrays. Obtain the destination only afterwards. */
  clearPlayer(id);
  let destination = type === 'starter' ? d.starters : d.bench;
  const currentOccupant = destination[index];
  /* If this slot already held another player, remember their exact current on-pitch position
     BEFORE clearPlayer() deletes it, so the newly assigned player takes over that same visual
     spot instead of jumping elsewhere. */
  const occupantPos = type === 'starter' && currentOccupant ? d.positions[currentOccupant] : null;
  if (currentOccupant) clearPlayer(currentOccupant);
  destination = type === 'starter' ? d.starters : d.bench;
  destination[index] = id;
  if (type === 'starter') {
    const pos =
      occupantPos ||
      d.slotPositions[index] ||
      (d.formation === 'custom' ? positionsFor(customModeBaseFormation(d)) : positionsFor(d.formation))[index];
    d.positions[id] = { ...pos };
  }
  if (type === 'bench') {
    const nextEmpty = d.bench.findIndex((entry) => !entry);
    selectedSlot = { type, index: nextEmpty >= 0 ? nextEmpty : index };
  } else {
    selectedSlot = { type, index };
  }
  renderAll();
}
/* ============================================================
   SPIELER-/TRAINER-PROFILKARTE (rechte Seitenleiste)
   ============================================================ */
var quickSlotForNewPlayer = null;
function renderPlayerProfile(player, slotIndex) {
  const card = byId('playerCard');
  if (!player) {
    card.classList.add('hidden');
    return;
  }
  profileMode = 'player';
  card.classList.remove('hidden');
  const isStarter = selectedSlot.type === 'starter';
  const d = draft();
  const isCaptain = d.captainId === player.id;
  byId('playerProfileName').textContent = player.name;
  byId('playerProfileContent').innerHTML =
    `<div class="player-profile-photo">${playerVisual(player, activeTeam(), '', isStarter && slotIndex === 0)}</div><div class="player-profile-info"><strong>${esc(player.name)}</strong>${player.number ? `<p>${t('nr')} ${player.number}</p>` : ''}${playerPositions(player).length ? `<p>${esc(positionLabel(player))}</p>` : ''}${player.year ? `<p>${t('yr')} ${player.year}</p>` : ''}${player.notes ? `<p class="player-profile-notes" title="${esc(player.notes)}">📝 ${esc(player.notes)}</p>` : ''}</div>`;
  byId('playerEditButton').textContent = t('editPlayer');
  const captainBtn = byId('playerCaptainButton');
  captainBtn.classList.remove('hidden');
  captainBtn.classList.toggle('hidden', !isStarter);
  captainBtn.textContent = isCaptain ? t('removeCaptain') : t('appointCaptain');
  byId('playerRemoveButton').classList.remove('hidden');
}
function renderCoachProfile() {
  profileMode = 'coach';
  selectedSlot = { type: '', index: -1 };
  updateHighlights();
  const card = byId('playerCard');
  card.classList.remove('hidden');
  const team = activeTeam(),
    coach = team.coach;
  byId('playerProfileName').textContent = coach.name || t('trainerFallback');
  byId('playerProfileContent').innerHTML =
    `<div class="player-profile-photo">${coach.photo ? `<img class="player-photo" src="${coach.photo}" alt="${esc(coach.name || t('trainerFallback'))}">` : `<span class="jersey ${kitClass(team)}">${t('coachAbbr')}</span>`}</div><div class="player-profile-info"><strong>${esc(coach.name || t('trainerFallback'))}</strong><p>${t('trainerFallback')}</p></div>`;
  byId('playerEditButton').textContent = t('editCoach');
  byId('playerCaptainButton').classList.add('hidden');
  byId('playerRemoveButton').classList.add('hidden');
}
function renderSelection() {
  const d = draft(),
    hasSelection = selectedSlot.type === 'starter' || selectedSlot.type === 'bench',
    isStarter = selectedSlot.type === 'starter';
  const list = byId('availablePlayers'),
    searchWrap = byId('assignSearchWrap');
  if (!hasSelection) {
    byId('selectionTitle').textContent = t('selectionTitleDefault');
    byId('selectionHelp').textContent = '';
    searchWrap.classList.add('hidden');
    list.replaceChildren();
    list.innerHTML = `<div class="assign-empty"><strong>${t('selectionNoSlotTitle')}</strong><p>${t('selectionNoSlotText')}</p></div>`;
    return;
  }
  const id = (isStarter ? d.starters : d.bench)[selectedSlot.index],
    current = playerFor(id);
  byId('selectionTitle').textContent = isStarter
    ? `${t('starterSlot')} ${selectedSlot.index + 1}`
    : t('benchSlotTitle');
  byId('selectionHelp').textContent = current ? '' : t('chooseFromRoster');
  list.replaceChildren();
  if (!activeTeam().squad.length) {
    searchWrap.classList.add('hidden');
    list.innerHTML = `<div class="assign-empty"><strong>${t('rosterEmptyAssignTitle')}</strong><p>${t('rosterEmptyAssignText')}</p></div>`;
    return;
  }
  searchWrap.classList.remove('hidden');
  const term = assignSearchTerm.trim().toLowerCase();
  const available = activeTeam()
    .squad.filter((player) => !assigned().includes(player.id))
    .filter((player) => player.status !== 'unavailable')
    .filter((player) => player.name.toLowerCase().includes(term))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de', { sensitivity: 'base' }));
  if (
    !activeTeam()
      .squad.filter((player) => !assigned().includes(player.id))
      .filter((player) => player.status !== 'unavailable').length
  ) {
    list.innerHTML = `<div class="assign-empty"><strong>${t('allSelectedTitle')}</strong><p>${t('allSelectedText')}</p></div>`;
    return;
  }
  if (!available.length) {
    list.innerHTML = `<div class="assign-empty"><strong>${t('noPlayerFoundTitle')}</strong><p>${t('noPlayerFoundText')}</p></div>`;
    return;
  }
  available.forEach((player) => {
    const row = document.createElement('div');
    row.className = `available-player${player.status === 'questionable' ? ' available-player-questionable' : ''}`;
    row.draggable = true;
    row.dataset.playerId = player.id;
    const choose = () => {
      const targetType = selectedSlot.type,
        targetIndex = selectedSlot.index;
      assignPlayer(player.id, targetType, targetIndex);
      renderPlayerProfile(player, targetIndex);
    };
    row.innerHTML = `<span class="player-number" style="cursor:pointer;">${number(player) || '–'}</span><span style="cursor:pointer;"><strong>${esc(player.name)}</strong><small>${shortPosition(player)}${player.year ? ` · ${t('yr')} ${player.year}` : ''}</small></span>`;
    row.querySelector('span:nth-child(1)').addEventListener('click', choose);
    row.querySelector('span:nth-child(2)').addEventListener('click', choose);
    row.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('application/x-lineup-player', player.id);
      event.dataTransfer.effectAllowed = 'copy';
    });
    /* Native (mouse) drag & drop: dropping a pitch/bench player directly on this row swaps them in,
       taking priority over the generic "drop anywhere in the card = unassign" handler below. */
    row.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.stopPropagation();
      row.classList.add('drag-over');
    });
    row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
    row.addEventListener('drop', (event) => {
      event.preventDefault();
      event.stopPropagation();
      row.classList.remove('drag-over');
      const draggedId = event.dataTransfer.getData('application/x-lineup-player');
      if (draggedId) dropOnAvailablePlayer(draggedId, player.id);
    });
    attachTouchDragSource(row, player.id, 'available');
    list.append(row);
  });
}
async function savePlayer(event) {
  event.preventDefault();
  if (!requirePerm('squad')) return;
  const team = activeTeam(),
    id = byId('editingPlayerId').value,
    old = id ? team.squad.find((player) => player.id === id) : null,
    rawNumber = byId('newPlayerNumber').value.trim(),
    rawYear = byId('newPlayerYear').value.trim(),
    file = byId('playerImageUpload').files?.[0];
  const selectedPositions = [...document.querySelectorAll('#playerPositionGroup input[type="checkbox"]:checked')].map(
    (input) => input.value,
  );
  const data = {
    name: byId('newPlayerName').value.trim(),
    number: rawNumber ? Number(rawNumber) : null,
    year: rawYear ? Number(rawYear) : null,
    positions: selectedPositions,
    notes: byId('newPlayerNotes').value.trim(),
    photo: file ? await readFile(file) : playerImageRemoved ? '' : old?.photo || '',
  };
  if (!data.name) return;
  if (data.number && team.squad.some((player) => player.number === data.number && player.id !== id)) {
    showToast(t('toastNumberTaken'), 'error');
    return;
  }
  let savedPlayer = old;
  if (savedPlayer) {
    Object.assign(savedPlayer, data);
    delete savedPlayer.position;
  } else {
    savedPlayer = { id: uid('player'), ...data };
    team.squad.push(savedPlayer);
  }
  byId('playerDialog').close();
  if (!old && quickSlotForNewPlayer) {
    const slot = quickSlotForNewPlayer;
    quickSlotForNewPlayer = null;
    assignPlayer(savedPlayer.id, slot.type, slot.index);
    showToast(`${savedPlayer.name} ${t('toastPlayerAssigned')}`);
  } else {
    renderAll();
    showToast(t('toastPlayerSaved'));
  }
  const shownId = (selectedSlot.type === 'starter' ? draft().starters : draft().bench)[selectedSlot.index];
  if (shownId === savedPlayer.id) renderPlayerProfile(savedPlayer, selectedSlot.index);
}
/* ============================================================
   EVENT-LISTENER: Spieler-Zuweisung, Profil-Aktionen, Sortierung
   ============================================================ */
byId('newPlayerForSlot').addEventListener('click', () => {
  quickSlotForNewPlayer = selectedSlot.type === 'starter' || selectedSlot.type === 'bench' ? { ...selectedSlot } : null;
  openPlayerDialog();
});
byId('assignPlayerSearch').addEventListener('input', (event) => {
  assignSearchTerm = event.target.value;
  renderSelection();
});
makeUnassignTarget(byId('selectionCard'));
byId('playerEditButton').addEventListener('click', () => {
  if (profileMode === 'coach') {
    openCoachDialog();
    return;
  }
  const d = draft(),
    isStarter = selectedSlot.type === 'starter',
    id = (isStarter ? d.starters : d.bench)[selectedSlot.index],
    player = playerFor(id);
  if (player) openPlayerDialog(player);
});
byId('playerRemoveButton').addEventListener('click', () => {
  if (profileMode === 'coach') return;
  const d = draft(),
    isStarter = selectedSlot.type === 'starter',
    id = (isStarter ? d.starters : d.bench)[selectedSlot.index];
  if (id) {
    clearPlayer(id);
    renderAll();
    renderPlayerProfile(null, selectedSlot.index);
  }
});
byId('playerCaptainButton').addEventListener('click', () => {
  if (profileMode === 'coach') return;
  const d = draft(),
    isStarter = selectedSlot.type === 'starter';
  if (isStarter) {
    const id = d.starters[selectedSlot.index];
    if (id) {
      d.captainId = d.captainId === id ? null : id;
      renderAll();
      renderPlayerProfile(playerFor(id), selectedSlot.index);
    }
  }
});
document.querySelectorAll('.roster-table th.sortable').forEach((th) => {
  th.addEventListener('click', () => {
    const col = th.dataset.sort;
    if (rosterSort.column === col) rosterSort.direction *= -1;
    else rosterSort = { column: col, direction: 1 };
    renderRoster();
  });
});
/* ============================================================
   APP START
   ============================================================ */
makeImageDropTarget('playerImageDrop', 'playerImageUpload', 'playerImagePreview');
makeImageDropTarget('coachImageDrop', 'coachImageUpload', 'coachImagePreview');
makeImageDropTarget('newTeamCrestDrop', 'newTeamCrest', 'newTeamCrestPreview');
makeImageDropTarget('editTeamCrestDrop', 'editTeamCrestUpload', 'editTeamCrestPreview');
makeImageDropTarget('matchdayCrestDrop', 'matchdayCrestUpload', 'matchdayCrestPreview');
byId('matchdayOpponent').addEventListener('input', (event) => {
  draft().matchday.opponent = event.target.value;
  syncMatchdayToSavedLineup();
  save('matchdayOpponent');
});
byId('matchdayVenue').addEventListener('input', (event) => {
  draft().matchday.venue = event.target.value;
  syncMatchdayToSavedLineup();
  save('matchdayVenue');
});
byId('matchdayDate').addEventListener('input', (event) => {
  draft().matchday.date = event.target.value;
  syncMatchdayToSavedLineup();
  save('matchdayDate');
});
byId('matchdayTime').addEventListener('input', (event) => {
  draft().matchday.time = event.target.value;
  syncMatchdayToSavedLineup();
  save('matchdayTime');
});
byId('matchdayHomeAway').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-value]');
  if (!button) return;
  draft().matchday.homeAway = button.dataset.value;
  syncMatchdayToSavedLineup();
  renderMatchday();
  save();
});
byId('matchdayCrestUpload').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  draft().matchday.opponentCrest = await readFile(file);
  syncMatchdayToSavedLineup();
  renderMatchday();
  save();
});
byId('removeMatchdayCrest').addEventListener('click', () => {
  draft().matchday.opponentCrest = '';
  byId('matchdayCrestUpload').value = '';
  syncMatchdayToSavedLineup();
  renderMatchday();
  save();
});
const exportPngState = { type: 'lineup', format: '1:1' };
function setExportPngSegment(groupId, value, stateKey) {
  exportPngState[stateKey] = value;
  document
    .querySelectorAll(`#${groupId} button`)
    .forEach((button) => button.classList.toggle('active', button.dataset.value === value));
}
function openExportPngDialog(type) {
  setExportPngSegment('exportPngTypeGroup', type, 'type');
  setExportPngSegment('exportPngFormatGroup', exportPngState.format, 'format');
  byId('exportPngDialog').showModal();
}
byId('exportPngTypeGroup').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-value]');
  if (button) setExportPngSegment('exportPngTypeGroup', button.dataset.value, 'type');
});
byId('exportPngFormatGroup').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-value]');
  if (button) setExportPngSegment('exportPngFormatGroup', button.dataset.value, 'format');
});
byId('closeExportPngDialog').addEventListener('click', () => byId('exportPngDialog').close());
byId('cancelExportPngDialog').addEventListener('click', () => byId('exportPngDialog').close());
byId('exportPngForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  byId('exportPngDialog').close();
  if (exportPngState.type === 'matchday') await downloadMatchdayPng(exportPngState.format);
  else await downloadScreenshot(exportPngState.format);
});
byId('exportLineupPng').addEventListener('click', () => openExportPngDialog(exportPngState.type));
/* Mobiles Menü (<=800px): blendet Team-Wechsel/Theme/Sprache/Login, die auf schmalen Viewports sonst
   unerreichbar wären, über einen Auf-/Zuklapp-Button ein (siehe .mobile-menu-toggle/.mobile-menu-panel). */
const mobileMenuToggle = byId('mobileMenuToggle');
if (mobileMenuToggle) {
  const sidebarEl = document.querySelector('.sidebar');
  mobileMenuToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const isOpen = sidebarEl.classList.toggle('mobile-menu-open');
    mobileMenuToggle.setAttribute('aria-expanded', String(isOpen));
  });
  document.addEventListener('click', (event) => {
    if (sidebarEl.classList.contains('mobile-menu-open') && !sidebarEl.contains(event.target)) {
      sidebarEl.classList.remove('mobile-menu-open');
      mobileMenuToggle.setAttribute('aria-expanded', 'false');
    }
  });
  document.querySelectorAll('[data-view]').forEach((button) =>
    button.addEventListener('click', () => {
      sidebarEl.classList.remove('mobile-menu-open');
      mobileMenuToggle.setAttribute('aria-expanded', 'false');
    }),
  );
}
applyTheme();
renderAll();
renderAccount();
restoreView();
// Sicherheitsnetz für awaitingCloudSync (oben): falls "lineup-auth-changed" nie feuert (z.B. weil
// firebase-init.js nicht laden konnte - Netzwerkproblem, Adblocker) und deshalb noch keine Mannschaft
// angelegt wurde, nach kurzer Wartezeit trotzdem eine Gast-Mannschaft anlegen.
if (awaitingCloudSync) {
  setTimeout(() => {
    if (!app.teams.length) {
      app.teams.push(blankTeam());
      app.activeTeamId = app.teams[0].id;
      renderAll();
    }
  }, 4000);
}
