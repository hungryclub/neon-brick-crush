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
  const topRowItems = [
    { label: 'Sess', value: sessionPhase, tone: 'neutral' as const },
    { label: 'Turn', value: String(runtimeHud.turnNumber), tone: 'neutral' as const },
    { label: 'Aim', value: aimAngleLabel, tone: 'neutral' as const }
  ];
  const bottomRowItems = [
    { label: 'Blk', value: String(runtimeHud.remainingBlocks), tone: 'neutral' as const },
    { label: 'Dng', value: dangerPercent, tone: 'neutral' as const },
    { label: 'Fvr', value: feverLabel, tone: feverTone },
    { label: 'Shot', value: runtimeHud.shotState, tone: 'neutral' as const }
  ];

  return (
    <div style={stripStyle}>
      <div style={topRowStyle}>
        {topRowItems.map((item) => (
          <HudPill key={item.label} label={item.label} tone={item.tone} value={item.value} />
        ))}
      </div>
      <div style={bottomRowStyle}>
        {bottomRowItems.map((item) => (
          <HudPill key={item.label} label={item.label} tone={item.tone} value={item.value} />
        ))}
      </div>
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
  display: 'grid',
  gridTemplateRows: '1fr 1fr',
  gap: 3,
  width: '100%',
  minWidth: 0,
  maxWidth: '100%',
  height: '100%',
  boxSizing: 'border-box'
} as const;

const topRowStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 3,
  minWidth: 0,
  minHeight: 0
} as const;

const bottomRowStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 3,
  minWidth: 0,
  minHeight: 0
} as const;

const pillStyle = {
  minWidth: 0,
  minHeight: 0,
  height: '100%',
  padding: '3px 5px 4px',
  borderRadius: 8,
  background: 'rgba(255, 0, 145, 0.18)',
  border: '1px solid rgba(255, 120, 199, 0.28)',
  display: 'grid',
  alignContent: 'center',
  gap: 1,
  overflow: 'hidden',
  boxSizing: 'border-box'
} as const;

const labelStyle = {
  fontSize: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'rgba(245, 247, 255, 0.72)'
} as const;

const valueStyle = {
  fontSize: 11,
  lineHeight: 1,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  wordBreak: 'break-word'
} as const;
