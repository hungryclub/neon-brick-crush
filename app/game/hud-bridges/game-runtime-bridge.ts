type RuntimeReadyListener = () => void;
type RuntimeHudListener = (snapshot: IRuntimeHudSnapshot) => void;
type RuntimeStageFailedListener = () => void;
type RuntimeStageResetCompletedListener = () => void;
type RuntimeStageResetRequestedListener = () => void;

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
  signalStageFailed: () => void;
  onStageFailed: (listener: RuntimeStageFailedListener) => () => void;
  requestStageReset: () => void;
  onStageResetRequested: (listener: RuntimeStageResetRequestedListener) => () => void;
  signalStageResetCompleted: () => void;
  onStageResetCompleted: (listener: RuntimeStageResetCompletedListener) => () => void;
}

export default function createGameRuntimeBridge(): IGameRuntimeBridge {
  const runtimeReadyListeners = new Set<RuntimeReadyListener>();
  const runtimeHudListeners = new Set<RuntimeHudListener>();
  const runtimeStageFailedListeners = new Set<RuntimeStageFailedListener>();
  const runtimeStageResetRequestedListeners = new Set<RuntimeStageResetRequestedListener>();
  const runtimeStageResetCompletedListeners = new Set<RuntimeStageResetCompletedListener>();

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
    },
    signalStageFailed() {
      runtimeStageFailedListeners.forEach((listener) => listener());
    },
    onStageFailed(listener) {
      runtimeStageFailedListeners.add(listener);

      return () => {
        runtimeStageFailedListeners.delete(listener);
      };
    },
    requestStageReset() {
      runtimeStageResetRequestedListeners.forEach((listener) => listener());
    },
    onStageResetRequested(listener) {
      runtimeStageResetRequestedListeners.add(listener);

      return () => {
        runtimeStageResetRequestedListeners.delete(listener);
      };
    },
    signalStageResetCompleted() {
      runtimeStageResetCompletedListeners.forEach((listener) => listener());
    },
    onStageResetCompleted(listener) {
      runtimeStageResetCompletedListeners.add(listener);

      return () => {
        runtimeStageResetCompletedListeners.delete(listener);
      };
    }
  };
}
