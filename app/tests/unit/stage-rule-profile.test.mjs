import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveLossRow } from '../../game/systems/stage-rule-profile.ts';

test('stage rule profile changes the effective loss row by stage buffer', () => {
  const initialBoard = [
    { id: 'cell-0', row: 0, col: 0, hp: 1 },
    { id: 'cell-1', row: 1, col: 1, hp: 1 }
  ];

  const tutorialLossRow = resolveLossRow({
    boardTop: 112,
    initialBoard,
    launcherY: 634,
    lossRowBufferRows: 3
  });
  const challengeLossRow = resolveLossRow({
    boardTop: 112,
    initialBoard,
    launcherY: 634,
    lossRowBufferRows: 1
  });

  assert.equal(tutorialLossRow > challengeLossRow, true);
});
