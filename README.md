# Volume Meter In Web

A simple volume monitoring library using the AudioWorklet

## Using

```ts
async function start() {
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audio.srcObject = stream;

  console.log("support", VolumeMeter.isSupport());
  const volMeter = new VolumeMeter(stream.getAudioTracks()[0]);
  volMeter.on("volume", (volume) => {
    console.log("volume", volume);
  });

  // start getVolume
  volMeter.start();
}
```

## build

yarn

yarn build

## dev

yarn

yarn dev

**Any questions you can contact me at [ltsg0317@outlook.com](mailto:ltsg0317@outlook.com)**
