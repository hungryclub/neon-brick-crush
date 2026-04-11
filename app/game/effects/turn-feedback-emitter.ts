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
  const feverEvents = feedbackEvents.filter(
    (event): event is IFeverFeedbackEvent => event.type === 'fever.activated'
  );
  const feverBonusHits = feverEvents.reduce((total, event) => total + event.bonusHits, 0);

  gateEvents.forEach((event) => {
    commands.push({ type: 'gate-pulse', gateId: event.gateId });
  });

  if (branch === 'gate-fever-combo') {
    commands.push(
      { type: 'camera-flash', duration: 220, color: [255, 196, 120] },
      { type: 'camera-shake', duration: 180, intensity: 0.0048 },
      { type: 'haptic-pulse', intensity: 'strong' },
      ...(feverBonusHits >= 3
        ? ([{ type: 'camera-flash', duration: 140, color: [255, 120, 220] }] satisfies TTurnFeedbackCommand[])
        : []),
      { type: 'sfx-cue', cue: 'combo-burst' }
    );
  } else if (feverEvents.length > 0) {
    commands.push(
      { type: 'camera-flash', duration: 200, color: [255, 120, 220] },
      { type: 'camera-shake', duration: 130, intensity: 0.0036 },
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
