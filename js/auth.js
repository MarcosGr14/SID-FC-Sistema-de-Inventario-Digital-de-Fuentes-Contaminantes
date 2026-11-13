
const Auth = (() => {
  const SESSION_KEY = "sidfc_session";
  let currentUser = null;
  let watching = false;
  const listeners = new Set();
  function setUser(user) {
    currentUser = user || null;
    setTimeout(() => listeners.forEach(listener => listener(currentUser)), 0);
  }
  function watch() {
    if (watching || !isSupabase()) return;
    DB.client().auth.onAuthStateChange((_event, session) => setUser(session?.user));
    watching = true;
  }
  function onChange(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function isSupabase() {
    return SID_CONFIG.SUPABASE_READY;
  }

  async function restore() {
    if (isSupabase()) {
      watch();
      const { data, error } = await DB.client().auth.getSession();
      if (error) throw error;
      setUser(data?.session?.user);
      return currentUser;
    }
    const raw = sessionStorage.getItem(SESSION_KEY);
    currentUser = raw ? JSON.parse(raw) : null;
    return currentUser;
  }

  async function login(email, password) {
    if (isSupabase()) {
      const client = DB.client();
      watch();
      const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(error.status === 400 || error.status === 401
        ? "El correo o la contraseña no son correctos."
        : "No se pudo conectar con el servicio de acceso. Revisa la conexión e inténtalo de nuevo.");
      setUser(data.user);
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
    if (isSupabase()) {
      const { error } = await DB.client().auth.signOut({ scope: "local" });
      if (error) throw new Error("No se pudo cerrar la sesión. Revisa la conexión e inténtalo de nuevo.");
    }
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  }

  function user() {
    return currentUser;
  }

  return { restore, login, logout, user, onChange };
})();
