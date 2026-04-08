import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveTurn } from '../../game/systems/turn-resolver.ts';

test('resolveTurn descends board cells and spawns a new top row deterministically', () => {
  const result = resolveTurn({
    board: [
      { id: 'block-a', col: 0, row: 0, hp: 1 },
      { id: 'block-b', col: 2, row: 2, hp: 2 }
    ],
    turnNumber: 1,
    lossRow: 6,
    spawnRow(nextTurnNumber) {
      return [{ id: `spawn-${nextTurnNumber}`, col: 3, row: 0, hp: 2 }];
    }
  });

  const descendedExistingRows = result.board
    .filter((cell) => cell.id === 'block-a' || cell.id === 'block-b')
    .map((cell) => cell.row);

  assert.deepEqual(descendedExistingRows, [1, 3]);
  assert.equal(result.turnNumber, 2);
  assert.ok(result.board.some((cell) => cell.row === 0));
});

test('resolveTurn reports danger once blocks cross the configured loss row', () => {
  const result = resolveTurn({
    board: [{ id: 'block-a', col: 1, row: 6, hp: 1 }],
    turnNumber: 3,
    lossRow: 6,
    spawnRow() {
      return [];
    }
  });

  assert.equal(result.hasReachedLossLine, true);
  assert.equal(result.dangerLevel, 1);
});
