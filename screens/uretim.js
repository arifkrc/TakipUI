import { showToast } from '../ui/helpers.js';

let _cleanup = null;

export async function mount(container, { setHeader }) {
  setHeader('Üretim', 'Günlük üretim verileri - UI Demo');
  container.innerHTML = `
    <div class="mt-2">
      <div class="mb-4 p-3 bg-blue-900/30 border border-blue-600 rounded">
        <span class="text-blue-300">📋 Bu ekran sadece UI gösterimi içindir - backend bağlantısı bulunmamaktadır</span>
      </div>
      
      <h3 class="text-xl font-semibold mb-2">Üretim Kayıt Formu</h3>
      <form id="uretim-form" class="space-y-4">
        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Tarih<input name="tarih" type="date" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" required /></label>
          <label class="flex flex-col text-sm">Vardiya<select name="vardiya" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100"><option>1 00-08</option><option>2 08-16</option><option>3 16-24</option></select></label>
          <label class="flex flex-col text-sm">Üstabaşı<input name="ustabasi" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Bölüm Sorumlusu<input name="bolum" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Operator<input name="operator" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Ürün Kodu<input name="urunKodu" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
        </div>

        <div class="grid grid-cols-5 gap-4">
          <label class="flex flex-col text-sm">Operasyon Kodu<input name="operasyonKodu" type="text" maxlength="2" placeholder="01" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100 text-center font-mono" /></label>
          <label class="flex flex-col text-sm">Operasyon Türü<select name="operasyonTuru" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100">
            <option value="">Seçiniz...</option>
            <option value="kesme">01 - Kesme</option>
            <option value="tornalama">02 - Tornalama</option>
            <option value="frezeleme">03 - Frezeleme</option>
            <option value="montaj">04 - Montaj</option>
            <option value="kalite">05 - Kalite Kontrol</option>
          </select></label>
          <label class="flex flex-col text-sm">Üretim Adedi<input name="uretimAdedi" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">İş Başlangıç<input name="baslangic" type="text" pattern="[0-9]{2}:[0-9]{2}" placeholder="08:30" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">İş Bitiş<input name="bitis" type="text" pattern="[0-9]{2}:[0-9]{2}" placeholder="17:30" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
        </div>

        <div class="grid grid-cols-4 gap-4">
          <label class="flex flex-col text-sm">Döküm Hatası<input name="dokumHatasi" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Operatör Hatası<input name="operatorHatasi" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Tezgah Arızası<input name="tezgahArizasi" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Tezgah Ayarı<input name="tezgahAyari" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
        </div>

        <div class="grid grid-cols-4 gap-4">
          <label class="flex flex-col text-sm">Elmas Değişimi<input name="elmasDegisimi" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Parça Bekleme<input name="parcaBekleme" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Temizlik<input name="temizlik" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Mola<input name="mola" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
        </div>

        <div class="flex items-center gap-3">
          <button type="submit" class="px-4 py-2 rounded bg-green-600 hover:bg-green-500">Kaydet</button>
          <button type="button" id="uretim-reset" class="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600">Temizle</button>
        </div>
      </form>

      <div class="mt-6 bg-neutral-800 p-4 rounded">
        <h4 class="text-lg font-medium mb-3">Üretim Listesi</h4>
        <div class="overflow-auto">
          <table class="w-full text-left text-sm">
            <thead class="text-neutral-400">
              <tr>
                <th class="p-2">Tarih</th>
                <th class="p-2">Vardiya</th>
                <th class="p-2">Üstabaşı</th>
                <th class="p-2">Ürün Kodu</th>
                <th class="p-2">Operasyon</th>
                <th class="p-2">Üretim Adedi</th>
                <th class="p-2">Süre</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-t border-neutral-700">
                <td class="p-2 text-neutral-400" colspan="7">Demo veriler burada görüntülenecek...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector('#uretim-form');

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
  container.querySelector('#uretim-reset').addEventListener('click', resetHandler);

  _cleanup = () => {
    try { form.removeEventListener('submit', submitHandler); } catch(e){}
    try { const resetBtn = container.querySelector('#uretim-reset'); if (resetBtn) resetBtn.removeEventListener('click', resetHandler); } catch(e){}
    try { container.innerHTML = ''; } catch(e){}
    _cleanup = null;
  };
}

export async function unmount(container) {
  if (_cleanup) _cleanup();
}
