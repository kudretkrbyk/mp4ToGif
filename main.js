const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { exec } = require("child_process");
const fs = require("fs");
const ffmpegStatic = require("ffmpeg-static");
const ffmpeg = require("fluent-ffmpeg");

ffmpeg.setFfmpegPath(ffmpegStatic);

const outputDir = "output";
const segmentTime = 30;

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

ipcMain.on("request-video-path", async (event) => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Videos", extensions: ["mp4"] }],
  });

  if (result.canceled) {
    event.reply("video-path-response", null);
  } else {
    event.reply("video-path-response", result.filePaths[0]);
  }
});

ipcMain.on("start-conversion", async (event, videoPath) => {
  console.log("video path:", videoPath);
  if (!videoPath || videoPath === ".") {
    event.reply("conversion-error", "Video dosyası yolu tanımlı değil.");
    return;
  }
  try {
    await splitVideo(videoPath);
    const segmentCount = await getSegmentCount();

    for (let i = 0; i < segmentCount; i++) {
      const segmentName = path.join(outputDir, `output00${i}.mp4`);
      const gifName = `output00${i}.gif`;

      await convertToGif(segmentName, gifName);
    }

    event.reply("conversion-complete", "İşlem tamamlandı!");
  } catch (error) {
    event.reply("conversion-error", error.message);
  }
});

async function splitVideo(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions("-c copy")
      .outputOptions("-map 0")
      .outputOptions(`-segment_time ${segmentTime}`)
      .outputOptions("-f segment")
      .outputOptions("-reset_timestamps 1")
      .output(path.join(outputDir, "output%03d.mp4")) // Çıktı yolunu ayarlayın
      .on("end", () => {
        console.log("Video başarıyla bölündü.");
        resolve();
      })
      .on("error", (error) => {
        console.error("Hata:", error.message);
        reject(
          new Error("Video bölme işlemi başarısız oldu: " + error.message)
        );
      })
      .run();
  });
}

async function convertToGif(segmentName, gifName) {
  return new Promise((resolve, reject) => {
    exec(
      `"${ffmpegStatic}" -i ${segmentName} -vf "fps=15,scale=1280:-1:flags=lanczos" -t 30 ${path.join(
        outputDir,
        gifName
      )}`,
      (err) => {
        if (err) reject(err);
        resolve();
      }
    );
  });
}

async function getSegmentCount() {
  const files = fs.readdirSync(outputDir);
  const segments = files.filter(
    (file) => file.startsWith("output") && file.endsWith(".mp4")
  );
  return segments.length;
}

app.on("ready", () => {
  createWindow();
});

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile("index.html");
}
