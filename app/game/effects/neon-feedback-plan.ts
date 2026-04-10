import type { TTurnFeedbackCommand } from './turn-feedback-emitter.js';

export type TNeonVisualCommand =
  | { type: 'gate-halo'; gateId: string; duration: number }
  | { type: 'screen-flash'; duration: number; color: [number, number, number] }
  | { type: 'camera-shake'; duration: number; intensity: number }
  | {
      type: 'impact-ring';
      color: number;
      duration: number;
      startRadius: number;
      endRadius: number;
      lineWidth: number;
      alpha: number;
    };

export interface IImpactFeedbackMoment {
  x: number;
  y: number;
  destroyed: boolean;
}

export function createNeonVisualPlan(commands: TTurnFeedbackCommand[]): TNeonVisualCommand[] {
  const visualPlan: TNeonVisualCommand[] = [];

  commands.forEach((command) => {
    if (command.type === 'gate-pulse') {
      visualPlan.push({ type: 'gate-halo', gateId: command.gateId, duration: 160 });
      return;
    }

    if (command.type === 'camera-flash') {
      visualPlan.push({
        type: 'screen-flash',
        duration: command.duration,
        color: command.color
      });
      return;
    }

    if (command.type === 'camera-shake') {
      visualPlan.push({
        type: 'camera-shake',
        duration: command.duration,
        intensity: command.intensity
      });
    }
  });

  return visualPlan;
}

export function createImpactVisualCommand(moment: IImpactFeedbackMoment): TNeonVisualCommand {
  if (moment.destroyed) {
    return {
      type: 'impact-ring',
      color: 0xff9c6b,
      duration: 180,
      startRadius: 18,
      endRadius: 54,
      lineWidth: 4,
      alpha: 0.92
    };
  }

  return {
    type: 'impact-ring',
    color: 0x7be8ff,
    duration: 120,
    startRadius: 14,
    endRadius: 34,
    lineWidth: 3,
    alpha: 0.72
  };
}
