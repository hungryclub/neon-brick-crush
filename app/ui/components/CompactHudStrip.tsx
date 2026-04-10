import type { IRuntimeHudSnapshot } from '../../game/hud-bridges/game-runtime-bridge';

interface ICompactHudStripProps {
  columns?: 2 | 4;
  runtimeHud: IRuntimeHudSnapshot;
}

export default function CompactHudStrip({
  columns = 4,
  runtimeHud
}: ICompactHudStripProps) {
  const dangerPercent = `${Math.round(runtimeHud.dangerLevel * 100)}%`;

  return (
    <div
      style={{
        ...stripStyle,
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
      }}
    >
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
  display: 'grid',
  gap: 8
} as const;

const pillStyle = {
  minWidth: 0,
  padding: '10px 10px 12px',
  borderRadius: 16,
  background: 'rgba(255, 0, 145, 0.18)',
  border: '1px solid rgba(255, 120, 199, 0.28)',
  display: 'grid',
  gap: 4
} as const;

const labelStyle = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'rgba(245, 247, 255, 0.72)'
} as const;

const valueStyle = {
  fontSize: 18,
  lineHeight: 1.05,
  wordBreak: 'break-word'
} as const;
