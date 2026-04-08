interface IHudPanelProps {
  sessionPhase: string;
}

export default function HudPanel({ sessionPhase }: IHudPanelProps) {
  return (
    <div style={panelStyle}>
      <div style={pillStyle}>neo-brick-crush</div>
      <div style={meterStyle}>
        <span>Session</span>
        <strong>{sessionPhase}</strong>
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
