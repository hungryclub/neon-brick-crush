import type { IRuntimeHudSnapshot } from '../../game/hud-bridges/game-runtime-bridge';

interface ICompactHudStripProps {
  columns?: 2 | 4;
  runtimeHud: IRuntimeHudSnapshot;
}

export default function CompactHudStrip({
  columns: _columns = 4,
  runtimeHud
}: ICompactHudStripProps) {
  const dangerPercent = `${Math.round(runtimeHud.dangerLevel * 100)}%`;

  return (
    <div style={stripStyle}>
      <HudPill label='Turn' value={String(runtimeHud.turnNumber)} />
      <HudPill label='Blocks' value={String(runtimeHud.remainingBlocks)} />
      <HudPill label='Danger' value={dangerPercent} />
      <HudPill label='Shot' value={runtimeHud.shotState} />
    </div>
  );
}

function HudPill({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={pillStyle}>
      <span style={labelStyle}>{label}</span>
      <strong style={valueStyle}>{value}</strong>
    </div>
  );
}

const stripStyle = {
  display: 'flex',
  flexWrap: 'nowrap',
  alignItems: 'stretch',
  gap: 2,
  width: '100%',
  minWidth: 0,
  maxWidth: '100%',
  overflow: 'hidden',
  boxSizing: 'border-box'
} as const;

const pillStyle = {
  flex: '1 1 0',
  minWidth: 0,
  minHeight: 32,
  padding: '4px 5px 5px',
  borderRadius: 9,
  background: 'rgba(255, 0, 145, 0.18)',
  border: '1px solid rgba(255, 120, 199, 0.28)',
  display: 'grid',
  alignContent: 'center',
  gap: 1,
  boxSizing: 'border-box'
} as const;

const labelStyle = {
  fontSize: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'rgba(245, 247, 255, 0.72)'
} as const;

const valueStyle = {
  fontSize: 9,
  lineHeight: 1,
  wordBreak: 'break-word'
} as const;
