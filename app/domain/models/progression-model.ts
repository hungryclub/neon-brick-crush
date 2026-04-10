import type { IStageSelection, TStageKind } from './stage-model';
import type { IEventClaimState } from './event-model';

export interface IPlayerSettings {
  isReducedMotionEnabled: boolean;
  isSfxEnabled: boolean;
  isTutorialHintsEnabled: boolean;
}

export interface IStageProgressState {
  bestStarCount: number;
  isCompleted: boolean;
  isUnlocked: boolean;
}

export interface IProgressionSnapshot {
  version: number;
  playerLevel: number;
  totalXp: number;
  settings: IPlayerSettings;
  eventClaimStateById: Record<string, IEventClaimState>;
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
