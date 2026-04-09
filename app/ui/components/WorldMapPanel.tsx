import type { IStageSelection } from '../../domain/models/stage-model';

interface IWorldMapStageCard {
  isCompleted: boolean;
  isUnlocked: boolean;
  stageId: string;
  starCount: number;
  worldId: string;
}

interface IWorldMapPanelProps {
  activeStageSelection: IStageSelection | null;
  onSelectStage: (selection: IStageSelection) => void;
  stageCards: IWorldMapStageCard[];
}

export default function WorldMapPanel({
  activeStageSelection,
  onSelectStage,
  stageCards
}: IWorldMapPanelProps) {
  return (
    <aside style={panelStyle}>
      <div style={headerStyle}>
        <span style={eyebrowStyle}>World Map</span>
        <strong style={titleStyle}>Neon Alley</strong>
      </div>
      <div style={stageListStyle}>
        {stageCards.map((stageCard, index) => {
          const isActive =
            activeStageSelection?.worldId === stageCard.worldId &&
            activeStageSelection.stageId === stageCard.stageId;

          return (
            <button
              key={stageCard.stageId}
              type='button'
              disabled={!stageCard.isUnlocked}
              onClick={() => {
                onSelectStage({
                  worldId: stageCard.worldId,
                  stageId: stageCard.stageId
                });
              }}
              style={{
                ...stageButtonStyle,
                ...(stageCard.isUnlocked ? stageButtonUnlockedStyle : stageButtonLockedStyle),
                ...(isActive ? stageButtonActiveStyle : null)
              }}
            >
              <div style={stageMetaStyle}>
                <span style={stageLabelStyle}>Stage {index + 1}</span>
                <span style={stageIdStyle}>{stageCard.stageId}</span>
              </div>
              <div style={stageFooterStyle}>
                <span>{stageCard.isCompleted ? 'Completed' : stageCard.isUnlocked ? 'Unlocked' : 'Locked'}</span>
                <span>{renderStars(stageCard.starCount)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function renderStars(starCount: number) {
  return `${'★'.repeat(starCount)}${'☆'.repeat(3 - starCount)}`;
}

const panelStyle = {
  width: 280,
  minHeight: '100%',
  padding: '22px 18px',
  display: 'grid',
  gap: 16,
  background: 'linear-gradient(180deg, rgba(7, 11, 22, 0.96), rgba(10, 14, 28, 0.88))',
  borderRight: '1px solid rgba(120, 227, 255, 0.12)'
} as const;

const headerStyle = {
  display: 'grid',
  gap: 6
} as const;

const eyebrowStyle = {
  color: '#78e3ff',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontSize: 11
} as const;

const titleStyle = {
  fontSize: 24
} as const;

const stageListStyle = {
  display: 'grid',
  gap: 10
} as const;

const stageButtonStyle = {
  borderRadius: 18,
  padding: '14px 14px 12px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  textAlign: 'left'
} as const;

const stageButtonUnlockedStyle = {
  background: 'rgba(20, 30, 58, 0.92)',
  color: '#f5f7ff',
  cursor: 'pointer'
} as const;

const stageButtonLockedStyle = {
  background: 'rgba(14, 18, 30, 0.8)',
  color: 'rgba(245, 247, 255, 0.42)',
  cursor: 'not-allowed'
} as const;

const stageButtonActiveStyle = {
  border: '1px solid rgba(255, 120, 199, 0.54)',
  boxShadow: '0 0 0 1px rgba(255, 120, 199, 0.18) inset'
} as const;

const stageMetaStyle = {
  display: 'grid',
  gap: 4,
  marginBottom: 10
} as const;

const stageLabelStyle = {
  fontWeight: 700
} as const;

const stageIdStyle = {
  fontSize: 11,
  opacity: 0.72
} as const;

const stageFooterStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 12
} as const;
