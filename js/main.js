// ── SLIDER AVANT / APRÈS ──
document.querySelectorAll('.ba-slider').forEach(slider => {
  const before = slider.querySelector('.ba-before');
  const handle = slider.querySelector('.ba-handle');
  const beforeImg = before.querySelector('img');
  let dragging = false;

  function setPosition(x) {
    const rect = slider.getBoundingClientRect();
    let pct = (x - rect.left) / rect.width;
    pct = Math.min(Math.max(pct, 0.02), 0.98);
    before.style.width = (pct * 100) + '%';
    // Compenser l'image avant pour qu'elle reste alignée à gauche
    if (beforeImg) {
      beforeImg.style.width = (100 / pct) + '%';
      beforeImg.style.minWidth = 'unset';
    }
    handle.style.left = (pct * 100) + '%';
  }

  // Init
  setPosition(slider.getBoundingClientRect().left + slider.getBoundingClientRect().width * 0.5);

  slider.addEventListener('mousedown', e => { dragging = true; setPosition(e.clientX); e.preventDefault(); });
  window.addEventListener('mousemove', e => { if (dragging) setPosition(e.clientX); });
  window.addEventListener('mouseup', () => { dragging = false; });

  // Sur mobile/tactile, seul le petit rond (la poignée) déclenche le glissement.
  // Toucher ailleurs sur la photo laisse le défilement normal de la page se faire.
  handle.style.pointerEvents = 'auto';
  handle.addEventListener('touchstart', e => { dragging = true; setPosition(e.touches[0].clientX); }, { passive: true });
  window.addEventListener('touchmove', e => { if (dragging) setPosition(e.touches[0].clientX); }, { passive: true });
  window.addEventListener('touchend', () => { dragging = false; });
});

// ══════════════════════════════════════════════
// ── ENVOI D'ALERTES EMAIL (sans backend, via FormSubmit.co) ──
// ══════════════════════════════════════════════
// Adresse qui doit recevoir les alertes (réservations + formulaire de contact).
// ⚠️ IMPORTANT : la toute première fois qu'une demande est envoyée à cette adresse,
// FormSubmit envoie un email d'activation à contact@mnglclean.fr avec un lien
// "Activate form" — il faut cliquer une seule fois sur ce lien pour que les
// alertes suivantes arrivent automatiquement, sans aucune action du client.
const ALERT_EMAIL = 'contact@mnglclean.fr';

// Envoie un objet de champs {label: valeur} vers FormSubmit en AJAX (sans quitter la page).
// Retourne { success, status, body } — body contient la réponse brute (utile pour diagnostiquer).
async function sendEmailAlert(subject, fields) {
  try {
    const fd = new FormData();
    fd.append('_subject', subject);
    fd.append('_template', 'table');
    fd.append('_captcha', 'false');
    if (fields['Email']) fd.append('_replyto', fields['Email']);
    Object.entries(fields).forEach(([label, value]) => fd.append(label, value || 'Non précisé'));

    const res = await fetch(`https://formsubmit.co/ajax/${ALERT_EMAIL}`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: fd
    });
    let bodyText = '';
    try { bodyText = await res.clone().text(); } catch (e) { /* ignore */ }
    return { success: res.ok, status: res.status, body: bodyText };
  } catch (e) {
    return { success: false, status: 0, body: String((e && e.message) || e) };
  }
}

// ── FORMULAIRE DE CONTACT → ENVOI AUTOMATIQUE (avec repli mail si hors-ligne) ──
async function handleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById('submit-btn');
  const nom        = form.nom.value;
  const tel        = form.tel.value;
  const email      = form.email.value;
  const prestation = form.prestation.value;
  const vehicule   = form.vehicule.value;
  const message    = form.message.value;

  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Envoi en cours…';

  const result = await sendEmailAlert('Nouvelle demande de devis — MNGL Clean', {
    'Nom': nom,
    'Téléphone': tel,
    'Email': email,
    'Prestation': prestation,
    'Véhicule': vehicule,
    'Message': message
  });

  if (result.success) {
    btn.textContent = 'Message envoyé ✓';
    form.reset();
    setTimeout(() => { btn.disabled = false; btn.textContent = originalLabel; }, 3000);
  } else {
    // Repli : ouvre le client mail du visiteur si l'envoi automatique échoue
    const sujet = encodeURIComponent('Demande de devis — MNGL Clean');
    const corps = encodeURIComponent(
`Bonjour,

Nouvelle demande reçue depuis le site MNGL Clean.

— Nom : ${nom}
— Téléphone : ${tel}
— Email : ${email}
— Prestation : ${prestation}
— Véhicule : ${vehicule}
— Message : ${message}

---
mnglclean.fr`
    );
    window.location.href = `mailto:contact@mnglclean.fr?subject=${sujet}&body=${corps}`;
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

// ── SCROLL REVEAL ──
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.tarif-card, .slider-block, .reseau-card').forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = `opacity 0.6s ease ${i * 0.08}s, transform 0.6s ease ${i * 0.08}s`;
  io.observe(el);
});

// ══════════════════════════════════════════════
// ── STOCKAGE PARTAGÉ DES RÉSERVATIONS (Google Sheets, sans backend à héberger) ──
// ══════════════════════════════════════════════
// Pour que TOI et le CLIENT puissiez tous les deux annuler un rendez-vous (et que
// deux visiteurs sur deux appareils différents ne puissent jamais prendre le même
// créneau), les réservations doivent vivre à un seul endroit partagé plutôt que
// dans le navigateur de chacun.
//
// Marche à suivre (10 minutes, une seule fois) :
//   1. Crée un Google Sheet vide (sheets.new)
//   2. Menu Extensions → Apps Script
//   3. Supprime le code par défaut, colle le contenu du fichier "apps-script.gs"
//      fourni avec le site
//   4. Déployer → Nouveau déploiement → type "Application Web"
//        - Exécuter en tant que : Moi
//        - Qui a accès : Tout le monde
//   5. Autorise l'accès quand Google le demande, puis copie l'URL qui se termine
//      par "/exec"
//   6. Colle cette URL ci-dessous, à la place de la chaîne vide ''
//
// Tant que cette URL n'est pas renseignée, le site continue de fonctionner tout
// seul (mode local, comme avant) : rien n'est cassé, mais l'annulation et le
// blocage des créneaux ne fonctionnent alors que sur l'appareil de la personne
// qui a réservé.
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyti6dxt3DM8_jaMPsASxew825M5TWFrj_ZidIahX0XLjcxBk3PbNmdmqXaygwVf87h/exec';

const BOOKINGS_STORAGE_KEY = 'mngl_bookings';

function hasSharedBackend() {
  return typeof GOOGLE_SCRIPT_URL === 'string' && GOOGLE_SCRIPT_URL.startsWith('https://script.google.com/');
}

// Numéro de réservation local (1, 2, 3, 4…), utilisé tant qu'aucun calendrier
// partagé n'est configuré. Dès que GOOGLE_SCRIPT_URL est renseigné, le numéro
// définitif est celui renvoyé par le calendrier partagé (voir createBookingRemote).
function generateBookingId() {
  let n = 0;
  try { n = Number(localStorage.getItem('mngl_next_local_id') || '0'); } catch (e) { /* ignore */ }
  n += 1;
  try { localStorage.setItem('mngl_next_local_id', String(n)); } catch (e) { /* ignore */ }
  return n;
}

// ══════════════════════════════════════════════
// ── EMAIL DE CONFIRMATION AU CLIENT (avec lien d'annulation en 1 clic) ──
// ══════════════════════════════════════════════
// FormSubmit (utilisé plus bas pour t'alerter) ne peut envoyer qu'à UNE adresse
// fixe et pré-activée — impossible de l'utiliser pour écrire à chaque client.
// Pour envoyer une vraie confirmation au client lui-même, on utilise EmailJS
// (gratuit jusqu'à 200 emails/mois), qui envoie depuis TA boîte mail connectée
// vers n'importe quel destinataire, sans activation à chaque fois.
//
// Marche à suivre (10 minutes, une seule fois) :
//   1. Crée un compte gratuit sur https://www.emailjs.com
//   2. "Email Services" → connecte ta boîte mail (Gmail, Outlook…) → note l'ID
//      du service (ex: service_abc1234)
//   3. "Email Templates" → crée un template avec les variables suivantes dans
//      le corps du message : {{to_name}}, {{service}}, {{date}}, {{heure}},
//      {{booking_id}}, {{cancel_link}} — et {{to_email}} dans le champ "To Email"
//      → note l'ID du template (ex: template_xyz789)
//   4. "Account" → "General" → copie ta clé publique (Public Key)
//   5. Colle les 3 valeurs ci-dessous.
//
// Tant que ces 3 valeurs sont vides, le client ne reçoit pas d'email (il garde
// quand même son numéro de réservation affiché à l'écran pour annuler).
const EMAILJS_PUBLIC_KEY  = '6UPJ5xiWc-BSKbjM1';
const EMAILJS_SERVICE_ID  = 'service_k60t9bj';
const EMAILJS_TEMPLATE_ID = 'template_q2qo32f';

function hasClientEmailBackend() {
  return !!(EMAILJS_PUBLIC_KEY && EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && window.emailjs);
}

if (hasClientEmailBackend()) {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

// Construit le lien qui, ouvert par le client (ou par toi), pré-remplit et
// ouvre directement la fenêtre d'annulation — un seul clic suffit ensuite.
function buildCancelLink(id, email) {
  return `${window.location.origin}${window.location.pathname}?cancel=${encodeURIComponent(id)}&email=${encodeURIComponent(email)}`;
}

// Envoie au client sa confirmation par email, avec le lien d'annulation inclus.
// Retourne { success, error, detail } — ne bloque jamais la réservation elle-même,
// qui reste valable même si cet envoi échoue.
async function sendClientConfirmationEmail(record, dateLabelLong, heureLabel) {
  if (!record.email) return { success: false, error: 'no_email' };
  if (!hasClientEmailBackend()) return { success: false, error: 'not_configured' };
  try {
    const result = await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: record.email,
      to_name: `${record.prenom || ''} ${record.nom || ''}`.trim() || 'Client',
      service: record.service,
      date: dateLabelLong,
      heure: heureLabel,
      booking_id: record.id,
      vehicule_type: record.typeVehicule || '',
      options: record.options || '',
      cancel_link: buildCancelLink(record.id, record.email)
    });
    return { success: true, detail: `${result.status} ${result.text}` };
  } catch (e) {
    console.warn('Email de confirmation au client impossible à envoyer.', e);
    return { success: false, error: 'send_failed', detail: (e && (e.text || e.message)) || String(e) };
  }
}

// ── Repli local (utilisé si aucun backend n'est configuré, ou si le réseau échoue) ──
function getLocalBookings() {
  try { return JSON.parse(localStorage.getItem(BOOKINGS_STORAGE_KEY)) || []; }
  catch (e) { return []; }
}
function saveLocalBooking(record) {
  const all = getLocalBookings();
  all.push(record);
  try { localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(all)); } catch (e) { /* stockage indisponible */ }
}
function removeLocalBooking(id) {
  const all = getLocalBookings().filter(b => b.id !== id);
  try { localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(all)); } catch (e) { /* stockage indisponible */ }
}

// ── Lecture des réservations d'une date donnée (backend partagé si dispo, sinon local) ──
async function fetchBookingsForDate(dateKey) {
  if (hasSharedBackend()) {
    try {
      const res = await fetch(`${GOOGLE_SCRIPT_URL}?date=${encodeURIComponent(dateKey)}`);
      if (res.ok) {
        const rows = await res.json();
        return rows.map(r => ({ ...r, start: Number(r.start), duration: Number(r.duration) }));
      }
    } catch (e) {
      console.warn('Calendrier partagé injoignable, bascule en mode local pour cette lecture.', e);
    }
  }
  return getLocalBookings().filter(b => b.date === dateKey);
}

// ── Création d'une réservation (backend partagé si dispo ; toujours doublée en local) ──
async function createBookingRemote(record) {
  let remoteOK = false;
  if (hasSharedBackend()) {
    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // évite le preflight CORS
        body: JSON.stringify({ action: 'create', ...record })
      });
      const out = await res.json();
      remoteOK = !!out.success;
      if (remoteOK && out.id) record.id = out.id; // remplace le numéro local par le numéro officiel partagé
    } catch (e) {
      console.warn('Calendrier partagé injoignable, la réservation reste enregistrée localement.', e);
    }
  }
  saveLocalBooking(record); // filet de sécurité, dans tous les cas
  return hasSharedBackend() ? remoteOK : true;
}

// ── Annulation d'une réservation, par le client ou par toi ──
// Retourne { success: true } ou { success: false, error: 'not_found' | 'email_mismatch' | 'network' }
async function cancelBookingRemote(id, email) {
  if (hasSharedBackend()) {
    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'cancel', id, email })
      });
      const out = await res.json();
      if (out.success) { removeLocalBooking(id); return { success: true }; }
      return { success: false, error: out.error || 'unknown' };
    } catch (e) {
      return { success: false, error: 'network' };
    }
  }

  // Mode local uniquement : on ne peut annuler que depuis l'appareil qui a réservé
  const found = getLocalBookings().find(b => b.id === id);
  if (!found) return { success: false, error: 'not_found' };
  if (found.email && email && String(found.email).toLowerCase().trim() !== String(email).toLowerCase().trim()) {
    return { success: false, error: 'email_mismatch' };
  }
  removeLocalBooking(id);
  return { success: true };
}

// ══════════════════════════════════════════════
// ── SYSTÈME DE RÉSERVATION (calendrier + créneaux) ──
// ══════════════════════════════════════════════
(function () {

  const OPEN_MIN   = 8 * 60;   // 8h00
  const CLOSE_MIN  = 19 * 60;  // 19h00 — dernier créneau réservable (la prestation peut se terminer après)
  const SLOT_STEP  = 30;       // granularité des créneaux, en minutes

  // Marge de sécurité appliquée APRÈS chaque prestation (retard, finition un peu
  // plus longue, etc.). Le reste de la journée n'est PAS impacté : seul le créneau
  // réellement pris + cette marge est bloqué, tout le reste reste réservable.
  // Exemple avec 60 min de marge : un "Complet" (4h) démarré à 10h bloque
  // jusqu'à 15h (10h + 4h + 1h) — 15h et après restent libres.
  const MARGE_APRES_RDV_MIN = 90; // ← marge de trajet après chaque rendez-vous
  function getBufferMinutes() {
    return MARGE_APRES_RDV_MIN;
  }
  const MONTHS_FR  = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const MAX_MONTHS_AHEAD = 3;

  const overlay   = document.getElementById('booking-overlay');
  if (!overlay) return; // sécurité si le markup n'est pas présent

  const modal     = overlay.querySelector('.booking-modal');
  const closeBtn  = document.getElementById('booking-close');
  const backBtn   = document.getElementById('booking-back');
  const nextBtn   = document.getElementById('booking-next');
  const progressSteps = Array.from(overlay.querySelectorAll('.bp-step'));
  const panels    = Array.from(overlay.querySelectorAll('.booking-panel'));

  const calLabel  = document.getElementById('cal-label');
  const calGrid   = document.getElementById('cal-grid');
  const calPrev   = document.getElementById('cal-prev');
  const calNext   = document.getElementById('cal-next');

  const slotGrid  = document.getElementById('slot-grid');
  const slotDate  = document.getElementById('slot-date');
  const slotEmpty = document.getElementById('slot-empty');

  const recapBox  = document.getElementById('booking-recap');
  const form      = document.getElementById('booking-form');

  const confirmText    = document.getElementById('confirm-text');
  const confirmIcsBtn  = document.getElementById('confirm-ics');
  const confirmRestart = document.getElementById('confirm-restart');

  let state = {
    step: 1,
    service: null, price: null, duration: null,
    viewDate: startOfMonth(new Date()),
    selectedDate: null,   // Date object (jour choisi, sans heure)
    dateKey: null,        // 'YYYY-MM-DD'
    slotStart: null,      // minutes depuis minuit
    slotLabel: null,
    lastBooking: null
  };

  // ── Helpers ──
  function pad(n) { return String(n).padStart(2, '0'); }
  function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function isSameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function minutesToLabel(min) {
    const h = Math.floor(min / 60), m = min % 60;
    return m === 0 ? `${h}h` : `${h}h${pad(m)}`;
  }
  function getBookings() {
    // conservé pour compatibilité ; utilise désormais le repli local partagé
    return getLocalBookings();
  }

  // ── Ouverture / fermeture ──
  window.openBooking = function (service) {
    resetState();
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    if (service) {
      const card = overlay.querySelector(`.bsc[data-service="${service}"]`);
      if (card) selectService(card);
      goToStep(1); // le client peut toujours changer de formule avant de continuer
    } else {
      goToStep(1);
    }
  };

  window.closeBooking = function () {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  closeBtn.addEventListener('click', closeBooking);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeBooking(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeBooking(); });

  function resetState() {
    state = {
      step: 1,
      service: null, basePrice: null, price: null, baseDuration: null, duration: null,
      vehicleType: null, vehicleSupplement: 0, options: {},
      viewDate: startOfMonth(new Date()),
      selectedDate: null,
      dateKey: null,
      slotStart: null,
      slotLabel: null,
      lastBooking: null
    };
    overlay.querySelectorAll('.bsc.is-selected').forEach(el => el.classList.remove('is-selected'));
    overlay.querySelectorAll('.veh-btn.is-selected').forEach(el => el.classList.remove('is-selected'));
    overlay.querySelectorAll('.opt-btn.is-selected').forEach(el => el.classList.remove('is-selected'));
    if (priceTotalEl) priceTotalEl.textContent = '';
    if (form) form.reset();
  }

  // ── Navigation entre étapes ──
  function goToStep(n) {
    state.step = n;
    panels.forEach(p => p.classList.toggle('is-active', Number(p.dataset.panel) === n));
    progressSteps.forEach(s => {
      const sn = Number(s.dataset.step);
      s.classList.toggle('is-active', sn === n);
      s.classList.toggle('is-done', sn < n);
    });

    if (n === 2) renderCalendar();
    if (n === 3) renderSlots();
    if (n === 4) renderRecap();

    updateNavUI();
  }

  function updateNavUI() {
    backBtn.style.display = (state.step === 1 || state.step === 5) ? 'none' : 'inline-block';
    nextBtn.style.display = (state.step === 5) ? 'none' : 'inline-block';
    nextBtn.textContent = state.step === 4 ? 'Confirmer la réservation' : 'Continuer';
    nextBtn.disabled = !isStepValid(state.step);
    if (priceTotalEl) priceTotalEl.style.display = (state.step === 1 && state.basePrice) ? '' : 'none';
  }

  function isStepValid(n) {
    if (n === 1) {
      if (!state.service) return false;
      if (!state.vehicleType) return false;
      return true;
    }
    if (n === 2) return !!state.dateKey;
    if (n === 3) return state.slotStart !== null;
    if (n === 4) return form ? form.checkValidity() : true;
    return true;
  }

  backBtn.addEventListener('click', () => { if (state.step > 1) goToStep(state.step - 1); });

  nextBtn.addEventListener('click', () => {
    if (!isStepValid(state.step)) return;
    if (state.step < 4) {
      goToStep(state.step + 1);
    } else if (state.step === 4) {
      confirmBooking();
    }
  });

  // ── ÉTAPE 1 : Formule ──
  const bookingExtras      = document.getElementById('booking-extras');
  const vehicleOptionsWrap = document.getElementById('vehicle-options');
  const bookingOptionsField = document.getElementById('booking-options-field');
  const bookingOptionsWrap = document.getElementById('booking-options');
  const priceTotalEl       = document.getElementById('booking-total-nav');

  overlay.querySelectorAll('.bsc').forEach(card => {
    card.addEventListener('click', () => { selectService(card); updateNavUI(); });
  });

  function selectService(card) {
    overlay.querySelectorAll('.bsc').forEach(c => c.classList.remove('is-selected'));
    card.classList.add('is-selected');
    state.service   = card.dataset.service;
    state.basePrice = Number(card.dataset.price);
    state.baseDuration = Number(card.dataset.duration);
    state.duration  = state.baseDuration;

    // Réinitialise véhicule + options à chaque changement de formule
    state.vehicleType = null;
    state.vehicleSupplement = 0;
    state.options = {};
    if (vehicleOptionsWrap) vehicleOptionsWrap.querySelectorAll('.veh-btn').forEach(b => b.classList.remove('is-selected'));
    if (bookingOptionsWrap) bookingOptionsWrap.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('is-selected'));

    recalcPrice();
  }

  function recalcPrice() {
    const optionsTotal = Object.values(state.options || {}).reduce((sum, o) => sum + (o.supplement || 0), 0);
    const optionsDuration = Object.values(state.options || {}).reduce((sum, o) => sum + (o.duration || 0), 0);
    state.price = (state.basePrice || 0) + (state.vehicleSupplement || 0) + optionsTotal;
    state.duration = (state.baseDuration || 0) + optionsDuration;
    if (priceTotalEl) {
      priceTotalEl.textContent = state.basePrice
        ? `Total estimé : ${state.price}€ · ≈ ${minutesToLabel(state.duration)}`
        : '';
    }
  }

  if (vehicleOptionsWrap) {
    vehicleOptionsWrap.querySelectorAll('.veh-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        vehicleOptionsWrap.querySelectorAll('.veh-btn').forEach(b => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        state.vehicleType = btn.dataset.vehicle;
        state.vehicleSupplement = Number(btn.dataset.supplement) || 0;
        recalcPrice();
        updateNavUI();
      });
    });
  }

  if (bookingOptionsWrap) {
    bookingOptionsWrap.querySelectorAll('.opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.option;
        const isSelected = btn.classList.toggle('is-selected');
        if (isSelected) {
          state.options[key] = {
            supplement: Number(btn.dataset.supplement) || 0,
            duration: Number(btn.dataset.duration) || 0
          };
        } else {
          delete state.options[key];
        }
        recalcPrice();
      });
    });
  }

  // ── ÉTAPE 2 : Calendrier ──
  function renderCalendar() {
    const view = state.viewDate;
    calLabel.textContent = `${MONTHS_FR[view.getMonth()]} ${view.getFullYear()}`;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const firstOfMonth = new Date(view.getFullYear(), view.getMonth(), 1);
    // Lundi = 0 ... Dimanche = 6
    const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();

    const minMonth = startOfMonth(new Date());
    const maxMonth = new Date(minMonth.getFullYear(), minMonth.getMonth() + MAX_MONTHS_AHEAD, 1);
    calPrev.disabled = (view.getFullYear() === minMonth.getFullYear() && view.getMonth() === minMonth.getMonth());
    calNext.disabled = (view.getFullYear() === maxMonth.getFullYear() && view.getMonth() === maxMonth.getMonth());

    calGrid.innerHTML = '';

    for (let i = 0; i < firstWeekday; i++) {
      const empty = document.createElement('span');
      empty.className = 'cal-day is-empty';
      calGrid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(view.getFullYear(), view.getMonth(), d);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cal-day';
      btn.textContent = d;

      const isSunday = dayDate.getDay() === 0;
      const isPast = dayDate < today;

      if (isSunday || isPast) {
        btn.disabled = true;
      } else {
        btn.addEventListener('click', () => {
          calGrid.querySelectorAll('.cal-day.is-selected').forEach(c => c.classList.remove('is-selected'));
          btn.classList.add('is-selected');
          state.selectedDate = dayDate;
          state.dateKey = dateKey(dayDate);
          state.slotStart = null;
          state.slotLabel = null;
          updateNavUI();
        });
      }

      if (isSameDay(dayDate, today)) btn.classList.add('is-today');
      if (state.dateKey && dateKey(dayDate) === state.dateKey) btn.classList.add('is-selected');

      calGrid.appendChild(btn);
    }
  }

  calPrev.addEventListener('click', () => {
    state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() - 1, 1);
    renderCalendar();
  });
  calNext.addEventListener('click', () => {
    state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() + 1, 1);
    renderCalendar();
  });

  // ── ÉTAPE 3 : Créneaux ──
  let slotsRequestSeq = 0;
  async function renderSlots() {
    const d = state.selectedDate;
    slotDate.textContent = d ? `${['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()].toLowerCase()}` : '';

    slotEmpty.hidden = true;
    slotGrid.innerHTML = '';
    if (!d || !state.duration) return;

    slotGrid.innerHTML = '<div class="slot-loading"><span></span><span></span><span></span></div>';

    const requestId = ++slotsRequestSeq;
    const bookings = await fetchBookingsForDate(state.dateKey);
    if (requestId !== slotsRequestSeq) return; // l'utilisateur a changé de date entre-temps

    slotGrid.innerHTML = '';

    const now = new Date();
    const isToday = isSameDay(d, now);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    let anySlot = false;

    for (let start = OPEN_MIN; start <= CLOSE_MIN; start += SLOT_STEP) {
      if (isToday && start < nowMinutes + 30) continue; // marge de 30 min avant un créneau du jour même

      const end = start + state.duration;
      const overlaps = bookings.some(b => {
        const bufferedEnd = b.start + b.duration + getBufferMinutes();
        return start < bufferedEnd && b.start < end;
      });
      if (overlaps) continue;

      anySlot = true;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot-btn';
      btn.textContent = minutesToLabel(start);
      if (state.slotStart === start) btn.classList.add('is-selected');

      btn.addEventListener('click', () => {
        slotGrid.querySelectorAll('.slot-btn.is-selected').forEach(b => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        state.slotStart = start;
        state.slotLabel = minutesToLabel(start);
        updateNavUI();
      });

      slotGrid.appendChild(btn);
    }

    slotEmpty.hidden = anySlot;
  }

  // ── ÉTAPE 4 : Récapitulatif + formulaire ──
  function renderRecap() {
    const d = state.selectedDate;
    const dateLabel = d ? `${['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()].toLowerCase()} ${d.getFullYear()}` : '';
    const optionsLabel = Object.keys(state.options || {}).length ? Object.keys(state.options).join(', ') : null;

    const rows = [
      { label: 'Prestation', value: state.service },
      { label: 'Type de véhicule', value: state.vehicleType },
      optionsLabel ? { label: 'Options', value: optionsLabel } : null,
      { label: 'Date', value: `${dateLabel} à ${state.slotLabel}` },
      { label: 'Durée estimée', value: minutesToLabel(state.duration) },
      { label: 'Total estimé', value: `${state.price}€`, total: true }
    ].filter(Boolean);

    recapBox.innerHTML = rows.map(r => `
      <div class="recap-row${r.total ? ' recap-row-total' : ''}">
        <span class="recap-row-label">${r.label}</span>
        <span class="recap-row-value">${r.value}</span>
      </div>
    `).join('');
  }

  if (form) {
    form.addEventListener('input', updateNavUI);
  }

  // ── CONFIRMATION ──
  async function confirmBooking() {
    const data = new FormData(form);
    const prenom   = data.get('prenom')   || '';
    const nom      = data.get('nom')      || '';
    const tel      = data.get('tel')      || '';
    const email    = data.get('email')    || '';
    const vehicule = data.get('vehicule') || '';
    const adresse  = data.get('adresse')  || '';
    const nomComplet = `${prenom} ${nom}`.trim();

    const optionsLabel = Object.entries(state.options || {})
      .map(([name, o]) => `${name} (+${o.supplement}€)`)
      .join(', ');

    const record = {
      id: generateBookingId(),
      date: state.dateKey,
      start: state.slotStart,
      duration: state.duration,
      service: state.service,
      price: state.price,
      prenom, nom, tel, email, vehicule, adresse,
      typeVehicule: state.vehicleType
        ? `${state.vehicleType}${state.vehicleSupplement ? ` (+${state.vehicleSupplement}€)` : ''}`
        : '',
      options: optionsLabel,
      createdAt: new Date().toISOString()
    };

    const d = state.selectedDate;
    const dateLabelLong = `${['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;

    nextBtn.disabled = true;
    nextBtn.textContent = 'Enregistrement…';

    await createBookingRemote(record); // bloque le créneau (partagé si configuré, sinon localement)
    state.lastBooking = record;

    const cancelLink = buildCancelLink(record.id, email);

    nextBtn.textContent = 'Envoi de la demande…';

    const [alertResult, clientResult] = await Promise.all([
      sendEmailAlert(`Nouvelle réservation — ${state.service} le ${dateLabelLong}`, {
        'Numéro de réservation': record.id,
        'Formule': `${state.service} (à partir de ${state.basePrice}€)`,
        'Date souhaitée': dateLabelLong,
        'Heure souhaitée': state.slotLabel,
        'Durée estimée': minutesToLabel(state.duration),
        'Prénom': prenom,
        'Nom': nom,
        'Téléphone': tel,
        'Email': email,
        'Véhicule': vehicule,
        'Type de véhicule': record.typeVehicule || '—',
        'Options': optionsLabel || 'Aucune',
        'Prix total estimé': `${state.price}€`,
        "Adresse d'intervention": adresse,
        '🔗 Annuler ce rendez-vous (1 clic)': cancelLink
      }),
      sendClientConfirmationEmail(record, dateLabelLong, state.slotLabel)
    ]);

    if (alertResult.success) {
      confirmText.textContent = clientResult.success
        ? `${nomComplet || 'Votre rendez-vous'} — formule ${state.service}, le ${dateLabelLong} à ${state.slotLabel}. Un email de confirmation vient de vous être envoyé (avec un lien pour annuler si besoin), et notre équipe a été alertée.`
        : `${nomComplet || 'Votre rendez-vous'} — formule ${state.service}, le ${dateLabelLong} à ${state.slotLabel}. Notre équipe a été alertée automatiquement par email et vous recontacte rapidement pour confirmer l'intervention.`;
    } else {
      // Repli : ouvre le client mail du visiteur si l'alerte automatique échoue (ex: hors-ligne)
      confirmText.textContent = `${nomComplet || 'Votre rendez-vous'} — formule ${state.service}, le ${dateLabelLong} à ${state.slotLabel}. L'alerte automatique n'a pas pu être envoyée (connexion indisponible) : un email de confirmation va s'ouvrir dans votre messagerie, merci de l'envoyer, ou appelez-nous directement au +33 6 71 67 97 28.`;

      const sujet = encodeURIComponent('Nouvelle réservation — MNGL Clean');
      const corps = encodeURIComponent(
`Bonjour,

Nouvelle demande de rendez-vous reçue depuis le site MNGL Clean.

— Numéro de réservation : ${record.id}
— Formule : ${state.service} (à partir de ${state.basePrice}€, total estimé ${state.price}€)
— Date souhaitée : ${dateLabelLong}
— Heure souhaitée : ${state.slotLabel}
— Prénom : ${prenom}
— Nom : ${nom}
— Téléphone : ${tel}
— Email : ${email}
— Véhicule : ${vehicule}
— Type de véhicule : ${record.typeVehicule || '—'}
— Options : ${optionsLabel || 'Aucune'}
— Adresse d'intervention : ${adresse}

---
mnglclean.fr`
      );
      window.location.href = `mailto:contact@mnglclean.fr?subject=${sujet}&body=${corps}`;
    }

    const confirmIdValue = document.getElementById('confirm-id-value');
    if (confirmIdValue) confirmIdValue.textContent = record.id;

    goToStep(5);
  }

  // ── Fichier .ics (ajout à un calendrier) ──
  confirmIcsBtn.addEventListener('click', () => {
    const b = state.lastBooking;
    if (!b) return;

    const [y, mo, da] = b.date.split('-').map(Number);
    const startDate = new Date(y, mo - 1, da, Math.floor(b.start / 60), b.start % 60);
    const endDate = new Date(startDate.getTime() + b.duration * 60000);

    function toICSDate(dt) {
      return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
    }

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MNGL Clean//Reservation//FR',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@mnglclean.fr`,
      `DTSTAMP:${toICSDate(new Date())}`,
      `DTSTART:${toICSDate(startDate)}`,
      `DTEND:${toICSDate(endDate)}`,
      `SUMMARY:MNGL Clean — Formule ${b.service}`,
      `DESCRIPTION:Rendez-vous MNGL Clean — prestation "${b.service}"${b.typeVehicule ? ' (' + b.typeVehicule + ')' : ''}${b.options ? ' — options : ' + b.options : ''}. Numéro de réservation : ${b.id || ''}.`,
      'LOCATION:MNGL Clean — adresse d\'intervention indiquée à la réservation',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rdv-mngl-clean.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  const confirmIdCopyBtn = document.getElementById('confirm-id-copy');
  if (confirmIdCopyBtn) {
    confirmIdCopyBtn.addEventListener('click', async () => {
      const id = state.lastBooking ? state.lastBooking.id : '';
      if (!id) return;
      try {
        await navigator.clipboard.writeText(id);
        const original = confirmIdCopyBtn.textContent;
        confirmIdCopyBtn.textContent = 'Copié ✓';
        setTimeout(() => { confirmIdCopyBtn.textContent = original; }, 2000);
      } catch (e) { /* presse-papiers indisponible, l'utilisateur peut sélectionner le texte manuellement */ }
    });
  }

  confirmRestart.addEventListener('click', () => {
    resetState();
    goToStep(1);
  });

})();

// ══════════════════════════════════════════════
// ── DEVIS SUR DEMANDE ──
// ══════════════════════════════════════════════
(function () {
  const devisOverlay = document.getElementById('devis-overlay');
  if (!devisOverlay) return;

  const devisClose = document.getElementById('devis-close');
  const devisForm  = document.getElementById('devis-form');

  window.openDevis = function () {
    devisOverlay.classList.add('is-open');
    devisOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (devisForm) devisForm.reset();
  };

  window.closeDevis = function () {
    devisOverlay.classList.remove('is-open');
    devisOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  devisClose.addEventListener('click', closeDevis);
  devisOverlay.addEventListener('click', e => { if (e.target === devisOverlay) closeDevis(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && devisOverlay.classList.contains('is-open')) closeDevis(); });
})();

// ══════════════════════════════════════════════
// ── ANNULATION D'UN RENDEZ-VOUS (par le client, ou par toi) ──
// ══════════════════════════════════════════════
(function () {
  const cancelOverlay = document.getElementById('cancel-overlay');
  if (!cancelOverlay) return;

  const cancelClose     = document.getElementById('cancel-close');
  const cancelForm      = document.getElementById('cancel-form');
  const cancelMessage   = document.getElementById('cancel-message');
  const cancelSubmitBtn = document.getElementById('cancel-submit');

  window.openCancel = function () {
    cancelOverlay.classList.add('is-open');
    cancelOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    cancelMessage.textContent = '';
    cancelMessage.classList.remove('is-success', 'is-error');
    if (cancelForm) cancelForm.reset();
  };

  window.closeCancel = function () {
    cancelOverlay.classList.remove('is-open');
    cancelOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  cancelClose.addEventListener('click', closeCancel);
  cancelOverlay.addEventListener('click', e => { if (e.target === cancelOverlay) closeCancel(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && cancelOverlay.classList.contains('is-open')) closeCancel(); });

  const CANCEL_ERROR_MESSAGES = {
    not_found: "Aucune réservation ne correspond à ce numéro.",
    email_mismatch: "Cet email ne correspond pas à celui utilisé lors de la réservation.",
    network: "Connexion impossible pour le moment — réessaie dans un instant."
  };

  cancelForm.addEventListener('submit', async e => {
    e.preventDefault();
    const id    = cancelForm.id.value.trim();
    const email = cancelForm.email.value.trim();
    if (!id || !email) return;

    const originalLabel = cancelSubmitBtn.textContent;
    cancelSubmitBtn.disabled = true;
    cancelSubmitBtn.textContent = 'Annulation en cours…';
    cancelMessage.textContent = '';
    cancelMessage.classList.remove('is-success', 'is-error');

    const result = await cancelBookingRemote(id, email);

    if (result.success) {
      cancelMessage.textContent = 'Rendez-vous annulé — le créneau est de nouveau disponible.';
      cancelMessage.classList.add('is-success');
      cancelForm.reset();

      // Alerte automatique à l'équipe, pour suivi
      sendEmailAlert('Réservation annulée — MNGL Clean', {
        'Numéro de réservation': id,
        'Email du client': email
      });
    } else {
      cancelMessage.textContent = CANCEL_ERROR_MESSAGES[result.error] || "Impossible d'annuler cette réservation.";
      cancelMessage.classList.add('is-error');
    }

    cancelSubmitBtn.disabled = false;
    cancelSubmitBtn.textContent = originalLabel;
  });
})();

// ══════════════════════════════════════════════
// ── OUVERTURE DEPUIS UN LIEN D'EMAIL (?cancel=ID&email=EMAIL) ──
// ══════════════════════════════════════════════
// Ce lien est inclus à la fois dans l'email de confirmation du CLIENT et dans
// TON email d'alerte — cliquer dessus ouvre directement la fenêtre d'annulation,
// pré-remplie, il ne reste plus qu'à cliquer une fois sur "Annuler ce rendez-vous".
(function () {
  const params = new URLSearchParams(window.location.search);
  const cancelId = params.get('cancel');
  const cancelEmail = params.get('email');
  if (!cancelId || !cancelEmail || typeof window.openCancel !== 'function') return;

  window.openCancel();
  const form = document.getElementById('cancel-form');
  if (form) {
    form.id.value = cancelId;
    form.email.value = cancelEmail;
  }
})();

// ══════════════════════════════════════════════
// ── DIAGNOSTIC EMAIL (pour voir exactement ce qui bloque) ──
// ══════════════════════════════════════════════
(function () {
  const overlay = document.getElementById('emailtest-overlay');
  if (!overlay) return;

  const closeBtn   = document.getElementById('emailtest-close');
  const runBtn     = document.getElementById('emailtest-run');
  const addressInp = document.getElementById('emailtest-address');
  const results    = document.getElementById('emailtest-results');

  window.openEmailTest = function () {
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    results.innerHTML = '';
  };
  window.closeEmailTest = function () {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  closeBtn.addEventListener('click', closeEmailTest);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeEmailTest(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeEmailTest(); });

  function renderResult(title, ok, statusLine, detail) {
    const box = document.createElement('div');
    box.className = 'et-result ' + (ok ? 'is-ok' : 'is-fail');
    box.innerHTML = `
      <div class="et-result-title">${title}</div>
      <div class="et-result-status">${ok ? '✓ Envoyé avec succès' : '✗ Échec'} — ${statusLine}</div>
      ${detail ? `<div class="et-result-detail">${detail}</div>` : ''}
    `;
    results.appendChild(box);
  }

  runBtn.addEventListener('click', async () => {
    results.innerHTML = '<p class="booking-note">Test en cours…</p>';
    runBtn.disabled = true;

    const testEmail = addressInp.value.trim();

    // ── Test 1 : alerte vers toi (FormSubmit) ──
    const alertResult = await sendEmailAlert('🧪 Test de configuration — MNGL Clean', {
      'Ceci est': 'un email de test envoyé depuis le panneau de diagnostic du site',
      'Heure du test': new Date().toLocaleString('fr-FR')
    });

    // ── Test 2 : confirmation client (EmailJS) ──
    let clientResult;
    if (!testEmail) {
      clientResult = { success: false, error: 'no_email', detail: 'Renseigne une adresse email de test ci-dessus pour tester cette partie.' };
    } else if (!hasClientEmailBackend()) {
      clientResult = { success: false, error: 'not_configured', detail: "EMAILJS_PUBLIC_KEY / EMAILJS_SERVICE_ID / EMAILJS_TEMPLATE_ID sont vides dans main.js — l'étape de configuration EmailJS n'a pas encore été faite (ou les clés n'ont pas été sauvegardées/déployées)." };
    } else {
      clientResult = await sendClientConfirmationEmail(
        { id: 'TEST', email: testEmail, nom: 'Test', service: 'Basique' },
        new Date().toLocaleDateString('fr-FR'),
        '10h00'
      );
    }

    results.innerHTML = '';
    renderResult(
      'Alerte vers toi (FormSubmit → ' + ALERT_EMAIL + ')',
      alertResult.success,
      `code ${alertResult.status}`,
      alertResult.body ? alertResult.body.slice(0, 300) : ''
    );
    renderResult(
      'Confirmation client (EmailJS → ' + (testEmail || '—') + ')',
      clientResult.success,
      clientResult.error || 'ok',
      clientResult.detail || ''
    );

    runBtn.disabled = false;
  });
})();

// ══════════════════════════════════════════════
// ── AVIS GOOGLE : défilement automatique doux ──
// ══════════════════════════════════════════════
(function () {
  const wrap = document.querySelector('.avis-track-wrap');
  if (!wrap) return;

  let paused = false;
  let resumeTimer = null;

  function pause() { paused = true; }
  function resumeSoon() {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { paused = false; }, 1800);
  }

  wrap.addEventListener('mouseenter', pause);
  wrap.addEventListener('mouseleave', () => { paused = false; });
  wrap.addEventListener('touchstart', pause, { passive: true });
  wrap.addEventListener('touchend', resumeSoon, { passive: true });
  wrap.addEventListener('wheel', () => { pause(); resumeSoon(); }, { passive: true });

  function tick() {
    if (!paused) {
      const max = wrap.scrollWidth - wrap.clientWidth;
      if (max > 2) {
        wrap.scrollLeft += 1.4;
        if (wrap.scrollLeft >= max) wrap.scrollLeft = 0;
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

// ══════════════════════════════════════════════
// ── SHOWROOM : visionneuse plein écran ──
// ══════════════════════════════════════════════
(function () {
  const grid = document.getElementById('galerie-grid');
  const lightbox = document.getElementById('lightbox');
  if (!grid || !lightbox) return;

  const items = Array.from(grid.querySelectorAll('.galerie-item'));
  const lightboxImg = document.getElementById('lightbox-img');
  const closeBtn = document.getElementById('lightbox-close');
  const prevBtn = document.getElementById('lightbox-prev');
  const nextBtn = document.getElementById('lightbox-next');
  let current = 0;

  function show(index) {
    current = (index + items.length) % items.length;
    const img = items[current].querySelector('img');
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
  }

  function open(index) {
    show(index);
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  items.forEach((item, i) => item.addEventListener('click', () => open(i)));
  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => show(current - 1));
  nextBtn.addEventListener('click', () => show(current + 1));
  lightbox.addEventListener('click', e => { if (e.target === lightbox) close(); });

  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
})();
