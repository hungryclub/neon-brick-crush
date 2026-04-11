import type { IRuntimeHudSnapshot } from '../../game/hud-bridges/game-runtime-bridge';
import { FEVER_METER_MAX } from '../../game/systems/fever-overdrive.ts';

interface IHudPanelProps {
  canActivateFever: boolean;
  compact?: boolean;
  feverHudValue: string;
  feverMeter: number;
  feverTone: 'neutral' | 'breaker' | 'pierce' | 'pulse';
  isFeverActive: boolean;
  runtimeHud: IRuntimeHudSnapshot;
  sessionPhase: string;
}

export default function HudPanel({
  canActivateFever,
  compact = false,
  feverHudValue,
  feverMeter,
  feverTone,
  isFeverActive,
  runtimeHud,
  sessionPhase
}: IHudPanelProps) {
  const aimAngleLabel =
    runtimeHud.aimAngle === null ? 'ready' : `${Math.round(runtimeHud.aimAngle)}deg`;
  const dangerPercent = Math.round(runtimeHud.dangerLevel * 100);
  const feverPercent = `${Math.round((feverMeter / FEVER_METER_MAX) * 100)}%`;

  return (
    <div style={{ ...panelStyle, ...(compact ? compactPanelStyle : null) }}>
      <div style={{ ...pillStyle, ...(compact ? compactPillStyle : null) }}>neo-brick-crush</div>
      <div style={{ ...statsWrapStyle, ...(compact ? compactStatsWrapStyle : null) }}>
        <div style={meterStyle}>
          <span>Session</span>
          <strong>{sessionPhase}</strong>
        </div>
        <div style={meterStyle}>
          <span>Turn</span>
          <strong>{runtimeHud.turnNumber}</strong>
        </div>
        <div style={meterStyle}>
          <span>Aim</span>
          <strong>{aimAngleLabel}</strong>
        </div>
        <div style={meterStyle}>
          <span>Blocks</span>
          <strong>{runtimeHud.remainingBlocks}</strong>
        </div>
        <div style={meterStyle}>
          <span>Danger</span>
          <strong>{dangerPercent}%</strong>
        </div>
        <div
          style={{
            ...meterStyle,
            ...resolveFeverMeterTone({
              canActivateFever,
              feverTone,
              isFeverActive
            })
          }}
        >
          <span>Fever</span>
          <strong>{isFeverActive || canActivateFever ? feverHudValue : feverPercent}</strong>
        </div>
        <div
          style={{
            ...meterStyle,
            ...(runtimeHud.hasReachedLossLine ? lossStateStyle : null)
          }}
        >
          <span>Shot</span>
          <strong>{runtimeHud.shotState}</strong>
        </div>
      </div>
    </div>
  );
}

const panelStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
  minWidth: 0
} as const;

const statsWrapStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))',
  justifyContent: 'stretch',
  gap: 10,
  flex: 1,
  minWidth: 0
} as const;

const compactPanelStyle = {
  display: 'grid'
} as const;

const compactStatsWrapStyle = {
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
} as const;

const pillStyle = {
  padding: '10px 14px',
  borderRadius: 999,
  background: 'rgba(10, 16, 32, 0.72)',
  color: '#78e3ff',
  border: '1px solid rgba(120, 227, 255, 0.32)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontSize: 12
} as const;

const compactPillStyle = {
  justifySelf: 'start'
} as const;

const meterStyle = {
  display: 'grid',
  gap: 4,
  minWidth: 0,
  padding: '10px 12px',
  borderRadius: 16,
  background: 'rgba(255, 0, 145, 0.18)',
  border: '1px solid rgba(255, 120, 199, 0.28)',
  textAlign: 'left'
} as const;

const lossStateStyle = {
  background: 'rgba(255, 96, 96, 0.26)',
  border: '1px solid rgba(255, 148, 148, 0.38)'
} as const;

function resolveFeverMeterTone({
  canActivateFever,
  feverTone,
  isFeverActive
}: {
  canActivateFever: boolean;
  feverTone: 'neutral' | 'breaker' | 'pierce' | 'pulse';
  isFeverActive: boolean;
}) {
  if (!canActivateFever && !isFeverActive) {
    return {};
  }

  if (feverTone === 'breaker') {
    return {
      background: isFeverActive ? 'rgba(255, 177, 97, 0.32)' : 'rgba(255, 181, 71, 0.24)',
      border: '1px solid rgba(255, 196, 120, 0.44)'
    } as const;
  }

  if (feverTone === 'pierce') {
    return {
      background: isFeverActive ? 'rgba(108, 232, 255, 0.28)' : 'rgba(82, 217, 255, 0.22)',
      border: '1px solid rgba(128, 235, 255, 0.44)'
    } as const;
  }

  if (feverTone === 'pulse') {
    return {
      background: isFeverActive ? 'rgba(255, 116, 189, 0.3)' : 'rgba(255, 93, 177, 0.24)',
      border: '1px solid rgba(255, 143, 211, 0.44)'
    } as const;
  }

  return {};
}
