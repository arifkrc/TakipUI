let _cleanup = null;

function showToast(message, type = 'info') {
  console.log(`Toast [${type}]: ${message}`);
}

export async function mount(container, { setHeader }) {
  setHeader('Üretim - Paket Farkı', 'Üretim ve paketleme arasındaki farklar');
  container.innerHTML = `
    <div class="mt-2">
      <h3 class="text-xl font-semibold mb-2">Üretim - Paketleme Farkı (UI Demo)</h3>
      <div class="mb-4 p-3 bg-blue-900/30 border border-blue-600 rounded">
        <span class="text-blue-300">📋 Bu ekran sadece UI gösterimi içindir - backend bağlantısı bulunmamaktadır</span>
      </div>
      <div id="farki-table" class="mt-4">
        <h4 class="text-lg font-medium mb-3">Fark Analizi</h4>
        <div class="bg-neutral-800 p-4 rounded">
          <p class="text-neutral-400 text-center py-8">Bu bölümde üretim ve paketleme farkları görüntülenecek (Demo UI)</p>
        </div>
      </div>
    </div>
  `;

  _cleanup = () => {
    try { container.innerHTML = ''; } catch (e) {}
    _cleanup = null;
  };
}

export async function unmount(container) {
  if (_cleanup) _cleanup();
}
