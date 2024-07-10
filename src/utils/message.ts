import { Message, MessageType } from "../types";
import { getRandomString } from "./helper";
import workletUrl from "../worklet/index?worker&url";
import logger from "./logger";
let workletNode: AudioWorkletNode | null;
const workerMsgMap = new Map<string, (data: any) => void>();
const workerListenerMap = new Map<MessageType, (data: any) => void>();

export async function postAudioWorkletMessage<T extends any>(
  type: MessageType,
  data: any,
  transfer?: Transferable[]
): Promise<T> {
  if (!workletNode) {
    return data;
  }
  const id = getRandomString(6);

  return new Promise((resolve) => {
    workerMsgMap.set(id, resolve);
    workletNode?.port.postMessage({ type, data, id }, transfer || []);
  });
}

async function initWorker(context: AudioContext): Promise<AudioWorkletNode> {
  let workerOrWorklet: Worker | AudioWorkletNode;
  let workerOrMessagePort: Worker | MessagePort;

  /**
   * wasm use copy instead of transfer
   */
  await context.audioWorklet.addModule(workletUrl);
  workerOrWorklet = workletNode = new AudioWorkletNode(
    context,
    "volume-processor"
  );
  workerOrMessagePort = workerOrWorklet.port;
  workerOrMessagePort.onmessage = (event: MessageEvent<Message>) => {
    const { data } = event;
    const { type, id, data: msg } = data;
    const listener = workerListenerMap.get(type as MessageType);
    switch (type) {
      case MessageType.INITIALIZE:
        break;
      case MessageType.VOLUME:
        listener && listener(msg);
        break;
      case MessageType.LOG:
        const { level, message } = msg;
        logger.log(level, message);
        break;
    }
    const resolve = workerMsgMap.get(id);
    workerMsgMap.delete(id);
    resolve && resolve(data.data || void 0);
  };

  return workerOrWorklet;
}

function addWorkerEventListener(
  type: MessageType,
  listener: (data: any) => any
) {
  workerListenerMap.set(type, listener);
}

function resetWorker() {
  workerMsgMap.clear();
  workerListenerMap.clear();
}

function clearWorker() {
  workerMsgMap.clear();
  workerListenerMap.clear();
  if (workletNode) {
    workletNode.port.onmessage = null;
    workletNode.port.close();
    workletNode = null;
  }
}

export {
  initWorker,
  addWorkerEventListener,
  workerListenerMap,
  clearWorker,
  resetWorker,
};
