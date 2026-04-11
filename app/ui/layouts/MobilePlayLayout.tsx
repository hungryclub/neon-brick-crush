import type { ReactNode, RefObject } from 'react';

import type { IStageRuntimeConfig } from '../../domain/models/stage-model';
import type { IStageCompletionRecord } from '../../domain/models/progression-model';
import type { IRuntimeHudSnapshot } from '../../game/hud-bridges/game-runtime-bridge';
import CompactHudStrip from '../components/CompactHudStrip';
import CompactStageChip from '../components/CompactStageChip';

interface IMobilePlayLayoutProps {
  canActivateFever: boolean;
  canUseRewardedRetry: boolean;
  feverButtonLabel: string;
  feverMeter: number;
  isFeverActive: boolean;
  isProgressionLoading: boolean;
  isRewardedRetryPending: boolean;
  isSessionBooting: boolean;
  isSessionFailed: boolean;
  latestStageCompletion: IStageCompletionRecord | null;
  retryCount: number;
  rewardedRetryFeedback: string | null;
  runtimeHostRef: RefObject<HTMLDivElement>;
  runtimeHud: IRuntimeHudSnapshot;
  saveErrorMessage: string | null;
  sessionPhase: string;
  stageRuntimeConfig: IStageRuntimeConfig | null;
  onActivateFever: () => void;
  onBackToMap: () => void;
  onOpenMap: () => void;
  onRetry: () => void;
  onRetrySave: () => void;
  onRewardedRetry: () => void;
  overlayContent?: ReactNode;
}

export default function MobilePlayLayout({
  canActivateFever,
  canUseRewardedRetry,
  feverButtonLabel,
  feverMeter,
  isFeverActive,
  isProgressionLoading,
  isRewardedRetryPending,
  isSessionBooting,
  isSessionFailed,
  latestStageCompletion,
  retryCount,
  rewardedRetryFeedback,
  runtimeHostRef,
  runtimeHud,
  saveErrorMessage,
  sessionPhase,
  stageRuntimeConfig,
  onActivateFever,
  onBackToMap,
  onOpenMap,
  onRetry,
  onRetrySave,
  onRewardedRetry,
  overlayContent
}: IMobilePlayLayoutProps) {
  return (
    <section style={layoutStyle}>
      <CompactStageChip onOpenMap={onOpenMap} stageRuntimeConfig={stageRuntimeConfig} />
      <div style={bottomStyle}>
        <CompactHudStrip
          canActivateFever={canActivateFever}
          feverMeter={feverMeter}
          isFeverActive={isFeverActive}
          runtimeHud={runtimeHud}
          sessionPhase={sessionPhase}
        />
      </div>
      <section style={canvasFrameStyle}>
        <div ref={runtimeHostRef} id='game-runtime-host' style={runtimeHostStyle} />
        {isSessionBooting || isProgressionLoading ? (
          <div style={bootOverlayStyle}>Booting runtime shell...</div>
        ) : null}
        {isSessionFailed ? (
          <div style={overlayStyle}>
            <div style={overlayCardStyle}>
              <span style={eyebrowStyle}>Stage Failed</span>
              <strong style={titleStyle}>즉시 다시 도전할 수 있어요.</strong>
              <p style={textStyle}>
                압박선에 닿았습니다. 전체 앱을 다시 여는 대신 지금 상태에서 바로
                스테이지를 복구합니다.
              </p>
              <button style={primaryButtonStyle} type='button' onClick={onRetry}>
                Instant Retry
              </button>
              {canUseRewardedRetry ? (
                <button
                  style={{
                    ...secondaryButtonStyle,
                    ...(isRewardedRetryPending ? disabledButtonStyle : null)
                  }}
                  type='button'
                  disabled={isRewardedRetryPending}
                  onClick={onRewardedRetry}
                >
                  {isRewardedRetryPending ? 'Watching Ad...' : 'Rewarded Retry'}
                </button>
              ) : null}
              {rewardedRetryFeedback ? <p style={feedbackStyle}>{rewardedRetryFeedback}</p> : null}
              <span style={metaStyle}>retry count: {retryCount}</span>
            </div>
          </div>
        ) : null}
        {saveErrorMessage ? (
          <div style={overlayStyle}>
            <div style={overlayCardStyle}>
              <span style={eyebrowStyle}>Save Failed</span>
              <strong style={titleStyle}>클리어 보상을 아직 저장하지 못했습니다.</strong>
              <p style={textStyle}>{saveErrorMessage}</p>
              <button style={primaryButtonStyle} type='button' onClick={onRetrySave}>
                Retry Save
              </button>
            </div>
          </div>
        ) : null}
        {latestStageCompletion ? (
          <div style={overlayStyle}>
            <div style={{ ...overlayCardStyle, border: '1px solid rgba(120, 227, 255, 0.35)' }}>
              <span style={eyebrowStyle}>Stage Cleared</span>
              <strong style={titleStyle}>
                별 {latestStageCompletion.starCount}개를 획득했습니다.
              </strong>
              <p style={textStyle}>
                {latestStageCompletion.stageKind === 'climax' &&
                latestStageCompletion.unlockedWorldIds?.length
                  ? `월드 마지막을 돌파해 ${latestStageCompletion.unlockedWorldIds.length}개의 새 월드가 해금되었습니다.`
                  : '월드맵에 결과가 저장되었습니다. 다른 스테이지를 고르거나 같은 스테이지를 다시 도전할 수 있어요.'}
              </p>
              <button style={primaryButtonStyle} type='button' onClick={onBackToMap}>
                Back To Map
              </button>
            </div>
          </div>
        ) : null}
        <button
          style={{
            ...feverButtonStyle,
            ...(canActivateFever ? feverButtonReadyStyle : feverButtonDisabledStyle),
            ...(isFeverActive ? feverButtonActiveStyle : null)
          }}
          type='button'
          disabled={!canActivateFever || isSessionFailed || isFeverActive}
          onClick={onActivateFever}
        >
          {feverButtonLabel}
        </button>
        {overlayContent}
      </section>
    </section>
  );
}

const layoutStyle = {
  width: '100%',
  maxWidth: '100%',
  height: '100dvh',
  display: 'grid',
  gridTemplateRows: '36px 28px minmax(0, 1fr)',
  gap: 4,
  padding: 'calc(env(safe-area-inset-top, 0px) + 4px) 4px calc(env(safe-area-inset-bottom, 0px) + 4px)',
  overflow: 'hidden',
  overflowX: 'hidden',
  boxSizing: 'border-box'
} as const;

const canvasFrameStyle = {
  width: '100%',
  minHeight: 0,
  display: 'grid',
  overflow: 'hidden',
  borderRadius: 14,
  border: '1px solid rgba(120, 227, 255, 0.14)',
  background: 'linear-gradient(180deg, rgba(8, 12, 24, 0.98), rgba(8, 10, 21, 0.98))',
  position: 'relative',
  boxSizing: 'border-box'
} as const;

const runtimeHostStyle = {
  width: '100%',
  height: '100%',
  minWidth: 0,
  minHeight: 0
} as const;

const bottomStyle = {
  display: 'block',
  width: '100%',
  minWidth: 0,
  height: 28,
  overflow: 'hidden'
} as const;

const feverButtonStyle = {
  position: 'absolute',
  left: '50%',
  bottom: 4,
  transform: 'translateX(-50%)',
  zIndex: 3,
  width: '25vw',
  borderRadius: 14,
  minHeight: 30,
  padding: '4px 8px',
  fontWeight: 700,
  fontSize: 9,
  lineHeight: 1.1,
  border: '1px solid rgba(255, 255, 255, 0.15)',
  boxSizing: 'border-box',
  minWidth: 88,
  maxWidth: 120
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

const overlayStyle = {
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  background: 'linear-gradient(180deg, rgba(8, 10, 22, 0.32), rgba(8, 10, 22, 0.76))'
} as const;

const overlayCardStyle = {
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

const eyebrowStyle = {
  color: '#ff89bf',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontSize: 11
} as const;

const titleStyle = {
  fontSize: 24
} as const;

const textStyle = {
  margin: 0,
  color: 'rgba(245, 247, 255, 0.78)',
  lineHeight: 1.5,
  fontSize: 14
} as const;

const primaryButtonStyle = {
  border: 'none',
  borderRadius: 999,
  padding: '14px 18px',
  background: 'linear-gradient(135deg, #78e3ff, #ff67b0)',
  color: '#08101f',
  fontWeight: 700,
  cursor: 'pointer'
} as const;

const secondaryButtonStyle = {
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

const feedbackStyle = {
  margin: 0,
  color: '#ffd3e5',
  fontSize: 13,
  lineHeight: 1.45
} as const;

const metaStyle = {
  color: 'rgba(245, 247, 255, 0.62)',
  fontSize: 12
} as const;
