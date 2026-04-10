import Phaser from 'phaser';

import type { TTurnFeedbackCommand } from './turn-feedback-emitter.js';
import {
  createImpactVisualCommand,
  createNeonVisualPlan,
  type IImpactFeedbackMoment,
  type TNeonVisualCommand
} from './neon-feedback-plan.js';

const FLASH_DEPTH = 140;
const EFFECT_DEPTH = 150;
const PULSE_POOL_SIZE = 8;

export interface INeonGateTarget {
  x: number;
  y: number;
  color: number;
  onPulseStart?: () => void;
  onPulseEnd?: () => void;
}

export interface INeonFeedbackLayer {
  playTurnCommands(commands: TTurnFeedbackCommand[], options: { resolveGateTarget: (gateId: string) => INeonGateTarget | null }): void;
  playImpact(moment: IImpactFeedbackMoment): void;
  destroy(): void;
}

export function createNeonFeedbackLayer(scene: Phaser.Scene): INeonFeedbackLayer {
  const flashOverlay = scene.add
    .rectangle(scene.scale.width / 2, scene.scale.height / 2, scene.scale.width, scene.scale.height, 0xffffff, 0)
    .setScrollFactor(0)
    .setDepth(FLASH_DEPTH)
    .setVisible(false);

  const pulsePool = Array.from({ length: PULSE_POOL_SIZE }, () =>
    scene.add.graphics().setDepth(EFFECT_DEPTH).setVisible(false)
  );
  let pulsePoolIndex = 0;

  return {
    playTurnCommands(commands, { resolveGateTarget }) {
      const visualPlan = createNeonVisualPlan(commands);

      visualPlan.forEach((command) => {
        if (command.type === 'gate-halo') {
          const gateTarget = resolveGateTarget(command.gateId);

          if (!gateTarget) {
            return;
          }

          gateTarget.onPulseStart?.();
          playRingPulse({
            scene,
            graphics: takePulseGraphics(),
            x: gateTarget.x,
            y: gateTarget.y,
            color: gateTarget.color,
            alpha: 0.88,
            lineWidth: 4,
            startRadius: 24,
            endRadius: 76,
            duration: command.duration,
            onComplete: () => {
              gateTarget.onPulseEnd?.();
            }
          });
          return;
        }

        if (command.type === 'screen-flash') {
          flashOverlay.setFillStyle(
            Phaser.Display.Color.GetColor(command.color[0], command.color[1], command.color[2]),
            0.26
          );
          flashOverlay.setAlpha(0.26);
          flashOverlay.setVisible(true);
          scene.tweens.killTweensOf(flashOverlay);
          scene.tweens.add({
            targets: flashOverlay,
            alpha: 0,
            duration: command.duration,
            ease: 'Quad.easeOut',
            onComplete: () => {
              flashOverlay.setVisible(false);
            }
          });
          return;
        }

        if (command.type === 'camera-shake') {
          scene.cameras.main.shake(command.duration, command.intensity, false);
        }
      });
    },
    playImpact(moment) {
      const command = createImpactVisualCommand(moment);

      if (command.type !== 'impact-ring') {
        return;
      }

      playRingPulse({
        scene,
        graphics: takePulseGraphics(),
        x: moment.x,
        y: moment.y,
        color: command.color,
        alpha: command.alpha,
        lineWidth: command.lineWidth,
        startRadius: command.startRadius,
        endRadius: command.endRadius,
        duration: command.duration
      });
    },
    destroy() {
      flashOverlay.destroy();
      pulsePool.forEach((graphics) => {
        graphics.destroy();
      });
    }
  };

  function takePulseGraphics() {
    const graphics = pulsePool[pulsePoolIndex];
    pulsePoolIndex = (pulsePoolIndex + 1) % pulsePool.length;
    scene.tweens.killTweensOf(graphics);
    graphics.clear();
    graphics.setAlpha(1);
    graphics.setVisible(true);
    return graphics;
  }
}

function playRingPulse({
  scene,
  graphics,
  x,
  y,
  color,
  alpha,
  lineWidth,
  startRadius,
  endRadius,
  duration,
  onComplete
}: {
  scene: Phaser.Scene;
  graphics: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  color: number;
  alpha: number;
  lineWidth: number;
  startRadius: number;
  endRadius: number;
  duration: number;
  onComplete?: () => void;
}) {
  const state = {
    radius: startRadius,
    alpha
  };

  render();
  scene.tweens.add({
    targets: state,
    radius: endRadius,
    alpha: 0,
    duration,
    ease: 'Cubic.easeOut',
    onUpdate: render,
    onComplete: () => {
      graphics.clear();
      graphics.setVisible(false);
      onComplete?.();
    }
  });

  function render() {
    graphics.clear();
    graphics.lineStyle(lineWidth, color, state.alpha);
    graphics.strokeCircle(x, y, state.radius);
  }
}
