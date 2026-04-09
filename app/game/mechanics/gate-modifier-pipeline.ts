import type { IShotPath, IStageGate } from '../entities/stage-gates';
import type { IStageBoardCell } from '../entities/stage-board';

export type TTurnModifierPhase = 'base' | 'gate' | 'fever' | 'finalize';

export interface ITurnFeedbackEvent {
  type: 'gate.triggered';
  gateId: string;
  gateKind: IStageGate['kind'];
  affectedCellId: string | null;
}

export interface ITurnModifierTraceEntry {
  phase: TTurnModifierPhase;
  applied: boolean;
}

export interface ITurnModifierContext {
  gates?: IStageGate[];
  shotPath?: IShotPath | null;
}

export interface IBaseTurnState {
  board: IStageBoardCell[];
  turnNumber: number;
}

export interface IResolvedTurnState extends IBaseTurnState {
  feedbackEvents: ITurnFeedbackEvent[];
  modifierTrace: ITurnModifierTraceEntry[];
}

export function createInitialResolvedTurnState(baseState: IBaseTurnState): IResolvedTurnState {
  return {
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

export function applyFeverModifiers(state: IResolvedTurnState): IResolvedTurnState {
  return appendModifierTrace(state, {
    phase: 'fever',
    applied: false
  });
}

function resolveTriggeredGate(context: ITurnModifierContext) {
  if (!context.shotPath || !context.gates?.length) {
    return null;
  }

  return (
    context.gates.find((gate) =>
      doesLineIntersectRect({
        rect: gate.bounds,
        segment: context.shotPath as IShotPath
      })
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
  segment: IShotPath;
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
