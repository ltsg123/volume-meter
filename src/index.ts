import { MessageType } from "./types";
import { EventEmitter } from "./utils/events";
import { isSupportVolumeMeter } from "./utils/helper";
import logger from "./utils/logger";
import {
  addWorkerEventListener,
  clearWorker,
  initWorker,
  postAudioWorkletMessage,
} from "./utils/message";
import { getAudioContext } from "./utils/webaudio";

class VolumeMeter extends EventEmitter {
  public static isSupport = isSupportVolumeMeter;
  public static name: string = "Volume-Meter";
  private _mediaStreamTrack?: MediaStreamTrack;
  private _mediaStream?: MediaStream;
  private _mediaSource?: MediaStreamAudioSourceNode;
  private _audioCtx: AudioContext;
  private _workletNode: AudioWorkletNode | null = null;
  private _audioBufferNode?: ScriptProcessorNode;
  private _isDestroyed: boolean = false;

  public constructor(track?: MediaStreamTrack) {
    super();
    if (!isSupportVolumeMeter()) {
      throw new Error("The current environment does not support volume-meter.");
    }
    const audioCtx = getAudioContext();
    this._audioCtx = audioCtx;

    if (track) {
      this._mediaStreamTrack = track.clone();
      this._mediaStream = new MediaStream([this._mediaStreamTrack]);
      // creates an audio node from the microphone incoming stream
      this._mediaSource = audioCtx.createMediaStreamSource(this._mediaStream);
    }
  }

  public updateTrack(track: MediaStreamTrack) {
    if (this._mediaStreamTrack !== track) {
      this._mediaStreamTrack = track.clone();
      this._mediaStream = new MediaStream([this._mediaStreamTrack]);
      this._mediaSource = this._audioCtx.createMediaStreamSource(
        this._mediaStream
      );
    }
  }

  public start() {
    if (this._isDestroyed) {
      throw new Error("cannot use volume-meter because it's been destroyed.");
    }
    if (!this._mediaStreamTrack || !this._mediaStream) {
      throw new Error(
        "cannot use volume-meter because of no mediaStreamTrack."
      );
    }
    this._applyVolumeMeter();
  }

  public stop() {
    if (this._audioBufferNode) {
      this._audioBufferNode.onaudioprocess = null;
      this._mediaSource?.disconnect(this._audioBufferNode);
      this._audioBufferNode.disconnect(this._audioCtx.destination);
      this._audioBufferNode = undefined;
    }

    if (this._workletNode) {
      this._mediaSource?.disconnect(this._workletNode);
      this._workletNode.disconnect(this._audioCtx.destination);
      this._workletNode = null;
    }
  }

  public destroy() {
    this._isDestroyed = true;
    this.stop();
    this._audioCtx.close();
    this._isDestroyed = true;
    clearWorker();
    this._mediaStream = undefined;
    this._mediaStreamTrack = undefined;
  }

  private async _applyVolumeMeter() {
    if (!this._mediaSource) {
      throw new Error("no found mediaSource when apply volume-meter");
    }
    this._workletNode = await initWorker(this._audioCtx);
    this._mediaSource.connect(this._workletNode);
    this._workletNode.connect(this._audioCtx.destination);
    this._bindWorkletEvent();
    logger.debug("VolumeMeter worklet node initialized");
    await postAudioWorkletMessage(MessageType.INITIALIZE, {});

    return this._workletNode;
  }

  private _bindWorkletEvent() {
    addWorkerEventListener(MessageType.VOLUME, async (volume: number) => {
      this.emit("volume", volume);
    });
  }
}

export default VolumeMeter;
