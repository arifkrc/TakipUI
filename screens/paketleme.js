import { showToast } from '../ui/helpers.js';

let _cleanup = null;

export async function mount(container, { setHeader }) {
  setHeader('Paketleme', 'Paketleme kayıtları - UI Demo');
  container.innerHTML = `
    <div class="mt-2">
      <h3 class="text-xl font-semibold mb-2">Paketleme Kayıt Formu</h3>
      <form id="paketleme-form" class="space-y-4">
        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Tarih<input name="tarih" type="date" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" required /></label>
          <label class="flex flex-col text-sm">Vardiya<select name="vardiya" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100"><option>1 00-08</option><option>2 08-16</option><option>3 16-24</option></select></label>
          <label class="flex flex-col text-sm">Üstabaşı<input name="ustabasi" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Ürün Kodu<input name="urunKodu" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Açıklama<input name="aciklama" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Müşteri<input name="musteri" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Adet<input name="adet" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Fire<input name="fire" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Patlatılan Kutu Sayısı<input name="patlatilanKutu" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Patlatılan Firma<input name="patlatilanFirma" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Hazırlanan Firma<input name="hazirlananFirma" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <div></div>
        </div>

        <div class="flex items-center gap-3">
          <button type="submit" class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500">Kaydet</button>
          <button type="button" id="paketleme-reset" class="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600">Temizle</button>
        </div>
      </form>

      <div class="mt-6 p-4 bg-neutral-800 rounded">
        <p class="text-neutral-400 text-center">Bu sekme sadece UI gösterimi içindir. Backend bağlantısı bulunmamaktadır.</p>
      </div>
    </div>
  `;

  const form = container.querySelector('#paketleme-form');

  function setDefaultDate() {
    const dateInput = form.querySelector('[name="tarih"]');
    if (dateInput && !dateInput.value) {
      const today = new Date();
      dateInput.value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    }
  }
  setDefaultDate();

  async function submitHandler(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true; 
    submitBtn.textContent = 'Kaydediliyor...';
    
    // Simulate save
    setTimeout(() => {
      showToast('Form verileri sadece UI gösterimi için - backend bağlantısı yok', 'info');
      form.reset(); 
      setDefaultDate();
      submitBtn.disabled = false; 
      submitBtn.textContent = 'Kaydet';
    }, 1000);
  }

  function resetHandler() { 
    form.reset(); 
    setDefaultDate();
  }

  form.addEventListener('submit', submitHandler);
  form.querySelector('#paketleme-reset').addEventListener('click', resetHandler);

  _cleanup = () => {
    try { form.removeEventListener('submit', submitHandler); } catch(e){}
    try { const resetBtn = form.querySelector('#paketleme-reset'); if (resetBtn) resetBtn.removeEventListener('click', resetHandler); } catch(e){}
    try { container.innerHTML = ''; } catch(e){}
    _cleanup = null;
  };
}

export async function unmount(container) {
  if (_cleanup) _cleanup();
}
