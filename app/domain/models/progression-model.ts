import type { IStageSelection, TStageKind } from './stage-model';

export interface IStageProgressState {
  bestStarCount: number;
  isCompleted: boolean;
  isUnlocked: boolean;
}

export interface IProgressionSnapshot {
  version: number;
  unlockedWorldIdList: string[];
  stageProgressById: Record<string, IStageProgressState>;
  lastPlayedStageSelection: IStageSelection | null;
}

export interface IStageCompletionRecord extends IStageSelection {
  starCount: number;
  stageKind?: TStageKind;
  stageTitle?: string;
  unlockedWorldIds?: string[];
}
