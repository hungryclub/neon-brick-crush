export interface IStageBoardCell {
  id: string;
  col: number;
  row: number;
  hp: number;
}

const INITIAL_PATTERNS = [
  [1, 1, 0, 1, 0, 1, 1],
  [0, 1, 1, 0, 1, 1, 0]
] as const;

const TURN_PATTERNS = [
  [1, 0, 1, 0, 1, 0, 1],
  [0, 1, 0, 1, 0, 1, 0],
  [1, 1, 0, 1, 1, 0, 1],
  [0, 1, 1, 0, 1, 1, 0]
] as const;

export function createInitialStageBoard() {
  return INITIAL_PATTERNS.flatMap((pattern, row) =>
    createCellsFromPattern({
      pattern,
      row,
      turnNumber: 0
    })
  );
}

export function createSpawnRow(turnNumber: number) {
  const pattern = TURN_PATTERNS[(turnNumber - 1) % TURN_PATTERNS.length];

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
