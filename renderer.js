const { ipcRenderer } = require("electron");

document.addEventListener("DOMContentLoaded", () => {
  const videoSelectBtn = document.getElementById("videoSelectBtn");
  const convertButton = document.getElementById("convertButton");
  const statusMessage = document.getElementById("statusMessage");

  let videoPath = null;

  videoSelectBtn.addEventListener("click", async () => {
    ipcRenderer.send("request-video-path");
  });

  ipcRenderer.on("video-path-response", (event, path) => {
    if (path) {
      videoPath = path;
      statusMessage.textContent = `Seçilen video: ${path}`;
    } else {
      statusMessage.textContent = "Hiçbir video seçilmedi.";
    }
  });

  convertButton.addEventListener("click", () => {
    if (videoPath) {
      statusMessage.textContent = "Dönüştürme işlemi başlatılıyor...";
      ipcRenderer.send("start-conversion", videoPath);
    } else {
      alert("Lütfen bir video seçin.");
    }
  });

  ipcRenderer.on("conversion-complete", (event, message) => {
    statusMessage.textContent = message;
  });

  ipcRenderer.on("conversion-error", (event, message) => {
    statusMessage.textContent = `Hata: ${message}`;
  });
});
