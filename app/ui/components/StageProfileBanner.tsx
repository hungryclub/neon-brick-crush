import type { IStageRuntimeConfig } from '../../domain/models/stage-model';
import type { IRuntimeHudSnapshot } from '../../game/hud-bridges/game-runtime-bridge';

interface IStageProfileBannerProps {
  runtimeHud: IRuntimeHudSnapshot;
  stageRuntimeConfig: IStageRuntimeConfig | null;
}

export default function StageProfileBanner({
  runtimeHud,
  stageRuntimeConfig
}: IStageProfileBannerProps) {
  if (!stageRuntimeConfig) {
    return null;
  }

  const accentColor = stageRuntimeConfig.presentationProfile.accentColor;
  const teachByPlayCue = resolveTeachByPlayCue(stageRuntimeConfig, runtimeHud);

  return (
    <div
      style={{
        ...panelStyle,
        borderColor: accentColor,
        boxShadow: `0 10px 40px ${accentColor}22`
      }}
    >
      <span style={{ ...eyebrowStyle, color: accentColor }}>
        {stageRuntimeConfig.presentationProfile.shellLabel}
      </span>
      <strong style={titleStyle}>{stageRuntimeConfig.stageTitle}</strong>
      <p style={objectiveStyle}>{stageRuntimeConfig.presentationProfile.objectiveText}</p>
      {teachByPlayCue ? (
        <p style={{ ...cueStyle, borderLeft: `3px solid ${accentColor}` }}>{teachByPlayCue}</p>
      ) : null}
    </div>
  );
}

function resolveTeachByPlayCue(
  stageRuntimeConfig: IStageRuntimeConfig,
  runtimeHud: IRuntimeHudSnapshot
) {
  const cueList = stageRuntimeConfig.presentationProfile.teachByPlayCueList;

  if (cueList.length === 0) {
    return null;
  }

  if (stageRuntimeConfig.stageKind !== 'tutorial') {
    return cueList[0];
  }

  if (runtimeHud.turnNumber <= 1 && runtimeHud.shotState === 'idle') {
    return cueList[0];
  }

  return cueList[1] ?? cueList[0];
}

const panelStyle = {
  position: 'absolute',
  top: 18,
  left: 18,
  zIndex: 2,
  width: 'min(360px, calc(100% - 36px))',
  padding: '14px 16px',
  display: 'grid',
  gap: 6,
  borderRadius: 18,
  border: '1px solid rgba(255, 255, 255, 0.18)',
  background: 'rgba(7, 11, 22, 0.78)',
  backdropFilter: 'blur(10px)'
} as const;

const eyebrowStyle = {
  fontSize: 11,
  letterSpacing: '0.12em',
  textTransform: 'uppercase'
} as const;

const titleStyle = {
  fontSize: 20
} as const;

const objectiveStyle = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.45,
  color: '#dbe3ff'
} as const;

const cueStyle = {
  margin: 0,
  paddingLeft: 10,
  fontSize: 12,
  lineHeight: 1.45,
  color: '#f5f7ff'
} as const;
