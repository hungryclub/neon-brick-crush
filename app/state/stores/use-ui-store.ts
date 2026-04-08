import { create } from 'zustand';

interface IUiStoreState {
  storeHasRuntime: boolean;
  storeIsDebugVisible: boolean;
  storeSetHasRuntime: (value: boolean) => void;
  storeToggleDebugVisible: () => void;
}

const useUiStore = create<IUiStoreState>((setState) => ({
  storeHasRuntime: false,
  storeIsDebugVisible: false,
  storeSetHasRuntime(value) {
    setState({ storeHasRuntime: value });
  },
  storeToggleDebugVisible() {
    setState((state) => ({
      storeIsDebugVisible: !state.storeIsDebugVisible
    }));
  }
}));

export default useUiStore;
