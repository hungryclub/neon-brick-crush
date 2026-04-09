export type TStageKind = 'tutorial' | 'normal' | 'challenge' | 'climax';

export interface IRawStageContentDefinition {
  id: string;
  worldId: string;
  title: string;
  kind: TStageKind;
  assetBundleIds: string[];
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
  initialBoardPatterns: number[][];
  spawnPatterns: number[][];
}

export interface IStageSelection {
  worldId: string;
  stageId: string;
}
