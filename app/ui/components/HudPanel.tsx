import type { IRuntimeHudSnapshot } from '../../game/hud-bridges/game-runtime-bridge';

interface IHudPanelProps {
  canActivateFever: boolean;
  feverMeter: number;
  isFeverActive: boolean;
  runtimeHud: IRuntimeHudSnapshot;
  sessionPhase: string;
}

export default function HudPanel({
  canActivateFever,
  feverMeter,
  isFeverActive,
  runtimeHud,
  sessionPhase
}: IHudPanelProps) {
  const aimAngleLabel =
    runtimeHud.aimAngle === null ? 'ready' : `${Math.round(runtimeHud.aimAngle)}deg`;
  const dangerPercent = Math.round(runtimeHud.dangerLevel * 100);
  const feverPercent = `${Math.round((feverMeter / 100) * 100)}%`;

  return (
    <div style={panelStyle}>
      <div style={pillStyle}>neo-brick-crush</div>
      <div style={statsWrapStyle}>
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
            ...(isFeverActive ? feverActiveStyle : canActivateFever ? feverReadyStyle : null)
          }}
        >
          <span>Fever</span>
          <strong>{isFeverActive ? 'active' : canActivateFever ? 'ready' : feverPercent}</strong>
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
  position: 'absolute',
  top: 16,
  left: 16,
  right: 16,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  pointerEvents: 'none'
} as const;

const statsWrapStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  flexWrap: 'wrap'
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

const meterStyle = {
  display: 'grid',
  gap: 4,
  minWidth: 140,
  padding: '10px 14px',
  borderRadius: 16,
  background: 'rgba(255, 0, 145, 0.18)',
  border: '1px solid rgba(255, 120, 199, 0.28)',
  textAlign: 'right'
} as const;

const lossStateStyle = {
  background: 'rgba(255, 96, 96, 0.26)',
  border: '1px solid rgba(255, 148, 148, 0.38)'
} as const;

const feverReadyStyle = {
  background: 'rgba(120, 227, 255, 0.24)',
  border: '1px solid rgba(120, 227, 255, 0.44)'
} as const;

const feverActiveStyle = {
  background: 'rgba(255, 164, 96, 0.28)',
  border: '1px solid rgba(255, 204, 120, 0.5)'
} as const;
