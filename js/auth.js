
const Auth = (() => {
  const SESSION_KEY = "sidfc_session";
  let currentUser = null;

  function isSupabase() {
    return SID_CONFIG.SUPABASE_READY;
  }

  async function restore() {
    if (isSupabase()) {
      const { data } = await DB.client().auth.getSession();
      currentUser = data?.session?.user || null;
      return currentUser;
    }
    const raw = sessionStorage.getItem(SESSION_KEY);
    currentUser = raw ? JSON.parse(raw) : null;
    return currentUser;
  }

  async function login(email, password) {
    if (isSupabase()) {
      const client = DB.client();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.status === 400 || error.status === 401
        ? "El correo o la contraseña no son correctos."
        : "No se pudo conectar con el servicio de acceso. Revisa la conexión e inténtalo de nuevo.");
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

  async function logout() {
    currentUser = null;
    sessionStorage.removeItem(SESSION_KEY);
    if (isSupabase()) {
      await DB.client().auth.signOut({ scope: "local" });
    }
  }

  function user() {
    return currentUser;
  }

  return { restore, login, logout, user };
})();
