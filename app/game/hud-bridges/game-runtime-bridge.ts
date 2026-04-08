type RuntimeReadyListener = () => void;

export interface IGameRuntimeBridge {
  signalRuntimeReady: () => void;
  onRuntimeReady: (listener: RuntimeReadyListener) => () => void;
}

export default function createGameRuntimeBridge(): IGameRuntimeBridge {
  const runtimeReadyListeners = new Set<RuntimeReadyListener>();

  return {
    signalRuntimeReady() {
      runtimeReadyListeners.forEach((listener) => listener());
    },
    onRuntimeReady(listener) {
      runtimeReadyListeners.add(listener);

      return () => {
        runtimeReadyListeners.delete(listener);
      };
    }
  };
}
