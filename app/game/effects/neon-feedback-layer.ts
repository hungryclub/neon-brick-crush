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

interface IPulsePoolSlot {
  activeTween: Phaser.Tweens.Tween | null;
  graphics: Phaser.GameObjects.Graphics;
  revision: number;
}

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

  const pulsePool = Array.from({ length: PULSE_POOL_SIZE }, (): IPulsePoolSlot => ({
    activeTween: null,
    graphics: scene.add.graphics().setDepth(EFFECT_DEPTH).setVisible(false),
    revision: 0
  }));
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
            slot: takePulseSlot(),
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
        slot: takePulseSlot(),
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
      scene.tweens.killTweensOf(flashOverlay);
      flashOverlay.destroy();
      pulsePool.forEach((slot) => {
        slot.activeTween?.remove();
        slot.activeTween = null;
        slot.graphics.destroy();
      });
    }
  };

  function takePulseSlot() {
    const slot = pulsePool[pulsePoolIndex];
    pulsePoolIndex = (pulsePoolIndex + 1) % pulsePool.length;
    slot.activeTween?.remove();
    slot.activeTween = null;
    slot.revision += 1;
    slot.graphics.clear();
    slot.graphics.setAlpha(1);
    slot.graphics.setVisible(true);
    return slot;
  }
}

function playRingPulse({
  scene,
  slot,
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
  slot: IPulsePoolSlot;
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
  const leaseRevision = slot.revision;
  const graphics = slot.graphics;
  const state = {
    radius: startRadius,
    alpha
  };

  render();
  slot.activeTween = scene.tweens.add({
    targets: state,
    radius: endRadius,
    alpha: 0,
    duration,
    ease: 'Cubic.easeOut',
    onUpdate: render,
    onComplete: () => {
      if (slot.revision !== leaseRevision) {
        return;
      }

      slot.activeTween = null;
      graphics.clear();
      graphics.setVisible(false);
      onComplete?.();
    }
  });

  function render() {
    if (slot.revision !== leaseRevision) {
      return;
    }

    graphics.clear();
    graphics.lineStyle(lineWidth, color, state.alpha);
    graphics.strokeCircle(x, y, state.radius);
  }
}
