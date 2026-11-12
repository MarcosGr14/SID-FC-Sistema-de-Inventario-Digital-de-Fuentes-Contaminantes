
const DB = (() => {
  const LS_KEYS = {
    fuentes: "sidfc_fuentes",
    inspecciones: "sidfc_inspecciones",
    limites: "sidfc_limites",
    evidencias: "sidfc_evidencias",
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
    { matriz: "suelo", parametro: "pH", limite: null, unidad: "pH", umbral_aviso: null, referencia_normativa: "Sin criterio cargado" },
    { matriz: "suelo", parametro: "Plomo total", limite: null, unidad: "mg/kg", umbral_aviso: null, referencia_normativa: "Sin criterio cargado" },
    { matriz: "suelo", parametro: "Cadmio total", limite: null, unidad: "mg/kg", umbral_aviso: null, referencia_normativa: "Sin criterio cargado" },
    { matriz: "suelo", parametro: "Hidrocarburos totales", limite: null, unidad: "mg/kg", umbral_aviso: null, referencia_normativa: "Sin criterio cargado" },
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
    if (!supabase) {
      if (!window.supabase) throw new Error("No se pudo cargar el cliente de datos. Recarga la página.");
      supabase = window.supabase.createClient(
        SID_CONFIG.SUPABASE_URL,
        SID_CONFIG.SUPABASE_ANON_KEY,
        { global: { fetch: async (input, options = {}) => {
          const controller = new AbortController();
          const abort = () => controller.abort();
          options.signal?.addEventListener("abort", abort, { once: true });
          if (options.signal?.aborted) controller.abort();
          const timer = setTimeout(abort, 10000);
          try { return await fetch(input, { ...options, signal: controller.signal }); }
          finally { clearTimeout(timer); options.signal?.removeEventListener("abort", abort); }
        } } }
      );
    }
    return supabase;
  }

  const isSupabase = () => SID_CONFIG.SUPABASE_READY;

  return {
    client,

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
        const user = Auth.user();
        const { data, error } = await client().from("fuentes").insert({
          ...fuente,
          creado_por: user?.id || null,
        }).select().single();
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
        const user = Auth.user();
        const { data, error } = await client().from("inspecciones").insert({
          ...insp,
          creado_por: user?.id || null,
        }).select().single();
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

    hasEvidenceStorage() {
      return isSupabase();
    },

    async getEvidencias(fuenteId) {
      if (!isSupabase()) return [];
      const { data, error } = await client()
        .from("evidencias_fuente")
        .select("id, fuente_id, inspeccion_id, ruta_archivo, photo_url, descripcion, creado_por, creado_en")
        .eq("fuente_id", fuenteId)
        .order("creado_en", { ascending: false });
      if (error) throw error;
      return Promise.all(data.map(async (item) => {
        if (item.photo_url) return { ...item, url: item.photo_url };
        const { data: signed, error: signedError } = await client()
          .storage.from("sidfc-evidencias").createSignedUrl(item.ruta_archivo, 3600);
        if (signedError) throw signedError;
        return { ...item, url: signed.signedUrl };
      }));
    },

    async getEvidenciasMapa(fuenteIds) {
      if (!isSupabase() || !Auth.user() || !fuenteIds.length) return {};
      const { data, error } = await client().from("evidencias_fuente")
        .select("fuente_id, ruta_archivo, photo_url, creado_en")
        .in("fuente_id", fuenteIds).order("creado_en", { ascending: false });
      if (error) throw error;
      const latest = new Map();
      for (const item of data) {
        if (!latest.has(item.fuente_id)) latest.set(item.fuente_id, item);
      }
      const entries = await Promise.all([...latest.entries()].map(async ([fuenteId, item]) => {
        if (item.photo_url) return [fuenteId, item.photo_url];
        if (!item.ruta_archivo) return [fuenteId, null];
        const { data: signed, error: signedError } = await client().storage.from("sidfc-evidencias").createSignedUrl(item.ruta_archivo, 3600);
        return [fuenteId, signedError ? null : signed.signedUrl];
      }));
      const fotos = Object.fromEntries(entries.filter(([, url]) => url));
      return fotos;
    },


    async addEvidencia({ fuenteId, inspeccionId, file, photoUrl, descripcion }) {
      if (!isSupabase()) throw new Error("La evidencia fotográfica requiere Supabase Storage.");
      const user = Auth.user();
      if (!user) throw new Error("Inicia sesión para adjuntar evidencia.");
      if (!file && photoUrl) {
        let parsed;
        try { parsed = new URL(photoUrl); } catch { throw new Error("Escribe una URL válida para la imagen."); }
        if (parsed.protocol !== "https:") throw new Error("La URL de la imagen debe comenzar con https://.");
        const { data, error } = await client().from("evidencias_fuente").insert({
          fuente_id: fuenteId,
          inspeccion_id: inspeccionId || null,
          ruta_archivo: null,
          photo_url: parsed.href,
          descripcion: descripcion || null,
          creado_por: user.id,
        }).select().single();
        if (error) throw error;
        return data;
      }
      if (!file) throw new Error("Selecciona un archivo o proporciona una URL de imagen.");
      const extensionByType = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
      const extension = extensionByType[file.type];
      if (!extension) throw new Error("Usa una imagen JPG, PNG o WebP.");
      if (file.size > 5242880) throw new Error("La imagen supera los 5 MB.");
      const path = `${fuenteId}/${crypto.randomUUID()}.${extension}`;
      const storage = client().storage.from("sidfc-evidencias");
      const { error: uploadError } = await storage.upload(path, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { data, error } = await client().from("evidencias_fuente").insert({
        fuente_id: fuenteId,
        inspeccion_id: inspeccionId || null,
        ruta_archivo: path,
        photo_url: null,
        descripcion: descripcion || null,
        creado_por: user.id,
      }).select().single();
      if (error) {
        await storage.remove([path]);
        throw error;
      }
      return data;
    },

    async deleteEvidencia(item) {
      if (!isSupabase()) throw new Error("La evidencia fotográfica requiere Supabase Storage.");
      const user = Auth.user();
      if (!user || user.id !== item.creado_por) throw new Error("Solo quien subió la foto puede eliminarla.");
      if (item.ruta_archivo) {
        const { error: removeError } = await client().storage.from("sidfc-evidencias").remove([item.ruta_archivo]);
        if (removeError) throw removeError;
      }
      const { error } = await client().from("evidencias_fuente").delete().eq("id", item.id);
      if (error) throw error;
    },
  };
})();
