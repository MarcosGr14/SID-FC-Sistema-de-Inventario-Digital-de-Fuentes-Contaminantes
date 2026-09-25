
document.addEventListener("DOMContentLoaded", () => {
  UI.init().catch((err) => {
    console.error(err);
    alert("Ocurrió un error inicializando SID-FC: " + err.message);
  });
});
