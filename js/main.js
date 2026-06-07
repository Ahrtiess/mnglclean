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

  slider.addEventListener('touchstart', e => { dragging = true; setPosition(e.touches[0].clientX); }, { passive: true });
  window.addEventListener('touchmove', e => { if (dragging) setPosition(e.touches[0].clientX); }, { passive: true });
  window.addEventListener('touchend', () => { dragging = false; });
});

// ── FORMULAIRE → OUVRE L'APPLI MAIL ──
function handleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const nom       = form.nom.value;
  const tel       = form.tel.value;
  const email     = form.email.value;
  const prestation = form.prestation.value;
  const vehicule  = form.vehicule.value;
  const message   = form.message.value;

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
