import type { IStageSelection } from '../../domain/models/stage-model';

interface IWorldMapStageCard {
  accentColor: string;
  isCompleted: boolean;
  isUnlocked: boolean;
  objectiveText: string;
  stageId: string;
  stageKind: string;
  stageTitle: string;
  shellLabel: string;
  starCount: number;
  worldId: string;
}

interface IWorldMapWorldSection {
  isUnlocked: boolean;
  stageCards: IWorldMapStageCard[];
  title: string;
  worldId: string;
}

interface IWorldMapPanelProps {
  activeStageSelection: IStageSelection | null;
  featuredPurchaseLabel: string;
  hasPurchasedFeaturedPack: boolean;
  isPurchasePending: boolean;
  purchaseFeedback: string | null;
  onPurchaseFeatured: () => void;
  onSelectStage: (selection: IStageSelection) => void;
  worldSections: IWorldMapWorldSection[];
}

export default function WorldMapPanel({
  activeStageSelection,
  featuredPurchaseLabel,
  hasPurchasedFeaturedPack,
  isPurchasePending,
  purchaseFeedback,
  onPurchaseFeatured,
  onSelectStage,
  worldSections
}: IWorldMapPanelProps) {
  return (
    <aside style={panelStyle}>
      <div style={headerStyle}>
        <span style={eyebrowStyle}>World Map</span>
        <strong style={titleStyle}>Stage Route</strong>
      </div>
      <div style={stageListStyle}>
        {worldSections.map((worldSection) => {
          return (
            <section key={worldSection.worldId} style={worldSectionStyle}>
              <div style={worldHeaderStyle}>
                <span
                  style={{
                    ...worldStatusStyle,
                    ...(worldSection.isUnlocked ? worldStatusUnlockedStyle : worldStatusLockedStyle)
                  }}
                >
                  {worldSection.isUnlocked ? 'Unlocked World' : 'Locked World'}
                </span>
                <strong style={worldTitleStyle}>{worldSection.title}</strong>
              </div>
              <div style={worldStageListStyle}>
                {worldSection.stageCards.map((stageCard, index) => {
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
                        ...(isActive ? stageButtonActiveStyle : null),
                        borderLeft: `4px solid ${stageCard.accentColor}`
                      }}
                    >
                      <div style={stageMetaStyle}>
                        <span style={stageLabelStyle}>Stage {index + 1}</span>
                        <strong style={stageTitleStyle}>{stageCard.stageTitle}</strong>
                        <span style={stageIdStyle}>{stageCard.stageId}</span>
                      </div>
                      <div style={stageTagRowStyle}>
                        <span style={stageKindBadgeStyle}>{stageCard.shellLabel}</span>
                        <span style={stageKindTextStyle}>{stageCard.stageKind}</span>
                      </div>
                      <p style={stageObjectiveStyle}>{stageCard.objectiveText}</p>
                      <div style={stageFooterStyle}>
                        <span>
                          {stageCard.isCompleted
                            ? 'Completed'
                            : stageCard.isUnlocked
                              ? 'Unlocked'
                              : 'Locked'}
                        </span>
                        <span>{renderStars(stageCard.starCount)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <section style={monetizationPanelStyle}>
        <span style={eyebrowStyle}>Support</span>
        <strong style={monetizationTitleStyle}>Optional Meta Boost</strong>
        <p style={monetizationTextStyle}>
          광고와 구매는 코어 루프 밖 adapter/service 경계에서만 처리됩니다.
        </p>
        <button
          type='button'
          disabled={isPurchasePending || hasPurchasedFeaturedPack}
          onClick={onPurchaseFeatured}
          style={{
            ...purchaseButtonStyle,
            ...(isPurchasePending ? purchaseButtonPendingStyle : null),
            ...(hasPurchasedFeaturedPack ? purchaseButtonOwnedStyle : null)
          }}
        >
          {isPurchasePending
            ? 'Processing Purchase...'
            : hasPurchasedFeaturedPack
              ? `${featuredPurchaseLabel} Owned`
              : `Buy ${featuredPurchaseLabel}`}
        </button>
        {purchaseFeedback ? <p style={monetizationFeedbackStyle}>{purchaseFeedback}</p> : null}
      </section>
    </aside>
  );
}

function renderStars(starCount: number) {
  return `${'★'.repeat(starCount)}${'☆'.repeat(3 - starCount)}`;
}

const panelStyle = {
  width: '100%',
  minHeight: '100%',
  padding: '22px 18px',
  display: 'grid',
  alignContent: 'start',
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
  gap: 16,
  alignContent: 'start'
} as const;

const worldSectionStyle = {
  display: 'grid',
  gap: 10
} as const;

const worldHeaderStyle = {
  display: 'grid',
  gap: 4
} as const;

const worldStatusStyle = {
  fontSize: 11,
  letterSpacing: '0.12em',
  textTransform: 'uppercase'
} as const;

const worldStatusUnlockedStyle = {
  color: '#8dffb3'
} as const;

const worldStatusLockedStyle = {
  color: 'rgba(245, 247, 255, 0.42)'
} as const;

const worldTitleStyle = {
  fontSize: 18
} as const;

const worldStageListStyle = {
  display: 'grid',
  gap: 10
} as const;

const monetizationPanelStyle = {
  display: 'grid',
  gap: 10,
  marginTop: 8,
  padding: '16px 14px',
  borderRadius: 18,
  background: 'rgba(17, 23, 42, 0.88)',
  border: '1px solid rgba(255, 214, 102, 0.2)'
} as const;

const monetizationTitleStyle = {
  fontSize: 16
} as const;

const monetizationTextStyle = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.45,
  color: 'rgba(245, 247, 255, 0.72)'
} as const;

const monetizationFeedbackStyle = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.45,
  color: '#ffe79f'
} as const;

const purchaseButtonStyle = {
  borderRadius: 14,
  border: '1px solid rgba(255, 214, 102, 0.24)',
  background: 'linear-gradient(135deg, rgba(255, 230, 128, 0.95), rgba(255, 125, 107, 0.95))',
  color: '#1f1424',
  fontWeight: 700,
  padding: '12px 14px',
  cursor: 'pointer'
} as const;

const purchaseButtonPendingStyle = {
  opacity: 0.7,
  cursor: 'wait'
} as const;

const purchaseButtonOwnedStyle = {
  background: 'linear-gradient(135deg, rgba(140, 255, 179, 0.92), rgba(120, 227, 255, 0.92))'
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
  marginBottom: 8
} as const;

const stageLabelStyle = {
  fontWeight: 700,
  fontSize: 12,
  opacity: 0.82
} as const;

const stageTitleStyle = {
  fontSize: 16
} as const;

const stageIdStyle = {
  fontSize: 11,
  opacity: 0.72
} as const;

const stageTagRowStyle = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  marginBottom: 8,
  flexWrap: 'wrap'
} as const;

const stageKindBadgeStyle = {
  borderRadius: 999,
  padding: '4px 8px',
  fontSize: 11,
  background: 'rgba(255, 255, 255, 0.08)'
} as const;

const stageKindTextStyle = {
  fontSize: 11,
  textTransform: 'uppercase',
  opacity: 0.72
} as const;

const stageObjectiveStyle = {
  margin: '0 0 10px',
  fontSize: 12,
  lineHeight: 1.4,
  opacity: 0.86
} as const;

const stageFooterStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 12
} as const;
