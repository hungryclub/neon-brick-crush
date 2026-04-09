type RuntimeReadyListener = () => void;
type RuntimeHudListener = (snapshot: IRuntimeHudSnapshot) => void;
type RuntimeStageFailedListener = () => void;
type RuntimeStageClearedListener = () => void;
type RuntimeStageResetCompletedListener = () => void;
type RuntimeStageResetRequestedListener = () => void;
type RuntimeTurnResolvedListener = (payload: ITurnResolvedPayload) => void;
type RuntimeFeverActivationRequestedListener = () => void;

export type TRuntimeShotState = 'idle' | 'aiming' | 'launched' | 'resolving';

export interface ITurnResolvedPayload {
  destroyedBlocksThisTurn: number;
  feverApplied: boolean;
  gateTriggeredCount: number;
}

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
  signalStageCleared: () => void;
  onStageCleared: (listener: RuntimeStageClearedListener) => () => void;
  requestStageReset: () => void;
  onStageResetRequested: (listener: RuntimeStageResetRequestedListener) => () => void;
  signalStageResetCompleted: () => void;
  onStageResetCompleted: (listener: RuntimeStageResetCompletedListener) => () => void;
  signalTurnResolved: (payload: ITurnResolvedPayload) => void;
  onTurnResolved: (listener: RuntimeTurnResolvedListener) => () => void;
  requestFeverActivation: () => void;
  onFeverActivationRequested: (listener: RuntimeFeverActivationRequestedListener) => () => void;
}

export default function createGameRuntimeBridge(): IGameRuntimeBridge {
  const runtimeReadyListeners = new Set<RuntimeReadyListener>();
  const runtimeHudListeners = new Set<RuntimeHudListener>();
  const runtimeStageFailedListeners = new Set<RuntimeStageFailedListener>();
  const runtimeStageClearedListeners = new Set<RuntimeStageClearedListener>();
  const runtimeStageResetRequestedListeners = new Set<RuntimeStageResetRequestedListener>();
  const runtimeStageResetCompletedListeners = new Set<RuntimeStageResetCompletedListener>();
  const runtimeTurnResolvedListeners = new Set<RuntimeTurnResolvedListener>();
  const runtimeFeverActivationRequestedListeners = new Set<RuntimeFeverActivationRequestedListener>();

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
    signalStageCleared() {
      runtimeStageClearedListeners.forEach((listener) => listener());
    },
    onStageCleared(listener) {
      runtimeStageClearedListeners.add(listener);

      return () => {
        runtimeStageClearedListeners.delete(listener);
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
    },
    signalTurnResolved(payload) {
      runtimeTurnResolvedListeners.forEach((listener) => listener(payload));
    },
    onTurnResolved(listener) {
      runtimeTurnResolvedListeners.add(listener);

      return () => {
        runtimeTurnResolvedListeners.delete(listener);
      };
    },
    requestFeverActivation() {
      runtimeFeverActivationRequestedListeners.forEach((listener) => listener());
    },
    onFeverActivationRequested(listener) {
      runtimeFeverActivationRequestedListeners.add(listener);

      return () => {
        runtimeFeverActivationRequestedListeners.delete(listener);
      };
    }
  };
}
