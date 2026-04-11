import type { IStageBoardCell } from '../entities/stage-board';
import type { IStageRuntimeConfig } from '../../domain/models/stage-model';
import type { TRuntimeShotState } from '../hud-bridges/game-runtime-bridge';

const MAX_STAGE_BUFFER_ROWS = 3;

export function resolveLossRow({
  boardTop,
  blockHeight,
  blockGap,
  initialBoard,
  lossLineY,
  lossRowBufferRows
}: {
  boardTop: number;
  blockHeight: number;
  blockGap: number;
  initialBoard: IStageBoardCell[];
  lossLineY: number;
  lossRowBufferRows: number;
}) {
  const maxPlayableRow =
    Math.floor((lossLineY - boardTop) / (blockHeight + blockGap)) - 1;
  const highestInitialRow = initialBoard.reduce((highestRow, cell) => {
    return Math.max(highestRow, cell.row);
  }, 0);
  const strictnessOffset = Math.max(MAX_STAGE_BUFFER_ROWS - lossRowBufferRows, 0);
  const profiledLossRow = maxPlayableRow - strictnessOffset;

  return Math.max(profiledLossRow, highestInitialRow + 1, 1);
}

export function resolveStagePromptText(
  stageRuntimeConfig: IStageRuntimeConfig,
  turnNumber: number,
  shotState: TRuntimeShotState
) {
  if (stageRuntimeConfig.stageKind === 'tutorial') {
    if (turnNumber <= 1 && shotState === 'idle') {
      return 'drag to aim / release to learn the first bounce';
    }

    return 'keep playing: repeat the angle before the next row drops';
  }

  if (stageRuntimeConfig.stageKind === 'challenge') {
    return 'precision route: protect your star run with efficient shots';
  }

  if (stageRuntimeConfig.stageKind === 'climax') {
    return 'world finale: hold the lane and finish the last lattice';
  }

  return 'drag to aim / release to shoot';
}
