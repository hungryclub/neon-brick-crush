import { create } from 'zustand';

import {
  createInitialRuntimeHudSnapshot,
  type IRuntimeHudSnapshot
} from '../../game/hud-bridges/game-runtime-bridge';

interface IUiStoreState {
  storeHasRuntime: boolean;
  storeIsDebugVisible: boolean;
  storeRuntimeHud: IRuntimeHudSnapshot;
  storeSetHasRuntime: (value: boolean) => void;
  storeSetRuntimeHud: (value: IRuntimeHudSnapshot) => void;
  storeToggleDebugVisible: () => void;
}

const useUiStore = create<IUiStoreState>((setState) => ({
  storeHasRuntime: false,
  storeIsDebugVisible: false,
  storeRuntimeHud: createInitialRuntimeHudSnapshot(),
  storeSetHasRuntime(value) {
    setState({ storeHasRuntime: value });
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
