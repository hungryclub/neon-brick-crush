import { create } from 'zustand';

import {
  createInitialRuntimeDebugSnapshot,
  createInitialRuntimeHudSnapshot,
  type IRuntimeDebugSnapshot,
  type IRuntimeHudSnapshot
} from '../../game/hud-bridges/game-runtime-bridge';

interface IUiStoreState {
  storeHasRuntime: boolean;
  storeIsDebugVisible: boolean;
  storeRuntimeDebug: IRuntimeDebugSnapshot;
  storeRuntimeHud: IRuntimeHudSnapshot;
  storeSetHasRuntime: (value: boolean) => void;
  storeSetRuntimeDebug: (value: IRuntimeDebugSnapshot) => void;
  storeSetRuntimeHud: (value: IRuntimeHudSnapshot) => void;
  storeToggleDebugVisible: () => void;
}

const useUiStore = create<IUiStoreState>((setState) => ({
  storeHasRuntime: false,
  storeIsDebugVisible: false,
  storeRuntimeDebug: createInitialRuntimeDebugSnapshot(),
  storeRuntimeHud: createInitialRuntimeHudSnapshot(),
  storeSetHasRuntime(value) {
    setState({ storeHasRuntime: value });
  },
  storeSetRuntimeDebug(value) {
    setState({ storeRuntimeDebug: value });
  },
  storeSetRuntimeHud(value) {
    setState({ storeRuntimeHud: value });
  },
  storeToggleDebugVisible() {
    setState((state) => ({
      storeIsDebugVisible: !state.storeIsDebugVisible
    }));
  }
}));

export default useUiStore;
