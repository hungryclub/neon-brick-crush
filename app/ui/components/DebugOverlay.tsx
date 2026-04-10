import type {
  IRuntimeDebugSnapshot,
  IRuntimeHudSnapshot
} from '../../game/hud-bridges/game-runtime-bridge';
import type {
  IDebugSimulationState,
  TDebugPurchaseMode,
  TDebugRewardedAdMode
} from '../../debug/debug-command-bus.ts';

interface IDebugOverlayProps {
  activeStageId: string | null;
  canUseRewardedRetry: boolean;
  isVisible: boolean;
  onClose: () => void;
  onForceFailure: () => void;
  onResetProgressionSave: () => void;
  onSetPurchaseMode: (mode: TDebugPurchaseMode) => void;
  onSetRewardedAdMode: (mode: TDebugRewardedAdMode) => void;
  runtimeDebug: IRuntimeDebugSnapshot;
  runtimeHud: IRuntimeHudSnapshot;
  saveErrorMessage: string | null;
  sessionPhase: string;
  simulationState: IDebugSimulationState;
}

const rewardedAdModes: TDebugRewardedAdMode[] = [
  'live',
  'granted',
  'denied',
  'cancelled',
  'unavailable',
  'failed'
];

const purchaseModes: TDebugPurchaseMode[] = [
  'live',
  'purchased',
  'cancelled',
  'unavailable',
  'failed'
];

export default function DebugOverlay({
  activeStageId,
  canUseRewardedRetry,
  isVisible,
  onClose,
  onForceFailure,
  onResetProgressionSave,
  onSetPurchaseMode,
  onSetRewardedAdMode,
  runtimeDebug,
  runtimeHud,
  saveErrorMessage,
  sessionPhase,
  simulationState
}: IDebugOverlayProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <aside style={overlayStyle}>
      <div style={headerStyle}>
        <strong>Debug Overlay</strong>
        <button style={closeButtonStyle} type='button' onClick={onClose}>
          Hide
        </button>
      </div>
      <section style={sectionStyle}>
        <strong style={sectionTitleStyle}>State</strong>
        <span>session: {sessionPhase}</span>
        <span>stage: {activeStageId ?? 'none'}</span>
        <span>turn: {runtimeHud.turnNumber}</span>
        <span>shot: {runtimeHud.shotState}</span>
        <span>retry ad available: {String(canUseRewardedRetry)}</span>
        <span>save error: {saveErrorMessage ?? 'none'}</span>
      </section>
      <section style={sectionStyle}>
        <strong style={sectionTitleStyle}>Runtime Profile</strong>
        <span>last outcome: {runtimeDebug.lastTurnProfile?.turnOutcome ?? 'none'}</span>
        <span>impact effects: {runtimeDebug.lastTurnProfile?.impactEffectsThisTurn ?? 0}</span>
        <span>
          pulse pool: {runtimeDebug.lastTurnProfile?.pulsePool.active ?? 0}/
          {runtimeDebug.lastTurnProfile?.pulsePool.size ?? 0}
        </span>
        <pre style={preStyle}>
          {JSON.stringify(runtimeDebug.lastTurnProfile?.samples ?? {}, null, 2)}
        </pre>
      </section>
      <section style={sectionStyle}>
        <strong style={sectionTitleStyle}>Simulators</strong>
        <label style={labelStyle}>
          Rewarded Ad
          <select
            value={simulationState.rewardedAdMode}
            onChange={(event) =>
              onSetRewardedAdMode(event.target.value as TDebugRewardedAdMode)
            }
          >
            {rewardedAdModes.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Purchase
          <select
            value={simulationState.purchaseMode}
            onChange={(event) =>
              onSetPurchaseMode(event.target.value as TDebugPurchaseMode)
            }
          >
            {purchaseModes.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </label>
        <button style={actionButtonStyle} type='button' onClick={onForceFailure}>
          Force Stage Failure
        </button>
        <button style={actionButtonStyle} type='button' onClick={onResetProgressionSave}>
          Reset Save Envelope
        </button>
      </section>
    </aside>
  );
}

const overlayStyle = {
  position: 'fixed',
  top: 16,
  right: 16,
  zIndex: 30,
  width: 340,
  maxHeight: 'calc(100vh - 32px)',
  overflow: 'auto',
  display: 'grid',
  gap: 12,
  padding: 16,
  borderRadius: 18,
  background: 'rgba(8, 12, 22, 0.96)',
  color: '#f5f7ff',
  border: '1px solid rgba(120, 227, 255, 0.28)',
  boxShadow: '0 20px 80px rgba(0, 0, 0, 0.42)'
} as const;

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
} as const;

const sectionStyle = {
  display: 'grid',
  gap: 8,
  padding: '12px 0',
  borderTop: '1px solid rgba(255,255,255,0.08)'
} as const;

const sectionTitleStyle = {
  color: '#78e3ff',
  fontSize: 12,
  letterSpacing: '0.12em',
  textTransform: 'uppercase'
} as const;

const labelStyle = {
  display: 'grid',
  gap: 4,
  fontSize: 12
} as const;

const actionButtonStyle = {
  borderRadius: 12,
  border: '1px solid rgba(120, 227, 255, 0.24)',
  background: 'rgba(20, 28, 50, 0.9)',
  color: '#f5f7ff',
  padding: '10px 12px',
  cursor: 'pointer'
} as const;

const closeButtonStyle = {
  ...actionButtonStyle,
  padding: '8px 10px'
} as const;

const preStyle = {
  margin: 0,
  padding: 10,
  borderRadius: 12,
  background: 'rgba(255,255,255,0.05)',
  fontSize: 11,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word'
} as const;
