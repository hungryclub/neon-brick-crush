import type { IShotPathSegment, IStageGate, TShotPath } from '../entities/stage-gates';
import type { IStageBoardCell } from '../entities/stage-board';
import type { TFeverMode } from '../systems/fever-overdrive';

export type TTurnModifierPhase = 'base' | 'gate' | 'fever' | 'finalize';

export interface ITurnFeedbackEvent {
  type: 'gate.triggered';
  gateId: string;
  gateKind: IStageGate['kind'];
  affectedCellId: string | null;
}

export interface IFeverFeedbackEvent {
  type: 'fever.activated';
  affectedCellIds: string[];
  bonusHits: number;
  mode: TFeverMode;
}

export type TTurnComboBranch = 'base' | 'gate-only' | 'fever-only' | 'gate-fever-combo';

export interface ITurnModifierTraceEntry {
  phase: TTurnModifierPhase;
  applied: boolean;
}

export interface ITurnModifierContext {
  activeFeverMode?: TFeverMode | null;
  gates?: IStageGate[];
  shotPath?: TShotPath | null;
}

export interface IBaseTurnState {
  board: IStageBoardCell[];
  turnNumber: number;
}

export interface IResolvedTurnState extends IBaseTurnState {
  comboBranch: TTurnComboBranch;
  feedbackEvents: Array<ITurnFeedbackEvent | IFeverFeedbackEvent>;
  modifierTrace: ITurnModifierTraceEntry[];
}

export function createInitialResolvedTurnState(baseState: IBaseTurnState): IResolvedTurnState {
  return {
    comboBranch: 'base',
    ...baseState,
    feedbackEvents: [],
    modifierTrace: []
  };
}

export function appendModifierTrace(
  state: IResolvedTurnState,
  traceEntry: ITurnModifierTraceEntry
) {
  return {
    ...state,
    modifierTrace: [...state.modifierTrace, traceEntry]
  };
}

export function applyGateModifiers(
  state: IResolvedTurnState,
  context: ITurnModifierContext
): IResolvedTurnState {
  const gate = resolveTriggeredGate(context);

  if (!gate) {
    return appendModifierTrace(state, {
      phase: 'gate',
      applied: false
    });
  }

  const affectedCell = resolveGateTargetCell(state.board);

  if (!affectedCell) {
    return appendModifierTrace(state, {
      phase: 'gate',
      applied: false
    });
  }

  return {
    board: state.board.filter((cell) => cell.id !== affectedCell.id),
    comboBranch: state.comboBranch === 'fever-only' ? 'gate-fever-combo' : 'gate-only',
    turnNumber: state.turnNumber,
    feedbackEvents: [
      ...state.feedbackEvents,
      {
        type: 'gate.triggered',
        gateId: gate.id,
        gateKind: gate.kind,
        affectedCellId: affectedCell.id
      }
    ],
    modifierTrace: [
      ...state.modifierTrace,
      {
        phase: 'gate',
        applied: true
      }
    ]
  };
}

export function applyFeverModifiers(
  state: IResolvedTurnState,
  context: ITurnModifierContext
): IResolvedTurnState {
  if (!context.activeFeverMode) {
    return appendModifierTrace(state, {
      phase: 'fever',
      applied: false
    });
  }

  const targetCount = resolveFeverTargetCount({
    activeFeverMode: context.activeFeverMode,
    comboBranch: state.comboBranch
  });
  const affectedCells = resolveFeverTargetCells({
    activeFeverMode: context.activeFeverMode,
    board: state.board,
    shotPath: context.shotPath,
    targetCount
  });

  if (affectedCells.length === 0) {
    return appendModifierTrace(state, {
      phase: 'fever',
      applied: false
    });
  }

  return {
    board: state.board.filter((cell) => !affectedCells.some((targetCell) => targetCell.id === cell.id)),
    comboBranch: state.comboBranch === 'gate-only' ? 'gate-fever-combo' : 'fever-only',
    turnNumber: state.turnNumber,
    feedbackEvents: [
      ...state.feedbackEvents,
      {
        type: 'fever.activated',
        affectedCellIds: affectedCells.map((cell) => cell.id),
        bonusHits: affectedCells.length,
        mode: context.activeFeverMode
      }
    ],
    modifierTrace: [
      ...state.modifierTrace,
      {
        phase: 'fever',
        applied: true
      }
    ]
  };
}

function resolveTriggeredGate(context: ITurnModifierContext) {
  if (!context.shotPath || !context.gates?.length) {
    return null;
  }

  return (
    context.gates.find((gate) =>
      (context.shotPath as TShotPath).some((segment) =>
        doesLineIntersectRect({
          rect: gate.bounds,
          segment
        })
      )
    ) ?? null
  );
}

function resolveGateTargetCell(board: IStageBoardCell[]) {
  const topRowCells = board.filter((cell) => cell.row === 0);

  if (topRowCells.length === 0) {
    return null;
  }

  return [...topRowCells].sort((left, right) => {
    if (right.hp !== left.hp) {
      return right.hp - left.hp;
    }

    return left.col - right.col;
  })[0];
}

function resolveFeverTargetCells({
  activeFeverMode,
  board,
  shotPath,
  targetCount
}: {
  activeFeverMode: TFeverMode;
  board: IStageBoardCell[];
  shotPath?: TShotPath | null;
  targetCount: number;
}) {
  if (board.length === 0 || targetCount <= 0) {
    return [];
  }

  if (activeFeverMode === 'breaker') {
    return sortByBreakerPriority(board).slice(0, targetCount);
  }

  if (activeFeverMode === 'pierce') {
    const focusX = resolveShotFocusX(shotPath);

    return [...board]
      .sort((left, right) => {
        const leftDistance = Math.abs(left.col - focusX);
        const rightDistance = Math.abs(right.col - focusX);

        if (leftDistance !== rightDistance) {
          return leftDistance - rightDistance;
        }

        if (right.hp !== left.hp) {
          return right.hp - left.hp;
        }

        if (right.row !== left.row) {
          return right.row - left.row;
        }

        return left.col - right.col;
      })
      .slice(0, targetCount);
  }

  const anchor = sortByBreakerPriority(board)[0];

  if (!anchor) {
    return [];
  }

  return [anchor, ...board
    .filter((cell) => cell.id !== anchor.id)
    .sort((left, right) => {
      const leftDistance = resolveManhattanDistance(left, anchor);
      const rightDistance = resolveManhattanDistance(right, anchor);

      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }

      if (right.hp !== left.hp) {
        return right.hp - left.hp;
      }

      if (right.row !== left.row) {
        return right.row - left.row;
      }

      return left.col - right.col;
    })].slice(0, targetCount);
}

function resolveFeverTargetCount({
  activeFeverMode,
  comboBranch
}: {
  activeFeverMode: TFeverMode;
  comboBranch: TTurnComboBranch;
}) {
  if (activeFeverMode === 'pulse') {
    return comboBranch === 'gate-only' ? 4 : 3;
  }

  return comboBranch === 'gate-only' ? 3 : 2;
}

function sortByBreakerPriority(board: IStageBoardCell[]) {
  return [...board]
    .sort((left, right) => {
      if (right.hp !== left.hp) {
        return right.hp - left.hp;
      }

      if (right.row !== left.row) {
        return right.row - left.row;
      }

      return left.col - right.col;
    });
}

function resolveShotFocusX(shotPath?: TShotPath | null) {
  if (!shotPath?.length) {
    return 0;
  }

  const lastSegment = shotPath[shotPath.length - 1];

  return Math.round((lastSegment.end.x - 60) / 40);
}

function resolveManhattanDistance(cell: IStageBoardCell, anchor: IStageBoardCell) {
  return Math.abs(cell.row - anchor.row) + Math.abs(cell.col - anchor.col);
}

function doesLineIntersectRect({
  rect,
  segment
}: {
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  segment: IShotPathSegment;
}) {
  const minX = rect.x;
  const maxX = rect.x + rect.width;
  const minY = rect.y;
  const maxY = rect.y + rect.height;

  if (
    isPointInsideRect(segment.start.x, segment.start.y, minX, maxX, minY, maxY) ||
    isPointInsideRect(segment.end.x, segment.end.y, minX, maxX, minY, maxY)
  ) {
    return true;
  }

  const edges = [
    [
      { x: minX, y: minY },
      { x: maxX, y: minY }
    ],
    [
      { x: maxX, y: minY },
      { x: maxX, y: maxY }
    ],
    [
      { x: maxX, y: maxY },
      { x: minX, y: maxY }
    ],
    [
      { x: minX, y: maxY },
      { x: minX, y: minY }
    ]
  ] as const;

  return edges.some(([edgeStart, edgeEnd]) =>
    doSegmentsIntersect(segment.start, segment.end, edgeStart, edgeEnd)
  );
}

function isPointInsideRect(
  x: number,
  y: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
) {
  return x >= minX && x <= maxX && y >= minY && y <= maxY;
}

function doSegmentsIntersect(
  pointA: { x: number; y: number },
  pointB: { x: number; y: number },
  pointC: { x: number; y: number },
  pointD: { x: number; y: number }
) {
  const orientation1 = resolveOrientation(pointA, pointB, pointC);
  const orientation2 = resolveOrientation(pointA, pointB, pointD);
  const orientation3 = resolveOrientation(pointC, pointD, pointA);
  const orientation4 = resolveOrientation(pointC, pointD, pointB);

  if (orientation1 !== orientation2 && orientation3 !== orientation4) {
    return true;
  }

  if (orientation1 === 0 && isPointOnSegment(pointA, pointC, pointB)) {
    return true;
  }

  if (orientation2 === 0 && isPointOnSegment(pointA, pointD, pointB)) {
    return true;
  }

  if (orientation3 === 0 && isPointOnSegment(pointC, pointA, pointD)) {
    return true;
  }

  return orientation4 === 0 && isPointOnSegment(pointC, pointB, pointD);
}

function resolveOrientation(
  pointA: { x: number; y: number },
  pointB: { x: number; y: number },
  pointC: { x: number; y: number }
) {
  const value =
    (pointB.y - pointA.y) * (pointC.x - pointB.x) -
    (pointB.x - pointA.x) * (pointC.y - pointB.y);

  if (Math.abs(value) < 0.0001) {
    return 0;
  }

  return value > 0 ? 1 : 2;
}

function isPointOnSegment(
  pointA: { x: number; y: number },
  pointB: { x: number; y: number },
  pointC: { x: number; y: number }
) {
  return (
    pointB.x <= Math.max(pointA.x, pointC.x) &&
    pointB.x >= Math.min(pointA.x, pointC.x) &&
    pointB.y <= Math.max(pointA.y, pointC.y) &&
    pointB.y >= Math.min(pointA.y, pointC.y)
  );
}
