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
    </header>
  );
}

const topBarStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: 10,
  alignItems: 'center'
} as const;

const chipStyle = {
  minWidth: 0,
  padding: '10px 14px',
  borderRadius: 999,
  border: '1px solid rgba(120, 227, 255, 0.28)',
  background: 'rgba(7, 11, 22, 0.82)',
  display: 'grid',
  gap: 2
} as const;

const eyebrowStyle = {
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#78e3ff',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
} as const;

const titleStyle = {
  fontSize: 17,
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
  padding: '12px 16px',
  fontWeight: 700,
  cursor: 'pointer'
} as const;
