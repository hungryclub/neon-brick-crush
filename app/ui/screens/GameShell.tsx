import { useEffect, useRef } from 'react';
import { useSelector } from '@xstate/react';

import createGameRuntime from '../../game/core/create-game-runtime';
import {
  createInitialRuntimeHudSnapshot,
  type IGameRuntimeBridge,
  type IRuntimeHudSnapshot
} from '../../game/hud-bridges/game-runtime-bridge';
import createGameRuntimeBridge from '../../game/hud-bridges/game-runtime-bridge';
import HudPanel from '../components/HudPanel';
import { sessionActor } from '../../state/machines/session.machine';
import {
  selectCanUseRewardedRetry,
  selectIsSessionBooting,
  selectIsSessionFailed,
  selectIsRewardedRetryPending,
  selectIsSessionRetrying,
  selectRewardedRetryFeedback,
  selectRetryCount,
  selectSessionPhase
} from '../../state/selectors/session.selectors';
import useUiStore from '../../state/stores/use-ui-store';

export default function GameShell() {
  const runtimeBridgeRef = useRef<IGameRuntimeBridge | null>(null);
  const runtimeHostRef = useRef<HTMLDivElement | null>(null);
  const storeIsDebugVisible = useUiStore((state) => state.storeIsDebugVisible);
  const storeSetHasRuntime = useUiStore((state) => state.storeSetHasRuntime);
  const storeSetRuntimeHud = useUiStore((state) => state.storeSetRuntimeHud);
  const runtimeHud = useUiStore((state) => state.storeRuntimeHud);
  const canUseRewardedRetry = useSelector(sessionActor, selectCanUseRewardedRetry);
  const isSessionFailed = useSelector(sessionActor, selectIsSessionFailed);
  const isRewardedRetryPending = useSelector(sessionActor, selectIsRewardedRetryPending);
  const sessionPhase = useSelector(sessionActor, selectSessionPhase);
  const isSessionBooting = useSelector(sessionActor, selectIsSessionBooting);
  const isSessionRetrying = useSelector(sessionActor, selectIsSessionRetrying);
  const rewardedRetryFeedback = useSelector(sessionActor, selectRewardedRetryFeedback);
  const retryCount = useSelector(sessionActor, selectRetryCount);

  useEffect(() => {
    if (!runtimeHostRef.current) return;

    const runtimeBridge = createGameRuntimeBridge();
    runtimeBridgeRef.current = runtimeBridge;
    const unsubscribeRuntimeReady = runtimeBridge.onRuntimeReady(() => {
      storeSetHasRuntime(true);
      sessionActor.send({ type: 'BOOT_FINISHED' });
    });
    const unsubscribeRuntimeHud = runtimeBridge.onRuntimeHudChanged(
      (snapshot: IRuntimeHudSnapshot) => {
        storeSetRuntimeHud(snapshot);
      }
    );
    const unsubscribeStageFailed = runtimeBridge.onStageFailed(() => {
      sessionActor.send({ type: 'STAGE_FAILED' });
    });
    const unsubscribeStageResetCompleted = runtimeBridge.onStageResetCompleted(() => {
      sessionActor.send({ type: 'RETRY_RESTORED' });
    });

    const runtime = createGameRuntime({
      parent: runtimeHostRef.current,
      bridge: runtimeBridge
    });

    return () => {
      unsubscribeRuntimeReady();
      unsubscribeRuntimeHud();
      unsubscribeStageFailed();
      unsubscribeStageResetCompleted();
      runtimeBridgeRef.current = null;
      storeSetHasRuntime(false);
      storeSetRuntimeHud(createInitialRuntimeHudSnapshot());
      runtime.destroy();
    };
  }, [storeSetHasRuntime, storeSetRuntimeHud]);

  useEffect(() => {
    if (!isSessionRetrying) {
      return;
    }

    runtimeBridgeRef.current?.requestStageReset();
  }, [isSessionRetrying]);

  return (
    <main style={layoutStyle}>
      <section style={stageShellStyle}>
        <div ref={runtimeHostRef} id='game-runtime-host' style={runtimeHostStyle} />
        <HudPanel runtimeHud={runtimeHud} sessionPhase={sessionPhase} />
        {isSessionBooting ? <div style={bootOverlayStyle}>Booting runtime shell...</div> : null}
        {isSessionFailed ? (
          <div style={failureOverlayStyle}>
            <div style={failureCardStyle}>
              <span style={failureEyebrowStyle}>Stage Failed</span>
              <strong style={failureTitleStyle}>즉시 다시 도전할 수 있어요.</strong>
              <p style={failureTextStyle}>
                압박선에 닿았습니다. 전체 앱을 다시 여는 대신 지금 상태에서 바로
                스테이지를 복구합니다.
              </p>
              <button
                style={retryButtonStyle}
                type='button'
                onClick={() => {
                  sessionActor.send({ type: 'REQUEST_RETRY' });
                }}
              >
                Instant Retry
              </button>
              {canUseRewardedRetry ? (
                <button
                  style={{
                    ...secondaryRetryButtonStyle,
                    ...(isRewardedRetryPending ? disabledButtonStyle : null)
                  }}
                  type='button'
                  disabled={isRewardedRetryPending}
                  onClick={() => {
                    sessionActor.send({ type: 'REQUEST_REWARDED_RETRY' });
                  }}
                >
                  {isRewardedRetryPending ? 'Watching Ad...' : 'Rewarded Retry'}
                </button>
              ) : null}
              {rewardedRetryFeedback ? (
                <p style={failureNoticeStyle}>{rewardedRetryFeedback}</p>
              ) : null}
              <span style={failureMetaStyle}>retry count: {retryCount}</span>
            </div>
          </div>
        ) : null}
      </section>
      {storeIsDebugVisible ? (
        <aside style={debugPanelStyle}>
          <strong>Debug</strong>
          <span>session: {sessionPhase}</span>
          <span>turn: {runtimeHud.turnNumber}</span>
          <span>shot: {runtimeHud.shotState}</span>
          <span>retryCount: {retryCount}</span>
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

const bootOverlayStyle = {
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  background: 'linear-gradient(180deg, rgba(4, 8, 18, 0.28), rgba(4, 8, 18, 0.64))',
  color: '#f5f7ff',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  fontSize: 12,
  pointerEvents: 'none'
} as const;

const failureOverlayStyle = {
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  background: 'linear-gradient(180deg, rgba(8, 10, 22, 0.32), rgba(8, 10, 22, 0.76))'
} as const;

const failureCardStyle = {
  width: 'min(84%, 360px)',
  display: 'grid',
  gap: 12,
  padding: '24px 22px',
  borderRadius: 24,
  background: 'rgba(18, 20, 38, 0.92)',
  border: '1px solid rgba(255, 120, 199, 0.35)',
  boxShadow: '0 18px 60px rgba(0, 0, 0, 0.38)',
  textAlign: 'center'
} as const;

const failureEyebrowStyle = {
  color: '#ff89bf',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontSize: 11
} as const;

const failureTitleStyle = {
  fontSize: 24
} as const;

const failureTextStyle = {
  margin: 0,
  color: 'rgba(245, 247, 255, 0.78)',
  lineHeight: 1.5,
  fontSize: 14
} as const;

const retryButtonStyle = {
  border: 'none',
  borderRadius: 999,
  padding: '14px 18px',
  background: 'linear-gradient(135deg, #78e3ff, #ff67b0)',
  color: '#08101f',
  fontWeight: 700,
  cursor: 'pointer'
} as const;

const secondaryRetryButtonStyle = {
  borderRadius: 999,
  padding: '14px 18px',
  background: 'rgba(120, 227, 255, 0.08)',
  color: '#d8efff',
  border: '1px solid rgba(120, 227, 255, 0.32)',
  fontWeight: 700,
  cursor: 'pointer'
} as const;

const disabledButtonStyle = {
  opacity: 0.6,
  cursor: 'wait'
} as const;

const failureNoticeStyle = {
  margin: 0,
  color: '#ffd3e5',
  fontSize: 13,
  lineHeight: 1.45
} as const;

const failureMetaStyle = {
  color: 'rgba(245, 247, 255, 0.62)',
  fontSize: 12
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
