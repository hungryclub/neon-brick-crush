import type { IRuntimeHudSnapshot } from '../../game/hud-bridges/game-runtime-bridge';
import { FEVER_METER_MAX } from '../../game/systems/fever-overdrive.ts';

interface ICompactHudStripProps {
  canActivateFever: boolean;
  feverHudValue: string;
  feverMeter: number;
  feverTone: 'neutral' | 'breaker' | 'pierce' | 'pulse';
  isFeverActive: boolean;
  runtimeHud: IRuntimeHudSnapshot;
  sessionPhase: string;
}

export default function CompactHudStrip({
  canActivateFever,
  feverHudValue,
  feverMeter,
  feverTone,
  isFeverActive,
  runtimeHud,
  sessionPhase
}: ICompactHudStripProps) {
  const aimAngleLabel =
    runtimeHud.aimAngle === null ? 'ready' : `${Math.round(runtimeHud.aimAngle)}d`;
  const dangerPercent = `${Math.round(runtimeHud.dangerLevel * 100)}%`;
  const feverLabel =
    isFeverActive || canActivateFever
      ? feverHudValue
      : `${Math.round((feverMeter / FEVER_METER_MAX) * 100)}%`;

  return (
    <div style={stripStyle}>
      <HudPill label='Sess' value={sessionPhase} />
      <HudPill label='Turn' value={String(runtimeHud.turnNumber)} />
      <HudPill label='Aim' value={aimAngleLabel} />
      <HudPill label='Blk' value={String(runtimeHud.remainingBlocks)} />
      <HudPill label='Dng' value={dangerPercent} />
      <HudPill label='Fvr' tone={feverTone} value={feverLabel} />
      <HudPill label='Shot' value={runtimeHud.shotState} />
    </div>
  );
}

function HudPill({
  label,
  tone = 'neutral',
  value
}: {
  label: string;
  tone?: 'neutral' | 'breaker' | 'pierce' | 'pulse';
  value: string;
}) {
  return (
    <div style={{ ...pillStyle, ...resolveToneStyle(tone) }}>
      <span style={labelStyle}>{label}</span>
      <strong style={valueStyle}>{value}</strong>
    </div>
  );
}

function resolveToneStyle(tone: 'neutral' | 'breaker' | 'pierce' | 'pulse') {
  if (tone === 'breaker') {
    return {
      background: 'rgba(255, 181, 71, 0.22)',
      border: '1px solid rgba(255, 196, 120, 0.34)'
    } as const;
  }

  if (tone === 'pierce') {
    return {
      background: 'rgba(82, 217, 255, 0.18)',
      border: '1px solid rgba(128, 235, 255, 0.34)'
    } as const;
  }

  if (tone === 'pulse') {
    return {
      background: 'rgba(255, 93, 177, 0.22)',
      border: '1px solid rgba(255, 143, 211, 0.34)'
    } as const;
  }

  return {};
}

const stripStyle = {
  display: 'flex',
  flexWrap: 'nowrap',
  alignItems: 'stretch',
  gap: 1,
  width: '100%',
  minWidth: 0,
  maxWidth: '100%',
  overflow: 'hidden',
  boxSizing: 'border-box'
} as const;

const pillStyle = {
  flex: '0 0 calc((100% - 6px) / 7)',
  width: 'calc((100% - 6px) / 7)',
  minWidth: 0,
  minHeight: 26,
  padding: '2px 3px 3px',
  borderRadius: 7,
  background: 'rgba(255, 0, 145, 0.18)',
  border: '1px solid rgba(255, 120, 199, 0.28)',
  display: 'grid',
  alignContent: 'center',
  gap: 0,
  overflow: 'hidden',
  boxSizing: 'border-box'
} as const;

const labelStyle = {
  fontSize: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'rgba(245, 247, 255, 0.72)'
} as const;

const valueStyle = {
  fontSize: 7,
  lineHeight: 1,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  wordBreak: 'break-word'
} as const;
