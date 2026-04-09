import { useEffect, useRef } from 'react';
import { useSelector } from '@xstate/react';

import type { IStageSelection } from '../../domain/models/stage-model';
import createProgressionRepository from '../../platform/persistence/progression.repository';
import createGameRuntime from '../../game/core/create-game-runtime';
import {
  createInitialRuntimeHudSnapshot,
  type IGameRuntimeBridge,
  type IRuntimeHudSnapshot
} from '../../game/hud-bridges/game-runtime-bridge';
import createGameRuntimeBridge from '../../game/hud-bridges/game-runtime-bridge';
import HudPanel from '../components/HudPanel';
import WorldMapPanel from '../components/WorldMapPanel';
import { progressionActor } from '../../state/machines/progression.machine';
import { sessionActor } from '../../state/machines/session.machine';
import {
  selectActiveStageSelection,
  selectIsProgressionLoading,
  selectLatestStageCompletion,
  selectWorldMapStageCards
} from '../../state/selectors/progression.selectors';
import {
  selectCanActivateFever,
  selectCanUseRewardedRetry,
  selectFeverMeter,
  selectIsFeverActive,
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
  const progressionRepositoryRef = useRef(createProgressionRepository());
  const runtimeBridgeRef = useRef<IGameRuntimeBridge | null>(null);
  const runtimeHostRef = useRef<HTMLDivElement | null>(null);
  const storeIsDebugVisible = useUiStore((state) => state.storeIsDebugVisible);
  const storeSetHasRuntime = useUiStore((state) => state.storeSetHasRuntime);
  const storeSetRuntimeHud = useUiStore((state) => state.storeSetRuntimeHud);
  const runtimeHud = useUiStore((state) => state.storeRuntimeHud);
  const canActivateFever = useSelector(sessionActor, selectCanActivateFever);
  const canUseRewardedRetry = useSelector(sessionActor, selectCanUseRewardedRetry);
  const feverMeter = useSelector(sessionActor, selectFeverMeter);
  const isFeverActive = useSelector(sessionActor, selectIsFeverActive);
  const isSessionFailed = useSelector(sessionActor, selectIsSessionFailed);
  const isRewardedRetryPending = useSelector(sessionActor, selectIsRewardedRetryPending);
  const sessionPhase = useSelector(sessionActor, selectSessionPhase);
  const isSessionBooting = useSelector(sessionActor, selectIsSessionBooting);
  const isSessionRetrying = useSelector(sessionActor, selectIsSessionRetrying);
  const rewardedRetryFeedback = useSelector(sessionActor, selectRewardedRetryFeedback);
  const retryCount = useSelector(sessionActor, selectRetryCount);
  const activeStageSelection = useSelector(progressionActor, selectActiveStageSelection);
  const isProgressionLoading = useSelector(progressionActor, selectIsProgressionLoading);
  const latestStageCompletion = useSelector(progressionActor, selectLatestStageCompletion);
  const worldMapStageCards = useSelector(progressionActor, selectWorldMapStageCards);

  useEffect(() => {
    let isDisposed = false;

    progressionRepositoryRef.current.load().then((snapshot) => {
      if (isDisposed) {
        return;
      }

      progressionActor.send({ type: 'PROGRESSION_LOADED', snapshot });
    });

    return () => {
      isDisposed = true;
    };
  }, []);

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
    const unsubscribeStageCleared = runtimeBridge.onStageCleared(() => {
      if (!activeStageSelection) {
        return;
      }

      progressionRepositoryRef.current
        .saveStageCompletion({
          ...activeStageSelection,
          starCount: resolveStageStarCount(retryCount)
        })
        .then((snapshot) => {
          progressionActor.send({
            type: 'STAGE_COMPLETED',
            record: {
              ...activeStageSelection,
              starCount: resolveStageStarCount(retryCount)
            },
            snapshot
          });
        });
      sessionActor.send({ type: 'RESET_SESSION' });
    });
    const unsubscribeStageResetCompleted = runtimeBridge.onStageResetCompleted(() => {
      sessionActor.send({ type: 'RETRY_RESTORED' });
    });
    const unsubscribeTurnResolved = runtimeBridge.onTurnResolved((payload) => {
      sessionActor.send({ type: 'TURN_RESOLVED', payload });
    });

    const runtime = createGameRuntime({
      parent: runtimeHostRef.current,
      bridge: runtimeBridge,
      stageSelection: activeStageSelection
    });

    return () => {
      unsubscribeRuntimeReady();
      unsubscribeRuntimeHud();
      unsubscribeStageFailed();
      unsubscribeStageCleared();
      unsubscribeStageResetCompleted();
      unsubscribeTurnResolved();
      runtimeBridgeRef.current = null;
      storeSetHasRuntime(false);
      storeSetRuntimeHud(createInitialRuntimeHudSnapshot());
      runtime.destroy();
    };
  }, [activeStageSelection, retryCount, storeSetHasRuntime, storeSetRuntimeHud]);

  useEffect(() => {
    if (!isSessionRetrying) {
      return;
    }

    runtimeBridgeRef.current?.requestStageReset();
  }, [isSessionRetrying]);

  function handleFeverActivation() {
    sessionActor.send({ type: 'REQUEST_FEVER_ACTIVATION' });

    if (sessionActor.getSnapshot().context.isFeverActive) {
      runtimeBridgeRef.current?.requestFeverActivation();
    }
  }

  return (
    <main style={layoutStyle}>
      <section style={shellLayoutStyle}>
        <WorldMapPanel
          activeStageSelection={activeStageSelection}
          onSelectStage={(selection: IStageSelection) => {
            progressionRepositoryRef.current
              .saveLastPlayedStageSelection(selection)
              .then((snapshot) => {
                progressionActor.send({ type: 'PROGRESSION_LOADED', snapshot });
                progressionActor.send({ type: 'SELECT_STAGE', selection });
              });
            sessionActor.send({ type: 'RESET_SESSION' });
          }}
          stageCards={worldMapStageCards}
        />
        <section style={stageShellStyle}>
          <div ref={runtimeHostRef} id='game-runtime-host' style={runtimeHostStyle} />
          <HudPanel
            canActivateFever={canActivateFever}
            feverMeter={feverMeter}
            isFeverActive={isFeverActive}
            runtimeHud={runtimeHud}
            sessionPhase={sessionPhase}
          />
          <button
            style={{
              ...feverButtonStyle,
              ...(canActivateFever ? feverButtonReadyStyle : feverButtonDisabledStyle),
              ...(isFeverActive ? feverButtonActiveStyle : null)
            }}
            type='button'
            disabled={!canActivateFever || isSessionFailed || isFeverActive}
            onClick={handleFeverActivation}
          >
            {isFeverActive ? 'Fever Active' : canActivateFever ? 'Activate Fever' : 'Build Fever'}
          </button>
          {isSessionBooting || isProgressionLoading ? (
            <div style={bootOverlayStyle}>Booting runtime shell...</div>
          ) : null}
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
          {latestStageCompletion ? (
            <div style={successOverlayStyle}>
              <div style={successCardStyle}>
                <span style={failureEyebrowStyle}>Stage Cleared</span>
                <strong style={failureTitleStyle}>
                  별 {latestStageCompletion.starCount}개를 획득했습니다.
                </strong>
                <p style={failureTextStyle}>
                  월드맵에 결과가 저장되었습니다. 다른 스테이지를 고르거나 같은
                  스테이지를 다시 도전할 수 있어요.
                </p>
                <button
                  style={retryButtonStyle}
                  type='button'
                  onClick={() => {
                    progressionActor.send({ type: 'RETURN_TO_MAP' });
                  }}
                >
                  Back To Map
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </section>
      {storeIsDebugVisible ? (
        <aside style={debugPanelStyle}>
          <strong>Debug</strong>
          <span>session: {sessionPhase}</span>
          <span>turn: {runtimeHud.turnNumber}</span>
          <span>shot: {runtimeHud.shotState}</span>
          <span>retryCount: {retryCount}</span>
          <span>stage: {activeStageSelection?.stageId ?? 'none'}</span>
        </aside>
      ) : null}
    </main>
  );
}

function resolveStageStarCount(retryCount: number) {
  if (retryCount === 0) {
    return 3;
  }

  if (retryCount === 1) {
    return 2;
  }

  return 1;
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

const shellLayoutStyle = {
  width: 'min(100vw, 1240px)',
  display: 'grid',
  gridTemplateColumns: '280px minmax(0, 1fr)',
  borderRadius: '24px',
  overflow: 'hidden',
  border: '1px solid rgba(120, 227, 255, 0.18)',
  boxShadow: '0 20px 80px rgba(0, 0, 0, 0.45)'
} as const;

const stageShellStyle = {
  width: '100%',
  aspectRatio: '16 / 9',
  position: 'relative',
  overflow: 'hidden',
  minHeight: 0
} as const;

const runtimeHostStyle = {
  width: '100%',
  height: '100%'
} as const;

const feverButtonStyle = {
  position: 'absolute',
  right: 18,
  bottom: 18,
  zIndex: 2,
  borderRadius: 999,
  padding: '14px 18px',
  fontWeight: 700,
  border: '1px solid rgba(255, 255, 255, 0.15)',
  transition: 'transform 120ms ease, opacity 120ms ease'
} as const;

const feverButtonDisabledStyle = {
  background: 'rgba(14, 18, 30, 0.78)',
  color: 'rgba(245, 247, 255, 0.55)',
  cursor: 'not-allowed'
} as const;

const feverButtonReadyStyle = {
  background: 'linear-gradient(135deg, #ffe680, #ff7d6b)',
  color: '#1a1020',
  cursor: 'pointer'
} as const;

const feverButtonActiveStyle = {
  background: 'linear-gradient(135deg, #fff1a6, #ff8aa0)',
  color: '#180d1a',
  cursor: 'wait'
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

const successOverlayStyle = {
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  background: 'linear-gradient(180deg, rgba(7, 16, 24, 0.22), rgba(7, 16, 24, 0.76))'
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

const successCardStyle = {
  ...failureCardStyle,
  border: '1px solid rgba(120, 227, 255, 0.35)'
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
