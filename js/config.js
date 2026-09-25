
const SID_CONFIG = {
  SUPABASE_URL: "https://hgxroizzfizvxoclycwt.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_kMTjxnjxGunpIi5dEaodwA_8PQ_DKvS",
  MAP_CENTER: [8.99, -79.55],
  MAP_ZOOM: 11,
  DEMO_USER: { email: "inspector@ambiente.gob.pa", password: "demo123" },
};

SID_CONFIG.SUPABASE_READY =
  SID_CONFIG.SUPABASE_URL.startsWith("http") &&
  SID_CONFIG.SUPABASE_ANON_KEY.length > 20;
