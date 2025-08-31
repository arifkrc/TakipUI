// Login screen module
export async function mount(container, { setHeader, onLogin }) {
  setHeader('Giriş', 'Kullanıcı girişi');
  container.innerHTML = `
    <div class="flex flex-col items-center justify-center min-h-[60vh]">
      <form id="login-form" class="bg-neutral-900 p-8 rounded shadow w-full max-w-sm space-y-6">
        <h2 class="text-2xl font-bold mb-4 text-center">Giriş Yap</h2>
        <div>
          <label class="block text-sm mb-1">Kullanıcı Adı</label>
          <input name="username" type="text" class="w-full px-3 py-2 rounded bg-neutral-800 text-neutral-100" required />
        </div>
        <div>
          <label class="block text-sm mb-1">Şifre</label>
          <input name="password" type="password" class="w-full px-3 py-2 rounded bg-neutral-800 text-neutral-100" required />
        </div>
        <button type="submit" class="w-full py-2 rounded bg-indigo-600 hover:bg-indigo-500 font-semibold">Giriş</button>
        <div id="login-error" class="text-rose-400 text-sm mt-2 hidden"></div>
      </form>
    </div>
  `;
  const form = container.querySelector('#login-form');
  const errorDiv = container.querySelector('#login-error');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorDiv.classList.add('hidden');
    const username = form.username.value.trim();
    const password = form.password.value;
    // Simple hardcoded check (replace with real auth if needed)
    if (username === 'admin' && password === '1234') {
      localStorage.setItem('isLoggedIn', '1');
      if (onLogin) onLogin();
    } else {
      errorDiv.textContent = 'Kullanıcı adı veya şifre yanlış.';
      errorDiv.classList.remove('hidden');
    }
  });
}

export async function unmount(container) {
  container.innerHTML = '';
}
