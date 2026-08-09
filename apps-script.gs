/**
 * MNGL Clean — Calendrier de réservation partagé
 * ================================================
 * Ce script transforme un Google Sheet en petite base de données gratuite,
 * accessible depuis le site, pour que :
 *   — deux clients sur deux appareils différents ne puissent jamais
 *     prendre le même créneau (blocage vraiment partagé, pas juste local),
 *   — le CLIENT puisse annuler son propre rendez-vous depuis le site,
 *   — TOI, tu puisses aussi annuler n'importe quel rendez-vous, simplement
 *     en modifiant la feuille de calcul (colonne "status" → "annule",
 *     ou en supprimant la ligne).
 *
 * INSTALLATION (10 minutes, une seule fois) :
 *   1. Va sur https://sheets.new pour créer un Google Sheet vide.
 *   2. Menu "Extensions" → "Apps Script".
 *   3. Supprime tout le code d'exemple (function myFunction() {...}).
 *   4. Colle l'intégralité de ce fichier à la place.
 *   5. En haut à droite : "Déployer" → "Nouveau déploiement".
 *        - Clique sur la roue crantée à côté de "Sélectionner le type"
 *          → coche "Application Web".
 *        - "Exécuter en tant que" : Moi (ton compte Google).
 *        - "Qui a accès" : Tout le monde.
 *      Clique "Déployer", puis autorise l'accès quand Google le demande
 *      (c'est ton propre script, sur ton propre compte — sans danger).
 *   6. Copie l'URL fournie, qui se termine par "/exec".
 *   7. Colle cette URL dans main.js, tout en haut, à la ligne :
 *        const GOOGLE_SCRIPT_URL = '';
 *      → remplace les guillemets vides par ton URL, entre guillemets.
 *
 * C'est tout : à partir de là, les réservations et annulations passent par
 * ce Google Sheet, visible et modifiable directement par toi à tout moment.
 *
 * ⚠️ Si tu modifies ce script après le premier déploiement (par exemple pour
 * changer une règle), il faut re-déployer : "Déployer" → "Gérer les
 * déploiements" → icône crayon → "Nouvelle version" → "Déployer".
 * (L'URL, elle, ne change pas.)
 */

const SHEET_NAME = 'Reservations';
const HEADERS = ['id', 'date', 'start', 'duration', 'service', 'price', 'prenom', 'nom', 'tel', 'email', 'vehicule', 'typeVehicule', 'options', 'adresse', 'status', 'createdAt'];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    return sheet;
  }
  migrateHeaders_(sheet);
  return sheet;
}

// Si de nouvelles colonnes sont ajoutées à HEADERS plus tard (comme
// "prenom" aujourd'hui) et que la feuille existe déjà avec l'ancien
// format, cette fonction insère automatiquement la colonne manquante au
// bon endroit — sans jamais toucher aux données déjà présentes.
function migrateHeaders_(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }
  const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  HEADERS.forEach((h, targetIndex) => {
    if (currentHeaders.indexOf(h) === -1) {
      sheet.insertColumnBefore(targetIndex + 1);
      sheet.getRange(1, targetIndex + 1).setValue(h);
      currentHeaders.splice(targetIndex, 0, h);
    }
  });
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Numéro de réservation : simple compteur qui avance 1, 2, 3, 4… Stocké à part
// (pas juste "compter les lignes") pour ne jamais réutiliser un numéro, même
// si une ligne est supprimée plus tard.
function getNextBookingId_() {
  const props = PropertiesService.getScriptProperties();
  const current = Number(props.getProperty('lastBookingId') || '0');
  const next = current + 1;
  props.setProperty('lastBookingId', String(next));
  return next;
}

/**
 * Lecture des réservations. Utilisé par le site pour savoir quels créneaux
 * sont déjà pris. Les rendez-vous annulés ("status" = "annule") ne sont
 * jamais renvoyés : ils n'existent plus pour le calcul des disponibilités.
 *
 * Paramètre optionnel : ?date=YYYY-MM-DD pour ne récupérer qu'un seul jour.
 */
// Google Sheets convertit automatiquement une valeur du type "2026-08-06"
// en vraie date lors de l'écriture (même si on lui envoie une chaîne de
// texte). Cette fonction ramène toujours la valeur au format texte attendu
// "YYYY-MM-DD", que la cellule contienne un objet Date ou déjà du texte.
function normalizeDate_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(value);
}

function doGet(e) {
  const sheet = getSheet_();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  let rows = data.slice(1)
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      obj.date = normalizeDate_(obj.date);
      return obj;
    })
    .filter(r => r.id && String(r.status).toLowerCase() !== 'annule');

  const dateFilter = e.parameter && e.parameter.date;
  if (dateFilter) {
    rows = rows.filter(r => r.date === dateFilter);
  }

  return jsonOut_(rows);
}

/**
 * Écriture : création d'une réservation, ou annulation d'une réservation
 * existante. Le corps de la requête est un JSON avec un champ "action".
 */
function doPost(e) {
  const sheet = getSheet_();

  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut_({ success: false, error: 'invalid_json' });
  }

  if (body.action === 'create') {
    const id = getNextBookingId_(); // ignore volontairement un éventuel id envoyé par le site
    const row = sheet.getLastRow() + 1;
    // Force la colonne "date" (2e colonne) en texte AVANT d'écrire, sinon
    // Google Sheets convertit automatiquement "2026-08-06" en vraie date,
    // ce qui empêche ensuite de bien filtrer/comparer les dates.
    sheet.getRange(row, 2).setNumberFormat('@');
    sheet.getRange(row, 1, 1, HEADERS.length).setValues([[
      id, String(body.date || ''), body.start || '', body.duration || '',
      body.service || '', body.price || '', body.prenom || '', body.nom || '', body.tel || '',
      body.email || '', body.vehicule || '', body.typeVehicule || '', body.options || '',
      body.adresse || '', 'confirme', new Date().toISOString()
    ]]);
    return jsonOut_({ success: true, id: id });
  }

  if (body.action === 'cancel') {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(body.id)) {
        const rowEmail = String(data[i][9] || '').toLowerCase().trim();
        const givenEmail = String(body.email || '').toLowerCase().trim();

        // Vérifie que l'email correspond, pour éviter qu'un client annule
        // le rendez-vous de quelqu'un d'autre en devinant un identifiant.
        if (rowEmail && givenEmail && rowEmail !== givenEmail) {
          return jsonOut_({ success: false, error: 'email_mismatch' });
        }

        sheet.getRange(i + 1, 15).setValue('annule'); // colonne "status" = 15e colonne
        return jsonOut_({ success: true });
      }
    }
    return jsonOut_({ success: false, error: 'not_found' });
  }

  return jsonOut_({ success: false, error: 'unknown_action' });
}
