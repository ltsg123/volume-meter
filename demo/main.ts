import { setupMic } from "./media";
import "./style.css";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
  <h1>Volume Meter In Web</h1>
    <button id="start">ENABLE</button>
    <button id="stop">DISABLE</button>
    <div class="volume">
      <h2>Volume:  </h2>
      <div class="volumeMeter" id="volumeMeter" >
      <div class="volumeMeterBg" id="volumeMeterBg"> </div>
      <div
        class="volumeMeterInner"
        id="volumeMeterInner"
      />
      </div>
    </div>
  </div>
`;

setupMic();
