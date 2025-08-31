# Takip Admin (Electron)

Basit modern Electron admin paneli örneği. İçerik: `Üretim`, `Paketleme`, `Üretim - Paket Farkı`, `Siparişler` ekranları.

 - Üretim formu artık güvenli IPC aracılığıyla Electron ana sürecine gönderilir ve kayıtlar uygulamanın kullanıcı verisi klasöründe `uretim-records.json` olarak saklanır.
	 - Windows için tipik yol: `%APPDATA%\TakipAdmin\uretim-records.json` (Electron `app.getPath('userData')` kullanılarak belirlenir).
	 - Kayıt sırasında oluşan hata mesajları UI'da gösterilir.
