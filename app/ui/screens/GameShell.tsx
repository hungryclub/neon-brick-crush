import { useEffect, useRef, useState } from 'react';
import { useSelector } from '@xstate/react';

import {
  dispatchDebugCommand,
  getDebugSimulationState,
  subscribeDebugCommands,
  subscribeDebugSimulationState,
  type IDebugSimulationState
} from '../../debug/debug-command-bus.ts';
import { isDebugToolsEnabled } from '../../debug/debug-flags.ts';
import type { IStageSelection, TStageKind } from '../../domain/models/stage-model';
import { loadStageRuntimeConfig } from '../../assets/loaders/stage-config.loader.ts';
import createProgressionRepository from '../../platform/persistence/progression.repository';
import { createInitialProgressionSnapshot } from '../../platform/persistence/save-recovery.ts';
import createGameRuntime from '../../game/core/create-game-runtime';
import createLogger from '../../shared/logging/create-logger';
import { resolveStagePromptText } from '../../game/systems/stage-rule-profile';
import {
  FEVER_METER_MAX,
  resolveFeverStatusPrompt
} from '../../game/systems/fever-overdrive.ts';
import {
  createInitialRuntimeDebugSnapshot,
  createInitialRuntimeHudSnapshot,
  type IGameRuntimeBridge,
  type IRuntimeDebugSnapshot,
  type IRuntimeHudSnapshot
} from '../../game/hud-bridges/game-runtime-bridge';
import createGameRuntimeBridge from '../../game/hud-bridges/game-runtime-bridge';
import DebugOverlay from '../components/DebugOverlay';
import HudPanel from '../components/HudPanel';
import StageProfileBanner from '../components/StageProfileBanner';
import WorldMapPanel from '../components/WorldMapPanel';
import MobileMapLayout from '../layouts/MobileMapLayout';
import MobilePlayLayout from '../layouts/MobilePlayLayout';
import { eventActor } from '../../state/machines/event.machine.ts';
import { monetizationActor } from '../../state/machines/monetization.machine.ts';
import { progressionActor } from '../../state/machines/progression.machine';
import { sessionActor } from '../../state/machines/session.machine';
import {
  selectEventClaimFeedback,
  selectIsEventClaimPending,
  selectLatestEventClaimError,
  selectLatestClaimedEventId
} from '../../state/selectors/event.selectors.ts';
import {
  selectHasPurchasedFeaturedPack,
  selectIsPurchasePending,
  selectPurchaseFeedback
} from '../../state/selectors/monetization.selectors.ts';
import {
  selectActiveStageSelection,
  selectActiveEventCards,
  selectIsProgressionLoading,
  selectLatestStageCompletion,
  selectWorldMapWorlds
} from '../../state/selectors/progression.selectors';
import {
  selectActiveFeverMode,
  selectCanActivateFever,
  selectFeverButtonLabel,
  selectCanUseRewardedRetry,
  selectFeverHudValue,
  selectFeverMeter,
  selectFeverReadyMode,
  selectFeverTone,
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
  const debugToolsEnabled = isDebugToolsEnabled();
  const loggerRef = useRef(createLogger());
  const progressionRepositoryRef = useRef(createProgressionRepository());
  const retryCountRef = useRef(0);
  const runtimeBridgeRef = useRef<IGameRuntimeBridge | null>(null);
  const runtimeHostRef = useRef<HTMLDivElement | null>(null);
  const storeIsDebugVisible = useUiStore((state) => state.storeIsDebugVisible);
  const storeSetHasRuntime = useUiStore((state) => state.storeSetHasRuntime);
  const storeRuntimeDebug = useUiStore((state) => state.storeRuntimeDebug);
  const storeSetRuntimeDebug = useUiStore((state) => state.storeSetRuntimeDebug);
  const storeSetRuntimeHud = useUiStore((state) => state.storeSetRuntimeHud);
  const storeToggleDebugVisible = useUiStore((state) => state.storeToggleDebugVisible);
  const runtimeHud = useUiStore((state) => state.storeRuntimeHud);
  const canActivateFever = useSelector(sessionActor, selectCanActivateFever);
  const activeFeverMode = useSelector(sessionActor, selectActiveFeverMode);
  const canUseRewardedRetry = useSelector(sessionActor, selectCanUseRewardedRetry);
  const feverButtonLabel = useSelector(sessionActor, selectFeverButtonLabel);
  const feverHudValue = useSelector(sessionActor, selectFeverHudValue);
  const eventClaimFeedback = useSelector(eventActor, selectEventClaimFeedback);
  const isEventClaimPending = useSelector(eventActor, selectIsEventClaimPending);
  const latestEventClaimError = useSelector(eventActor, selectLatestEventClaimError);
  const feverMeter = useSelector(sessionActor, selectFeverMeter);
  const readyFeverMode = useSelector(sessionActor, selectFeverReadyMode);
  const feverTone = useSelector(sessionActor, selectFeverTone);
  const hasPurchasedFeaturedPack = useSelector(
    monetizationActor,
    selectHasPurchasedFeaturedPack
  );
  const isFeverActive = useSelector(sessionActor, selectIsFeverActive);
  const isPurchasePending = useSelector(monetizationActor, selectIsPurchasePending);
  const isSessionFailed = useSelector(sessionActor, selectIsSessionFailed);
  const isRewardedRetryPending = useSelector(sessionActor, selectIsRewardedRetryPending);
  const sessionPhase = useSelector(sessionActor, selectSessionPhase);
  const isSessionBooting = useSelector(sessionActor, selectIsSessionBooting);
  const isSessionRetrying = useSelector(sessionActor, selectIsSessionRetrying);
  const latestClaimedEventId = useSelector(eventActor, selectLatestClaimedEventId);
  const purchaseFeedback = useSelector(monetizationActor, selectPurchaseFeedback);
  const rewardedRetryFeedback = useSelector(sessionActor, selectRewardedRetryFeedback);
  const retryCount = useSelector(sessionActor, selectRetryCount);
  const activeStageSelection = useSelector(progressionActor, selectActiveStageSelection);
  const activeEventCards = useSelector(progressionActor, selectActiveEventCards);
  const isProgressionLoading = useSelector(progressionActor, selectIsProgressionLoading);
  const latestStageCompletion = useSelector(progressionActor, selectLatestStageCompletion);
  const worldMapWorldSections = useSelector(progressionActor, selectWorldMapWorlds);
  const loggedEventLoadRef = useRef(false);
  const appliedEventClaimRef = useRef<string | null>(null);
  const loggedEventErrorRef = useRef<string | null>(null);
  const [pendingStageClearSave, setPendingStageClearSave] = useState<{
    selection: IStageSelection;
    stageKind?: TStageKind;
    stageTitle?: string;
    starCount: number;
  } | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [debugSimulationState, setDebugSimulationState] = useState<IDebugSimulationState>(
    getDebugSimulationState()
  );
  const [mobileView, setMobileView] = useState<'play' | 'map'>('play');
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1280 : window.innerWidth
  );
  const activeStageRuntimeConfig = activeStageSelection
    ? loadStageRuntimeConfig(activeStageSelection).match(
        (config) => config,
        () => null
      )
    : null;
  const isCompactLayout = viewportWidth < 1080;
  const isMobileLayout = viewportWidth < 760;
  const shouldMountRuntime = !isMobileLayout || mobileView === 'play';

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const documentElement = document.documentElement;
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    const previousMargin = document.body.style.margin;
    const previousPadding = document.body.style.padding;
    const previousHtmlMargin = documentElement.style.margin;
    const previousHtmlPadding = documentElement.style.padding;
    const previousHtmlOverflow = documentElement.style.overflow;

    if (viewportWidth < 760) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'manipulation';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      documentElement.style.margin = '0';
      documentElement.style.padding = '0';
      documentElement.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
      document.body.style.margin = previousMargin;
      document.body.style.padding = previousPadding;
      documentElement.style.margin = previousHtmlMargin;
      documentElement.style.padding = previousHtmlPadding;
      documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [viewportWidth]);

  useEffect(() => {
    retryCountRef.current = retryCount;
  }, [retryCount]);

  useEffect(() => {
    if (!debugToolsEnabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.shiftKey || event.key.toLowerCase() !== 'd') {
        return;
      }

      event.preventDefault();
      storeToggleDebugVisible();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [debugToolsEnabled, storeToggleDebugVisible]);

  useEffect(() => {
    if (!debugToolsEnabled) {
      return;
    }

    return subscribeDebugSimulationState((state) => {
      setDebugSimulationState(state);
    });
  }, [debugToolsEnabled]);

  useEffect(() => {
    if (!debugToolsEnabled) {
      return;
    }

    return subscribeDebugCommands((command) => {
      if (command.type === 'FORCE_STAGE_FAILURE') {
        runtimeBridgeRef.current?.requestForcedFailure();
        return;
      }

      if (command.type !== 'RESET_PROGRESSION_SAVE') {
        return;
      }

      progressionRepositoryRef.current.debugResetProgression().then((result) => {
        if (result.isErr()) {
          loggerRef.current.warn('debug.reset_progression_failed', {
            code: result.error.code,
            message: result.error.message
          });
          return;
        }

        progressionActor.send({
          type: 'PROGRESSION_LOADED',
          snapshot: result.value
        });
        progressionActor.send({ type: 'RETURN_TO_MAP' });
        sessionActor.send({ type: 'RESET_SESSION' });
        setPendingStageClearSave(null);
        setSaveErrorMessage(null);
        loggerRef.current.info('debug.reset_progression_applied', {
          activeStageId: activeStageSelection?.stageId ?? null
        });
      });
    });
  }, [activeStageSelection?.stageId, debugToolsEnabled]);

  useEffect(() => {
    let isDisposed = false;
    let hasResolvedProgressionLoad = false;
    const loadFallbackTimeout = window.setTimeout(() => {
      if (isDisposed || hasResolvedProgressionLoad) {
        return;
      }

      hasResolvedProgressionLoad = true;
      loggerRef.current.warn('progression.load_timeout_recovered', {
        reason: 'repository_load_timeout'
      });
      progressionActor.send({
        type: 'PROGRESSION_LOADED',
        snapshot: createInitialProgressionSnapshot()
      });
    }, 1500);

    progressionRepositoryRef.current
      .load()
      .then((result) => {
        if (isDisposed || hasResolvedProgressionLoad) {
          return;
        }

        hasResolvedProgressionLoad = true;
        window.clearTimeout(loadFallbackTimeout);

        if (result.isErr()) {
          loggerRef.current.warn('progression.load_recovered', {
            code: result.error.code,
            message: result.error.message
          });
          progressionActor.send({
            type: 'PROGRESSION_LOADED',
            snapshot: createInitialProgressionSnapshot()
          });
          return;
        }

        progressionActor.send({ type: 'PROGRESSION_LOADED', snapshot: result.value });
      })
      .catch((error: unknown) => {
        if (isDisposed || hasResolvedProgressionLoad) {
          return;
        }

        hasResolvedProgressionLoad = true;
        window.clearTimeout(loadFallbackTimeout);
        loggerRef.current.warn('progression.load_recovered', {
          code: 'SAVE_LOAD_FAILED',
          message: error instanceof Error ? error.message : 'Unexpected progression load failure.'
        });
        progressionActor.send({
          type: 'PROGRESSION_LOADED',
          snapshot: createInitialProgressionSnapshot()
        });
      });

    return () => {
      isDisposed = true;
      window.clearTimeout(loadFallbackTimeout);
    };
  }, []);

  useEffect(() => {
    if (isProgressionLoading || loggedEventLoadRef.current) {
      return;
    }

    loggedEventLoadRef.current = true;
    loggerRef.current.info('event.loaded', {
      activeEventCount: activeEventCards.length
    });
  }, [activeEventCards.length, isProgressionLoading]);

  useEffect(() => {
    const snapshot = eventActor.getSnapshot().context.latestSnapshot;

    if (!latestClaimedEventId || !snapshot || appliedEventClaimRef.current === latestClaimedEventId) {
      return;
    }

    appliedEventClaimRef.current = latestClaimedEventId;
    progressionActor.send({ type: 'PROGRESSION_LOADED', snapshot });
    loggerRef.current.info('event.claim_granted', {
      eventId: latestClaimedEventId,
      activeStageId: activeStageSelection?.stageId ?? null
    });
  }, [activeStageSelection?.stageId, latestClaimedEventId]);

  useEffect(() => {
    if (!latestEventClaimError) {
      return;
    }

    const errorKey = `${latestEventClaimError.code}:${latestEventClaimError.message}`;

    if (loggedEventErrorRef.current === errorKey) {
      return;
    }

    loggedEventErrorRef.current = errorKey;
    loggerRef.current.warn('event.claim_rejected', {
      code: latestEventClaimError.code,
      message: latestEventClaimError.message
    });
  }, [latestEventClaimError]);

  useEffect(() => {
    if (!shouldMountRuntime || !runtimeHostRef.current || isProgressionLoading) return;

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
    const unsubscribeRuntimeDebug = runtimeBridge.onRuntimeDebugChanged(
      (snapshot: IRuntimeDebugSnapshot) => {
        storeSetRuntimeDebug(snapshot);
      }
    );
    const unsubscribeStageFailed = runtimeBridge.onStageFailed(() => {
      sessionActor.send({ type: 'STAGE_FAILED' });
    });
    const unsubscribeStageCleared = runtimeBridge.onStageCleared(() => {
      if (!activeStageSelection) {
        return;
      }

      const starCount = resolveStageStarCount(retryCountRef.current);

      setPendingStageClearSave({
        selection: activeStageSelection,
        stageKind: activeStageRuntimeConfig?.stageKind,
        stageTitle: activeStageRuntimeConfig?.stageTitle,
        starCount
      });
      setSaveErrorMessage(null);
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
      unsubscribeRuntimeDebug();
      unsubscribeStageFailed();
      unsubscribeStageCleared();
      unsubscribeStageResetCompleted();
      unsubscribeTurnResolved();
      runtimeBridgeRef.current = null;
      storeSetHasRuntime(false);
      storeSetRuntimeDebug(createInitialRuntimeDebugSnapshot());
      storeSetRuntimeHud(createInitialRuntimeHudSnapshot());
      runtime.destroy();
    };
  }, [
    activeStageSelection,
    isProgressionLoading,
    shouldMountRuntime,
    storeSetHasRuntime,
    storeSetRuntimeDebug,
    storeSetRuntimeHud
  ]);

  useEffect(() => {
    if (!pendingStageClearSave) {
      return;
    }

    let isDisposed = false;

    progressionRepositoryRef.current
      .saveStageCompletion({
        ...pendingStageClearSave.selection,
        starCount: pendingStageClearSave.starCount
      })
      .then((result) => {
        if (isDisposed) {
          return;
        }

        if (result.isErr()) {
          loggerRef.current.warn('progression.save_stage_completion_failed', {
            code: result.error.code,
            message: result.error.message
          });
          setSaveErrorMessage('클리어 보상을 저장하지 못했습니다. 다시 저장을 시도해 주세요.');
          return;
        }

        const snapshot = result.value;
        const unlockedWorldIds = snapshot.unlockedWorldIdList.filter(
          (worldId) => !latestUnlockedWorldIdsRef.current.includes(worldId)
        );

        progressionActor.send({
          type: 'STAGE_COMPLETED',
          record: {
            ...pendingStageClearSave.selection,
            starCount: pendingStageClearSave.starCount,
            stageKind: pendingStageClearSave.stageKind,
            stageTitle: pendingStageClearSave.stageTitle,
            unlockedWorldIds
          },
          snapshot
        });
        latestUnlockedWorldIdsRef.current = snapshot.unlockedWorldIdList;
        setPendingStageClearSave(null);
        setSaveErrorMessage(null);
        sessionActor.send({ type: 'RESET_SESSION' });
      });

    return () => {
      isDisposed = true;
    };
  }, [pendingStageClearSave]);

  const latestUnlockedWorldIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!isProgressionLoading) {
      const snapshot = progressionActor.getSnapshot().context.snapshot;
      latestUnlockedWorldIdsRef.current = snapshot?.unlockedWorldIdList ?? [];
    }
  }, [isProgressionLoading]);

  useEffect(() => {
    if (!isSessionRetrying) {
      return;
    }

    runtimeBridgeRef.current?.requestStageReset();
  }, [isSessionRetrying]);

  function handleFeverActivation() {
    sessionActor.send({ type: 'REQUEST_FEVER_ACTIVATION' });

    const sessionSnapshot = sessionActor.getSnapshot().context;

    if (sessionSnapshot.isFeverActive && sessionSnapshot.activeFeverMode) {
      runtimeBridgeRef.current?.requestFeverActivation(sessionSnapshot.activeFeverMode);
    }
  }

  const handleOpenMobileMap = () => {
    setMobileView('map');
  };
  const handleReturnToPlay = () => {
    sessionActor.send({ type: 'RESET_SESSION' });
    setMobileView('play');
  };
  const handleSelectStage = (selection: IStageSelection) => {
    progressionRepositoryRef.current
      .saveLastPlayedStageSelection(selection)
      .then((result) => {
        if (result.isErr()) {
          loggerRef.current.warn('progression.save_selection_failed', {
            code: result.error.code,
            message: result.error.message
          });
          return;
        }

        const snapshot = result.value;
        progressionActor.send({ type: 'PROGRESSION_LOADED', snapshot });
        progressionActor.send({ type: 'SELECT_STAGE', selection });
      });
    sessionActor.send({ type: 'RESET_SESSION' });
    setMobileView('play');
  };
  const handlePlaySelectedStage = (selection: IStageSelection) => {
    handleSelectStage(selection);
  };
  const handleClaimEventReward = (claim: { eventId: string; rewardId: string }) => {
    loggerRef.current.info('event.claim_attempted', {
      eventId: claim.eventId,
      rewardId: claim.rewardId,
      activeStageId: activeStageSelection?.stageId ?? null
    });
    eventActor.send({
      type: 'REQUEST_EVENT_CLAIM',
      eventId: claim.eventId,
      rewardId: claim.rewardId
    });
  };
  const handlePurchaseFeatured = () => {
    monetizationActor.send({ type: 'REQUEST_FEATURED_PURCHASE' });
  };
  const mapPanel = (
    <WorldMapPanel
      activeStageSelection={activeStageSelection}
      activeEventCards={activeEventCards}
      compact={isCompactLayout}
      eventClaimFeedback={eventClaimFeedback}
      featuredPurchaseLabel='Supporter Pack'
      hasPurchasedFeaturedPack={hasPurchasedFeaturedPack}
      isEventClaimPending={isEventClaimPending}
      isPurchasePending={isPurchasePending}
      onClaimEventReward={handleClaimEventReward}
      onSelectStage={handleSelectStage}
      onPurchaseFeatured={handlePurchaseFeatured}
      purchaseFeedback={purchaseFeedback}
      worldSections={worldMapWorldSections}
    />
  );
  const stageBanner = (
    <StageProfileBanner
      compact={isCompactLayout}
      runtimeHud={runtimeHud}
      stageRuntimeConfig={activeStageRuntimeConfig}
    />
  );
  const hudPanel = (
    <HudPanel
      canActivateFever={canActivateFever}
      compact={isCompactLayout}
      feverHudValue={feverHudValue}
      feverMeter={feverMeter}
      isFeverActive={isFeverActive}
      runtimeHud={runtimeHud}
      sessionPhase={sessionPhase}
      feverTone={feverTone}
    />
  );
  const mobilePromptText =
    resolveFeverStatusPrompt({
      activeMode: activeFeverMode,
      readyMode: readyFeverMode
    }) ??
    (activeStageRuntimeConfig
      ? resolveStagePromptText(
          activeStageRuntimeConfig,
          runtimeHud.turnNumber,
          runtimeHud.shotState
        )
      : '');

  if (isMobileLayout) {
    return (
      <main style={resolveLayoutStyle(true)}>
        {mobileView === 'play' ? (
          <MobilePlayLayout
            canActivateFever={canActivateFever}
            canUseRewardedRetry={canUseRewardedRetry}
            feverButtonLabel={feverButtonLabel}
            feverMeter={feverMeter}
            feverHudValue={feverHudValue}
            isFeverActive={isFeverActive}
            isProgressionLoading={isProgressionLoading}
            isRewardedRetryPending={isRewardedRetryPending}
            isSessionBooting={isSessionBooting}
            isSessionFailed={isSessionFailed}
            latestStageCompletion={latestStageCompletion}
            onActivateFever={handleFeverActivation}
            onBackToMap={() => {
              progressionActor.send({ type: 'RETURN_TO_MAP' });
              setMobileView('map');
            }}
            onOpenMap={handleOpenMobileMap}
            onRetry={() => {
              sessionActor.send({ type: 'REQUEST_RETRY' });
            }}
            onRetrySave={() => {
              setPendingStageClearSave((value) => (value ? { ...value } : value));
            }}
            onRewardedRetry={() => {
              sessionActor.send({ type: 'REQUEST_REWARDED_RETRY' });
            }}
            retryCount={retryCount}
            rewardedRetryFeedback={rewardedRetryFeedback}
            runtimeHostRef={runtimeHostRef}
            runtimeHud={runtimeHud}
            saveErrorMessage={saveErrorMessage}
            sessionPhase={sessionPhase}
            stageRuntimeConfig={activeStageRuntimeConfig}
            feverTone={feverTone}
            overlayContent={
              mobilePromptText ? (
                <div style={mobileFeverOverlayStyle}>
                  <div
                    style={resolveMobileFeverPromptStyle({
                      feverTone,
                      isEmphasized: Boolean(activeFeverMode || readyFeverMode)
                    })}
                  >
                    {mobilePromptText}
                  </div>
                  <div style={mobileFeverRailTrackStyle}>
                    <div
                      style={resolveMobileFeverRailFillStyle({
                        feverMeter,
                        feverTone,
                        isFeverActive
                      })}
                    />
                  </div>
                </div>
              ) : null
            }
          />
        ) : (
          <MobileMapLayout
            activeStageSelection={activeStageSelection}
            featuredPurchaseLabel='Supporter Pack'
            hasPurchasedFeaturedPack={hasPurchasedFeaturedPack}
            isPurchasePending={isPurchasePending}
            onBackToPlay={handleReturnToPlay}
            onPlaySelectedStage={handlePlaySelectedStage}
            onPurchaseFeatured={handlePurchaseFeatured}
            onSelectStage={handleSelectStage}
            purchaseFeedback={purchaseFeedback}
            worldSections={worldMapWorldSections}
          />
        )}
        {debugToolsEnabled ? (
          <>
            <button
              style={debugToggleButtonStyle}
              type='button'
              onClick={() => {
                storeToggleDebugVisible();
              }}
            >
              {storeIsDebugVisible ? 'Hide Debug' : 'Show Debug'}
            </button>
            <DebugOverlay
              activeStageId={activeStageSelection?.stageId ?? null}
              canUseRewardedRetry={canUseRewardedRetry}
              isVisible={storeIsDebugVisible}
              onClose={() => {
                storeToggleDebugVisible();
              }}
              onForceFailure={() => {
                dispatchDebugCommand({ type: 'FORCE_STAGE_FAILURE' });
              }}
              onResetProgressionSave={() => {
                dispatchDebugCommand({ type: 'RESET_PROGRESSION_SAVE' });
              }}
              onSetPurchaseMode={(mode) => {
                dispatchDebugCommand({ type: 'SET_PURCHASE_MODE', mode });
              }}
              onSetRewardedAdMode={(mode) => {
                dispatchDebugCommand({ type: 'SET_REWARDED_AD_MODE', mode });
              }}
              runtimeDebug={storeRuntimeDebug}
              runtimeHud={runtimeHud}
              saveErrorMessage={saveErrorMessage}
              sessionPhase={sessionPhase}
              simulationState={debugSimulationState}
            />
          </>
        ) : null}
      </main>
    );
  }

  return (
    <main style={resolveLayoutStyle(false)}>
      <section style={resolveShellLayoutStyle(isCompactLayout)}>
        <section style={resolveStageColumnStyle(isCompactLayout)}>
          <div style={resolveInfoRailStyle(isCompactLayout)}>{stageBanner}{hudPanel}</div>
          <section style={resolveStageShellStyle(isCompactLayout)}>
            <div ref={runtimeHostRef} id='game-runtime-host' style={runtimeHostStyle} />
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
            {saveErrorMessage ? (
              <div style={failureOverlayStyle}>
                <div style={failureCardStyle}>
                  <span style={failureEyebrowStyle}>Save Failed</span>
                  <strong style={failureTitleStyle}>클리어 보상을 아직 저장하지 못했습니다.</strong>
                  <p style={failureTextStyle}>{saveErrorMessage}</p>
                  <button
                    style={retryButtonStyle}
                    type='button'
                    onClick={() => {
                      setPendingStageClearSave((value) => (value ? { ...value } : value));
                    }}
                  >
                    Retry Save
                  </button>
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
                    {latestStageCompletion.stageKind === 'climax' &&
                    latestStageCompletion.unlockedWorldIds?.length
                      ? `월드 마지막을 돌파해 ${latestStageCompletion.unlockedWorldIds.length}개의 새 월드가 해금되었습니다.`
                      : '월드맵에 결과가 저장되었습니다. 다른 스테이지를 고르거나 같은 스테이지를 다시 도전할 수 있어요.'}
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
          <div style={resolveActionBarStyle(isCompactLayout)}>
          <button
            style={{
              ...feverButtonStyle,
              ...resolveDesktopFeverToneStyle({
                canActivateFever,
                feverTone,
                isFeverActive
              })
            }}
            type='button'
            disabled={!canActivateFever || isSessionFailed || isFeverActive}
            onClick={handleFeverActivation}
          >
            {feverButtonLabel}
          </button>
          </div>
        </section>
        {mapPanel}
      </section>
      {debugToolsEnabled ? (
        <>
          <button
            style={debugToggleButtonStyle}
            type='button'
            onClick={() => {
              storeToggleDebugVisible();
            }}
          >
            {storeIsDebugVisible ? 'Hide Debug' : 'Show Debug'}
          </button>
          <DebugOverlay
            activeStageId={activeStageSelection?.stageId ?? null}
            canUseRewardedRetry={canUseRewardedRetry}
            isVisible={storeIsDebugVisible}
            onClose={() => {
              storeToggleDebugVisible();
            }}
            onForceFailure={() => {
              dispatchDebugCommand({ type: 'FORCE_STAGE_FAILURE' });
            }}
            onResetProgressionSave={() => {
              dispatchDebugCommand({ type: 'RESET_PROGRESSION_SAVE' });
            }}
            onSetPurchaseMode={(mode) => {
              dispatchDebugCommand({ type: 'SET_PURCHASE_MODE', mode });
            }}
            onSetRewardedAdMode={(mode) => {
              dispatchDebugCommand({ type: 'SET_REWARDED_AD_MODE', mode });
            }}
            runtimeDebug={storeRuntimeDebug}
            runtimeHud={runtimeHud}
            saveErrorMessage={saveErrorMessage}
            sessionPhase={sessionPhase}
            simulationState={debugSimulationState}
          />
        </>
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

function resolveLayoutStyle(isMobileLayout: boolean) {
  return {
    width: '100%',
    maxWidth: '100vw',
    height: isMobileLayout ? '100dvh' : 'auto',
    minHeight: '100vh',
    margin: 0,
    padding: isMobileLayout ? '0' : '24px',
    display: 'grid',
    placeItems: 'stretch',
    overflow: 'hidden',
    boxSizing: 'border-box',
    background:
      'radial-gradient(circle at top, #1e2b5f 0%, #090b17 48%, #030409 100%)',
    color: '#f5f7ff',
    fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif"
  } as const;
}

function resolveShellLayoutStyle(isCompactLayout: boolean) {
  return {
    width: 'min(100%, 1320px)',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: isCompactLayout ? 'minmax(0, 1fr)' : 'minmax(0, 1.25fr) 320px',
    alignItems: 'start',
    borderRadius: isCompactLayout ? '0' : '28px',
    overflow: 'hidden',
    border: isCompactLayout ? 'none' : '1px solid rgba(120, 227, 255, 0.18)',
    boxShadow: isCompactLayout ? 'none' : '0 20px 80px rgba(0, 0, 0, 0.45)',
    background: 'rgba(5, 8, 18, 0.72)'
  } as const;
}

function resolveStageColumnStyle(isCompactLayout: boolean) {
  return {
    display: 'grid',
    gap: isCompactLayout ? 12 : 16,
    padding: isCompactLayout ? '14px' : '18px',
    minWidth: 0
  } as const;
}

function resolveInfoRailStyle(isCompactLayout: boolean) {
  return {
    display: 'grid',
    gridTemplateColumns: isCompactLayout ? 'minmax(0, 1fr)' : 'minmax(280px, 0.9fr) minmax(0, 1.1fr)',
    gap: 12,
    alignItems: 'start'
  } as const;
}

function resolveStageShellStyle(isCompactLayout: boolean) {
  return {
    width: '100%',
    aspectRatio: '16 / 9',
    position: 'relative',
    overflow: 'hidden',
    minHeight: isCompactLayout ? '320px' : '0',
    borderRadius: isCompactLayout ? '22px' : '24px',
    border: '1px solid rgba(120, 227, 255, 0.14)',
    background: 'linear-gradient(180deg, rgba(8, 12, 24, 0.98), rgba(8, 10, 21, 0.98))'
  } as const;
}

const runtimeHostStyle = {
  width: '100%',
  height: '100%'
} as const;

const feverButtonStyle = {
  borderRadius: 999,
  padding: '14px 18px',
  fontWeight: 700,
  border: '1px solid rgba(255, 255, 255, 0.15)',
  transition: 'transform 120ms ease, opacity 120ms ease',
  justifySelf: 'end'
} as const;

const mobileFeverButtonStyle = {
  width: '100%',
  justifySelf: 'stretch'
} as const;

function resolveActionBarStyle(isCompactLayout: boolean) {
  return {
    display: 'flex',
    justifyContent: isCompactLayout ? 'stretch' : 'flex-end'
  } as const;
}

function resolveDesktopFeverToneStyle({
  canActivateFever,
  feverTone,
  isFeverActive
}: {
  canActivateFever: boolean;
  feverTone: 'neutral' | 'breaker' | 'pierce' | 'pulse';
  isFeverActive: boolean;
}) {
  if (!canActivateFever) {
    return {
      background: 'rgba(14, 18, 30, 0.78)',
      color: 'rgba(245, 247, 255, 0.55)',
      cursor: 'not-allowed'
    } as const;
  }

  if (feverTone === 'breaker') {
    return {
      background: isFeverActive
        ? 'linear-gradient(135deg, #ffd37d, #ff9b63)'
        : 'linear-gradient(135deg, #ffc86b, #ff8a57)',
      color: '#24120d',
      cursor: isFeverActive ? 'wait' : 'pointer'
    } as const;
  }

  if (feverTone === 'pierce') {
    return {
      background: isFeverActive
        ? 'linear-gradient(135deg, #9ff0ff, #63d3ff)'
        : 'linear-gradient(135deg, #7ae7ff, #3fb8ff)',
      color: '#071824',
      cursor: isFeverActive ? 'wait' : 'pointer'
    } as const;
  }

  if (feverTone === 'pulse') {
    return {
      background: isFeverActive
        ? 'linear-gradient(135deg, #ffb6e3, #ff74bd)'
        : 'linear-gradient(135deg, #ff8fd3, #ff5db1)',
      color: '#230b1a',
      cursor: isFeverActive ? 'wait' : 'pointer'
    } as const;
  }

  return {
    background: 'rgba(14, 18, 30, 0.78)',
    color: 'rgba(245, 247, 255, 0.55)',
    cursor: 'not-allowed'
  } as const;
}

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

const debugToggleButtonStyle = {
  position: 'fixed',
  bottom: 16,
  left: 16,
  zIndex: 31,
  padding: '10px 14px',
  borderRadius: 999,
  background: 'rgba(8, 12, 22, 0.92)',
  color: '#f5f7ff',
  border: '1px solid rgba(120, 227, 255, 0.18)',
  cursor: 'pointer'
} as const;

const mobileFeverOverlayStyle = {
  position: 'absolute',
  left: '50%',
  bottom: 44,
  transform: 'translateX(-50%)',
  width: 'min(88%, 320px)',
  display: 'grid',
  gap: 4,
  zIndex: 3,
  pointerEvents: 'none'
} as const;

const mobileFeverRailTrackStyle = {
  width: '100%',
  height: 4,
  borderRadius: 999,
  overflow: 'hidden',
  background: 'rgba(34, 79, 104, 0.88)',
  border: '1px solid rgba(120, 227, 255, 0.12)',
  boxSizing: 'border-box'
} as const;

function resolveMobileFeverPromptStyle({
  feverTone,
  isEmphasized
}: {
  feverTone: 'neutral' | 'breaker' | 'pierce' | 'pulse';
  isEmphasized: boolean;
}) {
  const baseStyle = {
    position: 'absolute',
    left: '50%',
    bottom: 42,
    transform: 'translateX(-50%)',
    width: 'min(88%, 320px)',
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 1.35,
    letterSpacing: '0.02em',
    color: 'rgba(199, 212, 255, 0.9)',
    textShadow: '0 2px 10px rgba(0, 0, 0, 0.35)',
    zIndex: 3,
    pointerEvents: 'none'
  } as const;

  if (!isEmphasized) {
    return baseStyle;
  }

  if (feverTone === 'breaker') {
    return {
      ...baseStyle,
      color: '#ffd2a7'
    } as const;
  }

  if (feverTone === 'pierce') {
    return {
      ...baseStyle,
      color: '#b9f4ff'
    } as const;
  }

  if (feverTone === 'pulse') {
    return {
      ...baseStyle,
      color: '#ffc2df'
    } as const;
  }

  return baseStyle;
}

function resolveMobileFeverRailFillStyle({
  feverMeter,
  feverTone,
  isFeverActive
}: {
  feverMeter: number;
  feverTone: 'neutral' | 'breaker' | 'pierce' | 'pulse';
  isFeverActive: boolean;
}) {
  const fillRatio = Math.max(0, Math.min(feverMeter / FEVER_METER_MAX, 1));
  const baseStyle = {
    width: `${fillRatio * 100}%`,
    height: '100%',
    borderRadius: 999,
    transition: 'width 180ms ease, background 180ms ease, box-shadow 180ms ease'
  } as const;

  if (feverTone === 'breaker') {
    return {
      ...baseStyle,
      background: 'linear-gradient(90deg, #ffb96f, #ff8a57)',
      boxShadow: isFeverActive ? '0 0 12px rgba(255, 177, 97, 0.75)' : '0 0 8px rgba(255, 177, 97, 0.35)'
    } as const;
  }

  if (feverTone === 'pierce') {
    return {
      ...baseStyle,
      background: 'linear-gradient(90deg, #78ecff, #42beff)',
      boxShadow: isFeverActive ? '0 0 12px rgba(122, 231, 255, 0.75)' : '0 0 8px rgba(122, 231, 255, 0.35)'
    } as const;
  }

  if (feverTone === 'pulse') {
    return {
      ...baseStyle,
      background: 'linear-gradient(90deg, #ff9ed8, #ff5db1)',
      boxShadow: isFeverActive ? '0 0 14px rgba(255, 120, 220, 0.85)' : '0 0 10px rgba(255, 120, 220, 0.45)'
    } as const;
  }

  return {
    ...baseStyle,
    background: 'linear-gradient(90deg, #4bbcf0, #6fd8ff)',
    boxShadow: '0 0 6px rgba(120, 227, 255, 0.22)'
  } as const;
}
