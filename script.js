const modal = document.getElementById('modal');
const modalContent = document.getElementById('modal-content');
const closeBtn = document.querySelector('.close');

const templates = {
  club: `
    <h2>Pilotverein vormerken</h2>
    <p class="muted">Demo-Formular. Nicht versendet. Zweck: Flow und Inhalt zeigen.</p>
    <div class="form-grid">
      <input placeholder="Vereinsname" />
      <input placeholder="Ansprechpartner" />
      <input placeholder="E-Mail" />
      <input placeholder="Ort / Liga" />
      <textarea placeholder="Was möchtet ihr mit dem Programm erreichen?"></textarea>
      <button class="btn btn-solid">Vormerkung absenden</button>
    </div>
  `,
  sponsor: `
    <h2>Als Unternehmen vormerken</h2>
    <p class="muted">Demo-Formular. Nicht versendet. Zweck: Sponsor-Interesse und einfacher B2B-Flow.</p>
    <div class="form-grid">
      <input placeholder="Unternehmensname" />
      <input placeholder="Ansprechpartner" />
      <input placeholder="E-Mail" />
      <select><option>1 Familie · €99</option><option>3 Familien · €297</option><option>5 Familien · €495</option></select>
      <textarea placeholder="Optional: bestimmter Verein oder Familie?"></textarea>
      <button class="btn btn-solid">Interesse vormerken</button>
    </div>
  `
};

document.querySelectorAll('[data-modal]').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.getAttribute('data-modal');
    modalContent.innerHTML = templates[key] || '<p>Inhalt nicht gefunden.</p>';
    modal.showModal();
  });
});

if (closeBtn) closeBtn.addEventListener('click', () => modal.close());
if (modal) modal.addEventListener('click', (e) => {
  const rect = modal.getBoundingClientRect();
  const clickedInDialog = rect.top <= e.clientY && e.clientY <= rect.top + rect.height && rect.left <= e.clientX && e.clientX <= rect.left + rect.width;
  if (!clickedInDialog) modal.close();
});
