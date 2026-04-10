import { isDebugToolsEnabled } from './debug-flags.ts';

export type TDebugRewardedAdMode =
  | 'live'
  | 'granted'
  | 'denied'
  | 'cancelled'
  | 'unavailable'
  | 'failed';

export type TDebugPurchaseMode =
  | 'live'
  | 'purchased'
  | 'cancelled'
  | 'unavailable'
  | 'failed';

export interface IDebugSimulationState {
  purchaseMode: TDebugPurchaseMode;
  rewardedAdMode: TDebugRewardedAdMode;
}

export type TDebugCommand =
  | { type: 'SET_REWARDED_AD_MODE'; mode: TDebugRewardedAdMode }
  | { type: 'SET_PURCHASE_MODE'; mode: TDebugPurchaseMode }
  | { type: 'FORCE_STAGE_FAILURE' }
  | { type: 'RESET_PROGRESSION_SAVE' };

type TCommandListener = (command: TDebugCommand) => void;
type TStateListener = (state: IDebugSimulationState) => void;

const defaultState: IDebugSimulationState = {
  purchaseMode: 'live',
  rewardedAdMode: 'live'
};

let simulationState: IDebugSimulationState = defaultState;

const commandListeners = new Set<TCommandListener>();
const stateListeners = new Set<TStateListener>();

export function dispatchDebugCommand(command: TDebugCommand) {
  if (!isDebugToolsEnabled()) {
    return;
  }

  if (command.type === 'SET_REWARDED_AD_MODE') {
    simulationState = {
      ...simulationState,
      rewardedAdMode: command.mode
    };
    emitState();
  }

  if (command.type === 'SET_PURCHASE_MODE') {
    simulationState = {
      ...simulationState,
      purchaseMode: command.mode
    };
    emitState();
  }

  commandListeners.forEach((listener) => listener(command));
}

export function getDebugSimulationState() {
  return simulationState;
}

export function subscribeDebugCommands(listener: TCommandListener) {
  commandListeners.add(listener);

  return () => {
    commandListeners.delete(listener);
  };
}

export function subscribeDebugSimulationState(listener: TStateListener) {
  stateListeners.add(listener);
  listener(simulationState);

  return () => {
    stateListeners.delete(listener);
  };
}

export function resetDebugSimulationStateForTests() {
  simulationState = defaultState;
  emitState();
}

function emitState() {
  stateListeners.forEach((listener) => listener(simulationState));
}
