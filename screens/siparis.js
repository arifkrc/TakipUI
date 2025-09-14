let _cleanup = null;

function showToast(message, type = 'info') {
  console.log(`Toast [${type}]: ${message}`);
}

export async function mount(container, { setHeader }) {
  setHeader('Siparişler', 'Sipariş import ve listesi');

  container.innerHTML = `
    <div class="mt-2">
      <h3 class="text-xl font-semibold mb-2">Siparişler (UI Demo)</h3>
      <div class="mb-4 p-3 bg-blue-900/30 border border-blue-600 rounded">
        <span class="text-blue-300">📋 Bu ekran sadece UI gösterimi içindir - backend bağlantısı bulunmamaktadır</span>
      </div>

      <div class="mb-4 flex items-center gap-3">
        <button id="import-files" class="px-4 py-2 rounded bg-green-600 hover:bg-green-500">Dosya İçe Aktar (CSV/XLSX)</button>
      </div>

      <form id="siparis-form" class="space-y-4 mb-4">
        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Ürün Kodu<input name="urunKodu" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Açıklama<input name="aciklama" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Seçenekler<input name="secenekler" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Belge No<input name="belgeNo" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Müşteri Adı<input name="musteriAdi" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Sipariş Adet<input name="siparisAdet" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Devir Sayısı<input name="devirSayisi" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <div></div>
          <div></div>
        </div>
        <div class="flex items-center gap-3">
          <button type="submit" class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500">Ekle</button>
          <button type="button" id="siparis-reset" class="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600">Temizle</button>
        </div>
      </form>

      <div id="siparis-list-placeholder" class="mt-6">
        <h4 class="text-lg font-medium mb-3">Sipariş Listesi</h4>
        <div class="bg-neutral-800 p-4 rounded">
          <p class="text-neutral-400 text-center py-8">Bu bölümde sipariş listesi görüntülenecek (Demo UI)</p>
        </div>
      </div>
    </div>
  `;

  const importBtn = container.querySelector('#import-files');
  const form = container.querySelector('#siparis-form');
  const resetBtn = container.querySelector('#siparis-reset');

  async function importHandler() {
    importBtn.disabled = true;
    importBtn.textContent = 'Demo...';
    
    setTimeout(() => {
      showToast('Dosya içe aktarma sadece UI gösterimi için - backend bağlantısı yok', 'info');
      importBtn.disabled = false;
      importBtn.textContent = 'Dosya İçe Aktar (CSV/XLSX)';
    }, 1000);
  }

  async function submitHandler(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Ekleniyor...';
    
    setTimeout(() => {
      showToast('Sipariş formu sadece UI gösterimi için - backend bağlantısı yok', 'info');
      form.reset();
      submitBtn.disabled = false;
      submitBtn.textContent = 'Ekle';
    }, 1000);
  }

  function resetHandler() {
    form.reset();
  }

  importBtn.addEventListener('click', importHandler);
  form.addEventListener('submit', submitHandler);
  resetBtn.addEventListener('click', resetHandler);

  _cleanup = () => {
    try { importBtn.removeEventListener('click', importHandler); } catch(e){}
    try { form.removeEventListener('submit', submitHandler); } catch(e){}
    try { resetBtn.removeEventListener('click', resetHandler); } catch(e){}
    try { container.innerHTML = ''; } catch(e){}
    _cleanup = null;
  };
}

export async function unmount(container) { if (_cleanup) _cleanup(); }
