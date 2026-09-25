
const DB = (() => {
  const LS_KEYS = {
    fuentes: "sidfc_fuentes",
    inspecciones: "sidfc_inspecciones",
    limites: "sidfc_limites",
  };
  const CLEAN_START_KEY = "sidfc_clean_start_v1";

  const LIMITES_DEFAULT = [
    { matriz: "agua", parametro: "DBO5",              limite: 50,  unidad: "mg/L" },
    { matriz: "agua", parametro: "DQO",                limite: 150, unidad: "mg/L" },
    { matriz: "agua", parametro: "Sólidos Suspendidos Totales", limite: 100, unidad: "mg/L" },
    { matriz: "agua", parametro: "Aceites y Grasas",   limite: 20,  unidad: "mg/L" },
    { matriz: "aire", parametro: "Material Particulado", limite: 150, unidad: "mg/Nm³" },
    { matriz: "aire", parametro: "Óxidos de Nitrógeno (NOx)", limite: 500, unidad: "mg/Nm³" },
    { matriz: "aire", parametro: "Dióxido de Azufre (SO2)",  limite: 500, unidad: "mg/Nm³" },
    { matriz: "aire", parametro: "Monóxido de Carbono (CO)", limite: 300, unidad: "mg/Nm³" },
  ];

  function startClean() {
    if (localStorage.getItem(CLEAN_START_KEY) === "done") return;
    localStorage.setItem(LS_KEYS.fuentes, "[]");
    localStorage.setItem(LS_KEYS.inspecciones, "[]");
    sessionStorage.removeItem("sidfc_session");
    localStorage.setItem(CLEAN_START_KEY, "done");
  }

  function ensureLimits() {
    if (!localStorage.getItem(LS_KEYS.limites)) {
      localStorage.setItem(LS_KEYS.limites, JSON.stringify(LIMITES_DEFAULT));
    }
  }

  function readLS(key) {
    return JSON.parse(localStorage.getItem(key) || "[]");
  }
  function writeLS(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  let supabase = null;
  function client() {
    if (!supabase && window.supabase) {
      supabase = window.supabase.createClient(
        SID_CONFIG.SUPABASE_URL,
        SID_CONFIG.SUPABASE_ANON_KEY
      );
    }
    return supabase;
  }

  const isSupabase = () => SID_CONFIG.SUPABASE_READY;

  return {
    mode() {
      return isSupabase() ? "supabase" : "demo";
    },

    async init() {
      if (!isSupabase()) {
        startClean();
        ensureLimits();
      }
    },

    async getFuentes() {
      if (isSupabase()) {
        const { data, error } = await client().from("fuentes").select("*").order("nombre");
        if (error) throw error;
        return data;
      }
      return readLS(LS_KEYS.fuentes);
    },

    async addFuente(fuente) {
      if (isSupabase()) {
        const { data, error } = await client().from("fuentes").insert(fuente).select().single();
        if (error) throw error;
        return data;
      }
      const fuentes = readLS(LS_KEYS.fuentes);
      const nueva = { ...fuente, id: "f" + (Date.now()) };
      fuentes.push(nueva);
      writeLS(LS_KEYS.fuentes, fuentes);
      return nueva;
    },

    async getInspecciones() {
      if (isSupabase()) {
        const { data, error } = await client()
          .from("inspecciones")
          .select("*")
          .order("fecha", { ascending: false });
        if (error) throw error;
        return data;
      }
      return readLS(LS_KEYS.inspecciones).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
    },

    async addInspeccion(insp) {
      if (isSupabase()) {
        const { data, error } = await client().from("inspecciones").insert(insp).select().single();
        if (error) throw error;
        return data;
      }
      const inspecciones = readLS(LS_KEYS.inspecciones);
      const nueva = { ...insp, id: "i" + Date.now() };
      inspecciones.push(nueva);
      writeLS(LS_KEYS.inspecciones, inspecciones);
      return nueva;
    },

    async getLimites() {
      if (isSupabase()) {
        const { data, error } = await client().from("limites").select("*");
        if (error) throw error;
        return data;
      }
      return readLS(LS_KEYS.limites);
    },
  };
})();
