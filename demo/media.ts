import VolumeMeter from "../src";

let stream: MediaStream;

const audio = document.createElement("audio");

export async function setupMic() {
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audio.srcObject = stream;

  console.log("support", VolumeMeter.isSupport());
  const volMeter = new VolumeMeter(stream.getAudioTracks()[0]);
  bindEvents(volMeter);

  volMeter.start();
}

function bindEvents(volMeter) {
  document.getElementById("start")?.addEventListener("click", () => {
    volMeter.start();
  });

  document.getElementById("stop")?.addEventListener("click", () => {
    volMeter.stop();
    volumeMeterInner.style.transform = `scaleX(0)`;
  });

  const max = 10;
  const volumeMeterInner = document.getElementById(
    "volumeMeterInner"
  ) as HTMLDivElement;

  volMeter.on("volume", (volume) => {
    volume = Math.round(volume * 200);
    volumeMeterInner.style.transform = `scaleX(${
      Math.ceil((volume * max) / 100) / max
    })`;
  });
}
