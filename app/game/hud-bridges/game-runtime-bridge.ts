type RuntimeReadyListener = () => void;
type RuntimeHudListener = (snapshot: IRuntimeHudSnapshot) => void;

export type TRuntimeShotState = 'idle' | 'aiming' | 'launched' | 'resolving';

export interface IRuntimeHudSnapshot {
  aimAngle: number | null;
  canShoot: boolean;
  dangerLevel: number;
  destroyedBlocksThisTurn: number;
  hasReachedLossLine: boolean;
  remainingBlocks: number;
  shotState: TRuntimeShotState;
  turnNumber: number;
}

export function createInitialRuntimeHudSnapshot(): IRuntimeHudSnapshot {
  return {
    aimAngle: null,
    canShoot: true,
    dangerLevel: 0,
    destroyedBlocksThisTurn: 0,
    hasReachedLossLine: false,
    remainingBlocks: 0,
    shotState: 'idle',
    turnNumber: 1
  };
}

export interface IGameRuntimeBridge {
  signalRuntimeReady: () => void;
  onRuntimeReady: (listener: RuntimeReadyListener) => () => void;
  signalRuntimeHudChanged: (snapshot: IRuntimeHudSnapshot) => void;
  onRuntimeHudChanged: (listener: RuntimeHudListener) => () => void;
}

export default function createGameRuntimeBridge(): IGameRuntimeBridge {
  const runtimeReadyListeners = new Set<RuntimeReadyListener>();
  const runtimeHudListeners = new Set<RuntimeHudListener>();

  return {
    signalRuntimeReady() {
      runtimeReadyListeners.forEach((listener) => listener());
    },
    onRuntimeReady(listener) {
      runtimeReadyListeners.add(listener);

      return () => {
        runtimeReadyListeners.delete(listener);
      };
    },
    signalRuntimeHudChanged(snapshot) {
      runtimeHudListeners.forEach((listener) => listener(snapshot));
    },
    onRuntimeHudChanged(listener) {
      runtimeHudListeners.add(listener);

      return () => {
        runtimeHudListeners.delete(listener);
      };
    }
  };
}
