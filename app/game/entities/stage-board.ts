import type { IStageRuntimeConfig } from '../../domain/models/stage-model';

export interface IStageBoardCell {
  id: string;
  col: number;
  row: number;
  hp: number;
}

export function createInitialStageBoard(stageRuntimeConfig: IStageRuntimeConfig) {
  return stageRuntimeConfig.initialBoardPatterns.flatMap((pattern, row) =>
    createCellsFromPattern({
      pattern,
      row,
      turnNumber: 0
    })
  );
}

export function createSpawnRow(
  turnNumber: number,
  stageRuntimeConfig: Pick<IStageRuntimeConfig, 'spawnPatterns'>
) {
  const pattern =
    stageRuntimeConfig.spawnPatterns[
      (turnNumber - 1) % stageRuntimeConfig.spawnPatterns.length
    ];

  return createCellsFromPattern({
    pattern,
    row: 0,
    turnNumber
  });
}

function createCellsFromPattern({
  pattern,
  row,
  turnNumber
}: {
  pattern: ReadonlyArray<number>;
  row: number;
  turnNumber: number;
}) {
  return pattern.flatMap((isFilled, col) => {
    if (!isFilled) {
      return [];
    }

    return {
      id: `block-${turnNumber}-${row}-${col}`,
      col,
      row,
      hp: getBlockHp(turnNumber, col, row)
    };
  });
}

function getBlockHp(turnNumber: number, col: number, row: number) {
  return ((turnNumber + col + row) % 3) + 1;
}
