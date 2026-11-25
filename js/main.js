
document.addEventListener("DOMContentLoaded", () => {
  UI.init().catch((err) => {
    console.error(err);
    alert("Ocurrió un error inicializando SID-FC: " + err.message);
  });
});

if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch((error) => {
    console.warn("No se pudo activar el modo instalable:", error.message);
  }));
}
