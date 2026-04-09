import type { IStageBoardCell } from '../entities/stage-board';

export interface ITurnResolutionInput {
  board: IStageBoardCell[];
  turnNumber: number;
  lossRow: number;
  spawnRow: (turnNumber: number) => IStageBoardCell[];
}

export interface ITurnResolutionResult {
  board: IStageBoardCell[];
  hasReachedLossLine: boolean;
  dangerLevel: number;
  turnNumber: number;
}

export function resolveTurn({
  board,
  turnNumber,
  lossRow,
  spawnRow
}: ITurnResolutionInput): ITurnResolutionResult {
  const safeLossRow = Math.max(lossRow, 1);
  const descendedBoard = board.map((cell) => ({
    ...cell,
    row: cell.row + 1
  }));
  const nextTurnNumber = turnNumber + 1;
  const nextBoard = [...spawnRow(nextTurnNumber), ...descendedBoard];
  const maxRow = nextBoard.reduce((highestRow, cell) => {
    return Math.max(highestRow, cell.row);
  }, 0);

  return {
    board: nextBoard,
    hasReachedLossLine: maxRow >= safeLossRow,
    dangerLevel: Math.max(0, Math.min(maxRow / safeLossRow, 1)),
    turnNumber: nextTurnNumber
  };
}
