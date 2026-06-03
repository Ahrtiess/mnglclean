// Formulaire
function handleSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('submit-btn');
  btn.textContent = 'Message envoyé ✓';
  btn.style.background = '#222';
  btn.style.color = '#fff';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = 'Envoyer la demande →';
    btn.style.background = '#fff';
    btn.style.color = '#000';
    btn.disabled = false;
    e.target.reset();
  }, 3000);
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
