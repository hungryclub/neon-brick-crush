import type {
  IFeverFeedbackEvent,
  ITurnFeedbackEvent
} from '../mechanics/gate-modifier-pipeline';

export type TTurnComboBranch = 'base' | 'gate-only' | 'fever-only' | 'gate-fever-combo';

export type TTurnFeedbackCommand =
  | { type: 'gate-pulse'; gateId: string }
  | { type: 'camera-flash'; duration: number; color: [number, number, number] }
  | { type: 'camera-shake'; duration: number; intensity: number }
  | { type: 'haptic-pulse'; intensity: 'medium' | 'strong' }
  | { type: 'sfx-cue'; cue: 'gate-hit' | 'fever-hit' | 'combo-burst' };

export interface ITurnFeedbackPlan {
  branch: TTurnComboBranch;
  commands: TTurnFeedbackCommand[];
}

export function createTurnFeedbackPlan({
  branch,
  feedbackEvents
}: {
  branch: TTurnComboBranch;
  feedbackEvents: Array<ITurnFeedbackEvent | IFeverFeedbackEvent>;
}): ITurnFeedbackPlan {
  const commands: TTurnFeedbackCommand[] = [];
  const gateEvents = feedbackEvents.filter(
    (event): event is ITurnFeedbackEvent => event.type === 'gate.triggered'
  );
  const hasFeverEvent = feedbackEvents.some((event) => event.type === 'fever.activated');

  gateEvents.forEach((event) => {
    commands.push({ type: 'gate-pulse', gateId: event.gateId });
  });

  if (branch === 'gate-fever-combo') {
    commands.push(
      { type: 'camera-flash', duration: 220, color: [255, 196, 120] },
      { type: 'camera-shake', duration: 180, intensity: 0.0048 },
      { type: 'haptic-pulse', intensity: 'strong' },
      { type: 'sfx-cue', cue: 'combo-burst' }
    );
  } else if (hasFeverEvent) {
    commands.push(
      { type: 'camera-flash', duration: 180, color: [255, 120, 220] },
      { type: 'haptic-pulse', intensity: 'medium' },
      { type: 'sfx-cue', cue: 'fever-hit' }
    );
  } else if (gateEvents.length > 0) {
    commands.push({ type: 'sfx-cue', cue: 'gate-hit' });
  }

  return {
    branch,
    commands
  };
}
