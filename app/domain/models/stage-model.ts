export type TStageKind = 'tutorial' | 'normal' | 'challenge' | 'climax';

export interface IStagePresentationProfile {
  accentColor: string;
  completionHeadline: string;
  objectiveText: string;
  shellLabel: string;
  teachByPlayCueList: string[];
}

export interface IStageRulesProfile {
  gateLayout: 'training' | 'standard' | 'pressure';
  lossRowBufferRows: number;
}

export interface IStageUnlockProfile {
  nextWorldIdToUnlock: string | null;
}

export interface IRawStageContentDefinition {
  id: string;
  worldId: string;
  title: string;
  kind: TStageKind;
  assetBundleIds: string[];
  teachingFocusText?: string;
  nextWorldIdToUnlock?: string | null;
  initialBoardPatterns: number[][];
  spawnPatterns: number[][];
}

export interface IStageRuntimeConfig {
  worldId: string;
  stageId: string;
  stageTitle: string;
  stageKind: TStageKind;
  boardColumns: number;
  assetBundleIds: string[];
  presentationProfile: IStagePresentationProfile;
  rulesProfile: IStageRulesProfile;
  unlockProfile: IStageUnlockProfile;
  initialBoardPatterns: number[][];
  spawnPatterns: number[][];
}

export interface IStageSelection {
  worldId: string;
  stageId: string;
}
