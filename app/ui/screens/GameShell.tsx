import { useEffect, useRef } from 'react';
import { useSelector } from '@xstate/react';

import createGameRuntime from '../../game/core/create-game-runtime';
import HudPanel from '../components/HudPanel';
import { sessionActor } from '../../state/machines/session.machine';
import useUiStore from '../../state/stores/use-ui-store';

const selectSessionPhase = (
  state: ReturnType<typeof sessionActor.getSnapshot>
) =>
  state.value.toString();

export default function GameShell() {
  const runtimeHostRef = useRef<HTMLDivElement | null>(null);
  const storeIsDebugVisible = useUiStore((state) => state.storeIsDebugVisible);
  const storeSetHasRuntime = useUiStore((state) => state.storeSetHasRuntime);
  const sessionPhase = useSelector(sessionActor, selectSessionPhase);

  useEffect(() => {
    if (!runtimeHostRef.current) return;

    const runtime = createGameRuntime({
      parent: runtimeHostRef.current,
      onRuntimeReady() {
        storeSetHasRuntime(true);
        sessionActor.send({ type: 'BOOT_FINISHED' });
      }
    });

    return () => {
      storeSetHasRuntime(false);
      runtime.destroy();
    };
  }, [storeSetHasRuntime]);

  return (
    <main style={layoutStyle}>
      <section style={stageShellStyle}>
        <div ref={runtimeHostRef} id='game-runtime-host' style={runtimeHostStyle} />
        <HudPanel sessionPhase={sessionPhase} />
      </section>
      {storeIsDebugVisible ? (
        <aside style={debugPanelStyle}>
          <strong>Debug</strong>
          <span>session: {sessionPhase}</span>
        </aside>
      ) : null}
    </main>
  );
}

const layoutStyle = {
  minHeight: '100vh',
  margin: 0,
  display: 'grid',
  placeItems: 'center',
  background:
    'radial-gradient(circle at top, #1e2b5f 0%, #090b17 48%, #030409 100%)',
  color: '#f5f7ff',
  fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif"
} as const;

const stageShellStyle = {
  width: 'min(100vw, 960px)',
  aspectRatio: '16 / 9',
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '24px',
  border: '1px solid rgba(120, 227, 255, 0.28)',
  boxShadow: '0 20px 80px rgba(0, 0, 0, 0.45)'
} as const;

const runtimeHostStyle = {
  width: '100%',
  height: '100%'
} as const;

const debugPanelStyle = {
  position: 'fixed',
  top: 16,
  right: 16,
  display: 'grid',
  gap: 6,
  padding: '12px 14px',
  borderRadius: 12,
  background: 'rgba(6, 10, 20, 0.82)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  fontSize: 12
} as const;
