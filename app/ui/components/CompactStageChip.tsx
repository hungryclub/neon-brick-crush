import type { IStageRuntimeConfig } from '../../domain/models/stage-model';

interface ICompactStageChipProps {
  onOpenMap: () => void;
  stageRuntimeConfig: IStageRuntimeConfig | null;
}

export default function CompactStageChip({
  onOpenMap,
  stageRuntimeConfig
}: ICompactStageChipProps) {
  return (
    <header style={topBarStyle}>
      <div style={chipStyle}>
        <div style={copyStyle}>
          <span style={eyebrowStyle}>
            {stageRuntimeConfig?.presentationProfile.shellLabel ?? 'Stage'}
          </span>
          <strong style={titleStyle}>
            {stageRuntimeConfig?.stageTitle ?? 'Loading Stage'}
          </strong>
        </div>
        <button style={mapButtonStyle} type='button' onClick={onOpenMap}>
          Map
        </button>
      </div>
    </header>
  );
}

const topBarStyle = {
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box'
} as const;

const chipStyle = {
  minWidth: 0,
  padding: '6px 8px',
  borderRadius: 999,
  border: '1px solid rgba(120, 227, 255, 0.28)',
  background: 'rgba(7, 11, 22, 0.82)',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: 6,
  alignItems: 'center',
  boxSizing: 'border-box'
} as const;

const copyStyle = {
  minWidth: 0,
  display: 'grid',
  gap: 1
} as const;

const eyebrowStyle = {
  fontSize: 9,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#78e3ff',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
} as const;

const titleStyle = {
  fontSize: 13,
  lineHeight: 1.1,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
} as const;

const mapButtonStyle = {
  borderRadius: 999,
  border: '1px solid rgba(120, 227, 255, 0.26)',
  background: 'rgba(13, 18, 35, 0.92)',
  color: '#f5f7ff',
  padding: '6px 8px',
  minWidth: 42,
  fontWeight: 700,
  fontSize: 10,
  cursor: 'pointer',
  boxSizing: 'border-box'
} as const;
