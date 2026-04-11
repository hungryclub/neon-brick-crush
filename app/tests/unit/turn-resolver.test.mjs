import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveTurn } from '../../game/systems/turn-resolver.ts';
import { createStageGates } from '../../game/entities/stage-gates.ts';

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
  assert.deepEqual(
    result.modifierTrace.map((entry) => entry.phase),
    ['base', 'gate', 'fever', 'finalize']
  );
  assert.equal(result.comboBranch, 'base');
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

test('resolveTurn applies gate modifier before finalize and emits feedback data', () => {
  const [gate] = createStageGates({
    launcherY: 634,
    width: 960
  });
  const result = resolveTurn({
    board: [{ id: 'block-a', col: 1, row: 1, hp: 1 }],
    gates: [gate],
    shotPath: [
      {
        start: { x: gate.bounds.x + gate.bounds.width / 2, y: 634 },
        end: { x: gate.bounds.x + gate.bounds.width / 2, y: 120 }
      }
    ],
    turnNumber: 2,
    lossRow: 6,
    spawnRow() {
      return [
        { id: 'spawn-a', col: 0, row: 0, hp: 1 },
        { id: 'spawn-b', col: 1, row: 0, hp: 3 }
      ];
    }
  });

  assert.equal(result.board.some((cell) => cell.id === 'spawn-b'), false);
  assert.deepEqual(result.feedbackEvents, [
    {
      type: 'gate.triggered',
      gateId: gate.id,
      gateKind: gate.kind,
      affectedCellId: 'spawn-b'
    }
  ]);
  assert.deepEqual(
    result.modifierTrace.map((entry) => entry.phase),
    ['base', 'gate', 'fever', 'finalize']
  );
  assert.deepEqual(
    result.modifierTrace.map((entry) => entry.applied),
    [true, true, false, true]
  );
  assert.equal(result.comboBranch, 'gate-only');
});

test('resolveTurn can trigger a gate from a later shot-path segment', () => {
  const [gate] = createStageGates({
    launcherY: 634,
    width: 960
  });
  const gateCenterX = gate.bounds.x + gate.bounds.width / 2;
  const gateCenterY = gate.bounds.y + gate.bounds.height / 2;
  const result = resolveTurn({
    board: [{ id: 'block-a', col: 2, row: 1, hp: 1 }],
    gates: [gate],
    shotPath: [
      {
        start: { x: 800, y: 634 },
        end: { x: 880, y: 420 }
      },
      {
        start: { x: 880, y: 420 },
        end: { x: gateCenterX, y: gateCenterY }
      }
    ],
    turnNumber: 4,
    lossRow: 6,
    spawnRow() {
      return [{ id: 'spawn-late', col: 3, row: 0, hp: 2 }];
    }
  });

  assert.equal(result.board.some((cell) => cell.id === 'spawn-late'), false);
  assert.equal(result.feedbackEvents[0]?.gateId, gate.id);
});

test('resolveTurn keeps fever out of turn-finalize mutation even when a gate also triggered', () => {
  const [gate] = createStageGates({
    launcherY: 634,
    width: 960
  });
  const result = resolveTurn({
    board: [{ id: 'block-a', col: 1, row: 1, hp: 2 }],
    activeFeverMode: 'breaker',
    gates: [gate],
    shotPath: [
      {
        start: { x: gate.bounds.x + gate.bounds.width / 2, y: 634 },
        end: { x: gate.bounds.x + gate.bounds.width / 2, y: 120 }
      }
    ],
    turnNumber: 3,
    lossRow: 6,
    spawnRow() {
      return [
        { id: 'spawn-a', col: 0, row: 0, hp: 1 },
        { id: 'spawn-b', col: 1, row: 0, hp: 3 }
      ];
    }
  });

  assert.equal(result.comboBranch, 'gate-only');
  assert.deepEqual(
    result.feedbackEvents.map((event) => event.type),
    ['gate.triggered']
  );
  assert.equal(result.board.some((cell) => cell.id === 'block-a'), true);
});

test('resolveTurn no longer clears unrelated blocks during fever-only turns', () => {
  const result = resolveTurn({
    board: [
      { id: 'block-a', col: 0, row: 1, hp: 1 },
      { id: 'block-b', col: 1, row: 2, hp: 4 },
      { id: 'block-c', col: 2, row: 3, hp: 3 }
    ],
    activeFeverMode: 'breaker',
    turnNumber: 5,
    lossRow: 8,
    spawnRow() {
      return [{ id: 'spawn-a', col: 0, row: 0, hp: 2 }];
    }
  });

  assert.equal(result.comboBranch, 'base');
  assert.equal(result.feedbackEvents.some((event) => event.type === 'fever.activated'), false);
  assert.equal(result.board.some((cell) => cell.id === 'block-b'), true);
  assert.equal(result.board.some((cell) => cell.id === 'block-c'), true);
});

test('resolveTurn does not delete extra cells for pierce fever at finalize time', () => {
  const result = resolveTurn({
    board: [
      { id: 'left', col: 0, row: 3, hp: 3 },
      { id: 'center', col: 4, row: 2, hp: 2 },
      { id: 'right', col: 6, row: 3, hp: 4 }
    ],
    activeFeverMode: 'pierce',
    shotPath: [
      {
        start: { x: 320, y: 620 },
        end: { x: 300, y: 120 }
      }
    ],
    turnNumber: 6,
    lossRow: 8,
    spawnRow() {
      return [];
    }
  });

  assert.equal(result.feedbackEvents.some((event) => event.type === 'fever.activated'), false);
  assert.equal(result.board.some((cell) => cell.id === 'left'), true);
  assert.equal(result.board.some((cell) => cell.id === 'center'), true);
  assert.equal(result.board.some((cell) => cell.id === 'right'), true);
});

test('resolveTurn does not delete extra cells for pulse fever at finalize time', () => {
  const result = resolveTurn({
    board: [
      { id: 'anchor', col: 3, row: 4, hp: 5 },
      { id: 'adjacent-a', col: 4, row: 4, hp: 2 },
      { id: 'adjacent-b', col: 3, row: 5, hp: 2 },
      { id: 'far', col: 0, row: 0, hp: 4 }
    ],
    activeFeverMode: 'pulse',
    turnNumber: 6,
    lossRow: 8,
    spawnRow() {
      return [];
    }
  });

  assert.equal(result.feedbackEvents.some((event) => event.type === 'fever.activated'), false);
  assert.equal(result.board.some((cell) => cell.id === 'anchor'), true);
  assert.equal(result.board.some((cell) => cell.id === 'adjacent-a'), true);
  assert.equal(result.board.some((cell) => cell.id === 'adjacent-b'), true);
});

test('resolveTurn keeps deterministic output for identical inputs', () => {
  const input = {
    board: [{ id: 'block-a', col: 4, row: 1, hp: 3 }],
    turnNumber: 2,
    lossRow: 6,
    spawnRow(nextTurnNumber) {
      return [{ id: `spawn-${nextTurnNumber}`, col: 0, row: 0, hp: 1 }];
    }
  };

  const first = resolveTurn(input);
  const second = resolveTurn(input);

  assert.deepEqual(first, second);
});

test('resolveTurn clamps invalid loss rows to a safe danger range', () => {
  const result = resolveTurn({
    board: [{ id: 'block-a', col: 4, row: 1, hp: 3 }],
    turnNumber: 2,
    lossRow: -3,
    spawnRow() {
      return [];
    }
  });

  assert.equal(result.hasReachedLossLine, true);
  assert.equal(result.dangerLevel, 1);
});
