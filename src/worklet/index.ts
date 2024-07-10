import { LogLevel, MessageType } from "../types";

const SMOOTHING_FACTOR = 0.8;
const MINIMUM_VALUE = 0.00001;

export class VolumeProcessor extends AudioWorkletProcessor {
  protected _destroyed: boolean;
  private _volume;
  private _updateIntervalInMS;
  private _nextUpdateFrame;

  public constructor() {
    super();
    this.port.onmessage = this._onmessage.bind(this);
    this._destroyed = false;

    this._volume = 0;
    this._updateIntervalInMS = 25;
    this._nextUpdateFrame = this._updateIntervalInMS;
    this.port.onmessage = (event) => {
      if (event.data.updateIntervalInMS) {
        this._updateIntervalInMS = event.data.updateIntervalInMS;
      }
    };

    this._log(LogLevel.DEBUG, `init volume-meter success`);
  }

  get intervalInFrames() {
    // eslint-disable-next-line no-undef
    return (this._updateIntervalInMS / 1000) * sampleRate;
  }

  // don't do any asynchronous operations in this real-time thread
  public process(inputs: Float32Array[][], outputs: Float32Array[][]) {
    const input = inputs[0];

    // Note that the input will be down-mixed to mono; however, if no inputs are
    // connected then zero channels will be passed in.
    if (0 < input.length) {
      const samples = input[0];
      let sum = 0;
      let rms = 0;

      // Calculated the squared-sum.
      for (let i = 0; i < samples.length; i += 1) {
        sum += samples[i] * samples[i];
      }

      // Calculate the RMS level and update the volume.
      rms = Math.sqrt(sum / samples.length);
      this._volume = Math.max(rms, this._volume * SMOOTHING_FACTOR);

      // Update and sync the volume property with the main thread.
      this._nextUpdateFrame -= samples.length;
      if (0 > this._nextUpdateFrame) {
        this._nextUpdateFrame += this.intervalInFrames;
        this._postMessage({
          type: MessageType.VOLUME,
          data: this._volume,
        });
      }
    }

    return true;
  }

  /**
   * dump the audio data after plug-in processing
   */
  protected _dump(): void {}

  /**
   *
   * @param level
   * @param message
   *
   * send log message to main thread
   */
  protected _log(level: LogLevel, message: string) {
    this._postMessage({
      type: MessageType.LOG,
      data: { level, message },
    });
  }

  private _destroy() {
    this._destroyed = true;
  }

  protected _postMessage(
    message: {
      id?: number;
      type: MessageType;
      data: any;
    },
    transfers: Transferable[] = []
  ) {
    this.port.postMessage(message, transfers);
  }

  // request and response
  private _onmessage(event: MessageEvent) {
    const rawData = event.data;
    if (!("id" in rawData)) {
      return;
    }
    const { id, type, data } = rawData;
    try {
      if (type === MessageType.INITIALIZE) {
        //
      }
      this._postMessage({ id, type: MessageType.RESULT, data: {} });
    } catch (error) {
      this._postMessage({
        id,
        type: MessageType.ERROR,
        data: error as Error,
      });
    }
  }
}

registerProcessor("volume-processor", VolumeProcessor);
