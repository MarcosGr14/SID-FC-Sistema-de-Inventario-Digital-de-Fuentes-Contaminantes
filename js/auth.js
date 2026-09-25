
const Auth = (() => {
  const SESSION_KEY = "sidfc_session";
  let currentUser = null;

  function isSupabase() {
    return SID_CONFIG.SUPABASE_READY;
  }

  async function restore() {
    if (isSupabase()) {
      const { data } = await window.supabase
        .createClient(SID_CONFIG.SUPABASE_URL, SID_CONFIG.SUPABASE_ANON_KEY)
        .auth.getSession();
      currentUser = data?.session?.user || null;
      return currentUser;
    }
    const raw = sessionStorage.getItem(SESSION_KEY);
    currentUser = raw ? JSON.parse(raw) : null;
    return currentUser;
  }

  async function login(email, password) {
    if (isSupabase()) {
      const client = window.supabase.createClient(SID_CONFIG.SUPABASE_URL, SID_CONFIG.SUPABASE_ANON_KEY);
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw new Error("Credenciales inválidas o usuario no registrado en Supabase Auth.");
      currentUser = data.user;
      return currentUser;
    }

    if (email === SID_CONFIG.DEMO_USER.email && password === SID_CONFIG.DEMO_USER.password) {
      currentUser = { email, demo: true };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
      return currentUser;
    }
    throw new Error(
      `Modo demo activo. Usa: ${SID_CONFIG.DEMO_USER.email} / ${SID_CONFIG.DEMO_USER.password}`
    );
  }

  function logout() {
    currentUser = null;
    sessionStorage.removeItem(SESSION_KEY);
    if (isSupabase()) {
      window.supabase.createClient(SID_CONFIG.SUPABASE_URL, SID_CONFIG.SUPABASE_ANON_KEY).auth.signOut();
    }
  }

  function user() {
    return currentUser;
  }

  return { restore, login, logout, user };
})();
