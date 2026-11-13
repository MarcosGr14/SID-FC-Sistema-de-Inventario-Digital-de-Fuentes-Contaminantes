
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
    { matriz: "agua", parametro: "DQO",                limite: 100, unidad: "mg/L" },
    { matriz: "agua", parametro: "Sólidos Suspendidos Totales", limite: 35, unidad: "mg/L" },
    { matriz: "agua", parametro: "Aceites y Grasas",   limite: 20,  unidad: "mg/L" },
    { matriz: "aire", parametro: "Material Particulado", limite: null, unidad: "mg/Nm³" },
    { matriz: "aire", parametro: "Óxidos de Nitrógeno (NOx)", limite: null, unidad: "mg/Nm³" },
    { matriz: "aire", parametro: "Dióxido de Azufre (SO2)",  limite: null, unidad: "mg/Nm³" },
    { matriz: "aire", parametro: "Monóxido de Carbono (CO)", limite: null, unidad: "mg/Nm³" },
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
          try {
            const response = await fetch(input, { ...options, signal: controller.signal });
            const body = response.body ? await response.arrayBuffer() : null;
            return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
          }
          finally { clearTimeout(timer); options.signal?.removeEventListener("abort", abort); }
        } } }
      );
    }
    return supabase;
  }

  const isSupabase = () => SID_CONFIG.SUPABASE_READY;

  async function allRows(table, column = "id", ascending = true, filter = query => query) {
    const rows = [], pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      let query = filter(client().from(table).select("*")).order(column, { ascending });
      if (column !== "id") query = query.order("id");
      const { data, error } = await query.range(offset, offset + pageSize - 1);
      if (error) throw error;
      if (!Array.isArray(data)) throw new Error("El servicio devolvió datos incompletos.");
      rows.push(...data);
      if (data.length < pageSize) return rows;
    }
  }

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
        return allRows("fuentes", "nombre");
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
        return allRows("inspecciones", "fecha", false);
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

    async addInspeccionesExternas(registros) {
      const user = Auth.user();
      if (!user || !isSupabase()) throw new Error("Inicia sesión con conexión al servicio de datos.");
      if (!registros.length || registros.length > 100) throw new Error("El lote debe contener entre 1 y 100 registros.");
      const {data,error} = await client().from("inspecciones").insert(registros.map(i => ({...i,creado_por:user.id}))).select("id");
      if (error) throw error;
      return data;
    },

    async getLimites() {
      if (isSupabase()) {
        return allRows("limites");
      }
      return readLS(LS_KEYS.limites);
    },

    hasEvidenceStorage() {
      return isSupabase();
    },

    async getEvidencias(fuenteId) {
      if (!isSupabase()) return [];
      const data = await allRows("evidencias_fuente", "creado_en", false, query => query.eq("fuente_id", fuenteId));
      return Promise.all(data.map(async (item) => {
        if (item.photo_url) return { ...item, url: item.photo_url };
        try {
          const { data: signed, error } = await client().storage.from("sidfc-evidencias").createSignedUrl(item.ruta_archivo, 3600);
          return { ...item, url: error ? null : signed?.signedUrl || null };
        } catch { return { ...item, url: null }; }
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
        try {
          const { data: signed, error } = await client().storage.from("sidfc-evidencias").createSignedUrl(item.ruta_archivo, 3600);
          return [fuenteId, error ? null : signed?.signedUrl || null];
        } catch { return [fuenteId, null]; }
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
