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

interface IMobileMapLayoutProps {
  activeStageSelection: IStageSelection | null;
  featuredPurchaseLabel: string;
  hasPurchasedFeaturedPack: boolean;
  isPurchasePending: boolean;
  onBackToPlay: () => void;
  onPlaySelectedStage: (selection: IStageSelection) => void;
  onPurchaseFeatured: () => void;
  onSelectStage: (selection: IStageSelection) => void;
  purchaseFeedback: string | null;
  worldSections: IWorldMapWorldSection[];
}

export default function MobileMapLayout({
  activeStageSelection,
  featuredPurchaseLabel,
  hasPurchasedFeaturedPack,
  isPurchasePending,
  onBackToPlay,
  onPlaySelectedStage,
  onPurchaseFeatured,
  onSelectStage,
  purchaseFeedback,
  worldSections
}: IMobileMapLayoutProps) {
  const activeWorldSection =
    worldSections.find((section) => section.worldId === activeStageSelection?.worldId) ??
    worldSections.find((section) => section.isUnlocked) ??
    worldSections[0] ??
    null;

  const selectedStageCard =
    activeWorldSection?.stageCards.find((card) => card.stageId === activeStageSelection?.stageId) ??
    activeWorldSection?.stageCards.find((card) => card.isUnlocked) ??
    null;

  return (
    <section style={layoutStyle}>
      <header style={topBarStyle}>
        <button style={topButtonStyle} type='button' onClick={onBackToPlay}>
          Back
        </button>
        <div style={titleWrapStyle}>
          <span style={eyebrowStyle}>World Map</span>
          <strong style={titleStyle}>{activeWorldSection?.title ?? 'Stage Route'}</strong>
        </div>
        <div style={progressPillStyle}>
          {activeWorldSection?.stageCards.filter((stageCard) => stageCard.isCompleted).length ?? 0}/
          {activeWorldSection?.stageCards.length ?? 0}
        </div>
      </header>

      <section style={mapCardStyle}>
        <div style={gridStyle}>
          {(activeWorldSection?.stageCards ?? []).map((stageCard, index) => {
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
                  ...stageCardStyle,
                  ...(stageCard.isUnlocked ? unlockedStageCardStyle : lockedStageCardStyle),
                  ...(isActive ? activeStageCardStyle : null),
                  borderLeft: `4px solid ${stageCard.accentColor}`
                }}
              >
                <span style={stageIndexStyle}>Stage {index + 1}</span>
                <strong style={stageTitleStyle}>{stageCard.stageTitle}</strong>
                <span style={stageMetaStyle}>{stageCard.shellLabel}</span>
                <span style={stageStarsStyle}>
                  {'★'.repeat(stageCard.starCount)}
                  {'☆'.repeat(3 - stageCard.starCount)}
                </span>
              </button>
            );
          })}
        </div>

        {selectedStageCard ? (
          <div style={selectedStageCardStyle}>
            <span style={eyebrowStyle}>{selectedStageCard.stageKind}</span>
            <strong style={selectedStageTitleStyle}>{selectedStageCard.stageTitle}</strong>
            <p style={selectedStageTextStyle}>{selectedStageCard.objectiveText}</p>
            <button
              style={primaryActionStyle}
              type='button'
              disabled={!selectedStageCard.isUnlocked}
              onClick={() => {
                onPlaySelectedStage({
                  worldId: selectedStageCard.worldId,
                  stageId: selectedStageCard.stageId
                });
              }}
            >
              Play Selected Stage
            </button>
          </div>
        ) : null}
      </section>

      <section style={metaCardStyle}>
        <div style={supportCopyStyle}>
          <span style={eyebrowStyle}>Support</span>
          <strong style={supportTitleStyle}>Optional Meta Boost</strong>
        </div>
        <button
          type='button'
          disabled={isPurchasePending || hasPurchasedFeaturedPack}
          onClick={onPurchaseFeatured}
          style={{
            ...supportButtonStyle,
            ...(isPurchasePending ? supportButtonPendingStyle : null),
            ...(hasPurchasedFeaturedPack ? supportButtonOwnedStyle : null)
          }}
        >
          {isPurchasePending
            ? 'Processing Purchase...'
            : hasPurchasedFeaturedPack
              ? `${featuredPurchaseLabel} Owned`
              : `Buy ${featuredPurchaseLabel}`}
        </button>
        {purchaseFeedback ? <p style={feedbackStyle}>{purchaseFeedback}</p> : null}
      </section>
    </section>
  );
}

const layoutStyle = {
  height: '100dvh',
  display: 'grid',
  gridTemplateRows: 'auto minmax(0, 1fr) auto',
  gap: 12,
  padding: 'calc(env(safe-area-inset-top, 0px) + 10px) 12px calc(env(safe-area-inset-bottom, 0px) + 12px)',
  overflow: 'hidden'
} as const;

const topBarStyle = {
  display: 'grid',
  gridTemplateColumns: 'auto minmax(0, 1fr) auto',
  gap: 10,
  alignItems: 'center'
} as const;

const titleWrapStyle = {
  display: 'grid',
  gap: 2,
  minWidth: 0
} as const;

const eyebrowStyle = {
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#78e3ff'
} as const;

const titleStyle = {
  fontSize: 20,
  lineHeight: 1.1,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
} as const;

const topButtonStyle = {
  borderRadius: 999,
  border: '1px solid rgba(120, 227, 255, 0.26)',
  background: 'rgba(13, 18, 35, 0.92)',
  color: '#f5f7ff',
  padding: '12px 16px',
  fontWeight: 700,
  cursor: 'pointer'
} as const;

const progressPillStyle = {
  minWidth: 48,
  textAlign: 'center',
  padding: '10px 12px',
  borderRadius: 999,
  background: 'rgba(255, 0, 145, 0.18)',
  border: '1px solid rgba(255, 120, 199, 0.28)',
  fontWeight: 700
} as const;

const mapCardStyle = {
  minHeight: 0,
  borderRadius: 22,
  border: '1px solid rgba(120, 227, 255, 0.14)',
  background: 'rgba(7, 11, 22, 0.9)',
  padding: 14,
  display: 'grid',
  gridTemplateRows: 'auto auto',
  gap: 12,
  overflow: 'hidden'
} as const;

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 10
} as const;

const stageCardStyle = {
  minWidth: 0,
  borderRadius: 18,
  padding: '12px 12px 10px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  textAlign: 'left',
  display: 'grid',
  gap: 4
} as const;

const unlockedStageCardStyle = {
  background: 'rgba(20, 30, 58, 0.92)',
  color: '#f5f7ff',
  cursor: 'pointer'
} as const;

const lockedStageCardStyle = {
  background: 'rgba(14, 18, 30, 0.8)',
  color: 'rgba(245, 247, 255, 0.42)',
  cursor: 'not-allowed'
} as const;

const activeStageCardStyle = {
  border: '1px solid rgba(255, 120, 199, 0.54)',
  boxShadow: '0 0 0 1px rgba(255, 120, 199, 0.18) inset'
} as const;

const stageIndexStyle = {
  fontSize: 11,
  opacity: 0.8
} as const;

const stageTitleStyle = {
  fontSize: 15,
  lineHeight: 1.15
} as const;

const stageMetaStyle = {
  fontSize: 10,
  textTransform: 'uppercase',
  opacity: 0.72
} as const;

const stageStarsStyle = {
  fontSize: 12
} as const;

const selectedStageCardStyle = {
  padding: '14px 14px 12px',
  borderRadius: 18,
  border: '1px solid rgba(120, 227, 255, 0.24)',
  background: 'rgba(12, 17, 31, 0.92)',
  display: 'grid',
  gap: 8
} as const;

const selectedStageTitleStyle = {
  fontSize: 19
} as const;

const selectedStageTextStyle = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.45,
  color: 'rgba(245, 247, 255, 0.76)'
} as const;

const primaryActionStyle = {
  border: 'none',
  borderRadius: 999,
  padding: '14px 18px',
  background: 'linear-gradient(135deg, #78e3ff, #ff67b0)',
  color: '#08101f',
  fontWeight: 700,
  cursor: 'pointer'
} as const;

const metaCardStyle = {
  display: 'grid',
  gap: 10,
  padding: '14px 14px 12px',
  borderRadius: 18,
  background: 'rgba(17, 23, 42, 0.88)',
  border: '1px solid rgba(255, 214, 102, 0.2)'
} as const;

const supportCopyStyle = {
  display: 'grid',
  gap: 4
} as const;

const supportTitleStyle = {
  fontSize: 15
} as const;

const supportButtonStyle = {
  borderRadius: 14,
  border: '1px solid rgba(255, 214, 102, 0.24)',
  background: 'linear-gradient(135deg, rgba(255, 230, 128, 0.95), rgba(255, 125, 107, 0.95))',
  color: '#1f1424',
  fontWeight: 700,
  padding: '12px 14px',
  cursor: 'pointer'
} as const;

const supportButtonPendingStyle = {
  opacity: 0.7,
  cursor: 'wait'
} as const;

const supportButtonOwnedStyle = {
  background: 'linear-gradient(135deg, rgba(140, 255, 179, 0.92), rgba(120, 227, 255, 0.92))'
} as const;

const feedbackStyle = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.45,
  color: '#ffe79f'
} as const;
