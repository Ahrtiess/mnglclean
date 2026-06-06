// Formulaire → ouvre l'appli mail (Gmail, Outlook, Mail…)
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

// Scroll reveal
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.tarif-card, .galerie-slot').forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = `opacity 0.6s ease ${i * 0.1}s, transform 0.6s ease ${i * 0.1}s`;
  io.observe(el);
});
