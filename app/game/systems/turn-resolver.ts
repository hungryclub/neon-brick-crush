import type { IStageBoardCell } from '../entities/stage-board';
import type { IStageGate, TShotPath } from '../entities/stage-gates';
import {
  appendModifierTrace,
  applyFeverModifiers,
  applyGateModifiers,
  createInitialResolvedTurnState,
  type IFeverFeedbackEvent,
  type ITurnFeedbackEvent,
  type ITurnModifierTraceEntry
} from '../mechanics/gate-modifier-pipeline.js';

export interface ITurnResolutionInput {
  board: IStageBoardCell[];
  feverActive?: boolean;
  gates?: IStageGate[];
  shotPath?: TShotPath | null;
  turnNumber: number;
  lossRow: number;
  spawnRow: (turnNumber: number) => IStageBoardCell[];
}

export interface ITurnResolutionResult {
  board: IStageBoardCell[];
  feedbackEvents: Array<ITurnFeedbackEvent | IFeverFeedbackEvent>;
  hasReachedLossLine: boolean;
  dangerLevel: number;
  modifierTrace: ITurnModifierTraceEntry[];
  turnNumber: number;
}

export function resolveTurn({
  board,
  feverActive,
  gates,
  shotPath,
  turnNumber,
  lossRow,
  spawnRow
}: ITurnResolutionInput): ITurnResolutionResult {
  const safeLossRow = Math.max(lossRow, 1);
  const feverApplied = applyFeverModifiers(
    applyGateModifiers(
      appendModifierTrace(
        createInitialResolvedTurnState(resolveBaseTurn({ board, turnNumber, spawnRow })),
        {
          phase: 'base',
          applied: true
        }
      ),
      {
        feverActive,
        gates,
        shotPath
      }
    ),
    {
      feverActive,
      gates,
      shotPath
    }
  );
  const finalizedBoard = feverApplied.board;
  const maxRow = finalizedBoard.reduce((highestRow, cell) => {
    return Math.max(highestRow, cell.row);
  }, 0);
  const finalizedState = appendModifierTrace(feverApplied, {
    phase: 'finalize',
    applied: true
  });

  return {
    board: finalizedBoard,
    feedbackEvents: finalizedState.feedbackEvents,
    hasReachedLossLine: maxRow >= safeLossRow,
    dangerLevel: Math.max(0, Math.min(maxRow / safeLossRow, 1)),
    modifierTrace: finalizedState.modifierTrace,
    turnNumber: finalizedState.turnNumber
  };
}

function resolveBaseTurn({
  board,
  turnNumber,
  spawnRow
}: {
  board: IStageBoardCell[];
  turnNumber: number;
  spawnRow: (turnNumber: number) => IStageBoardCell[];
}) {
  const descendedBoard = board.map((cell) => ({
    ...cell,
    row: cell.row + 1
  }));
  const nextTurnNumber = turnNumber + 1;

  return {
    board: [...spawnRow(nextTurnNumber), ...descendedBoard],
    turnNumber: nextTurnNumber
  };
}
