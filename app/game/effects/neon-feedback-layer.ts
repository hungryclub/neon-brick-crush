import Phaser from 'phaser';

import type { TTurnFeedbackCommand } from './turn-feedback-emitter.js';
import {
  createEffectPool,
  type IEffectPool,
  type IEffectPoolLease
} from './effect-pool.js';
import {
  createImpactVisualCommand,
  createNeonVisualPlan,
  type IImpactFeedbackMoment,
} from './neon-feedback-plan.js';

const FLASH_DEPTH = 140;
const EFFECT_DEPTH = 150;
const PULSE_POOL_SIZE = 8;

interface IPulseGraphicsSlot {
  activeTween: Phaser.Tweens.Tween | null;
  graphics: Phaser.GameObjects.Graphics;
  onRelease: (() => void) | null;
}

export interface INeonGateTarget {
  x: number;
  y: number;
  color: number;
  onPulseStart?: () => void;
  onPulseEnd?: () => void;
}

export interface INeonFeedbackLayer {
  getPoolStats(): { active: number; size: number };
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

  const pulsePool = createEffectPool<IPulseGraphicsSlot>({
    create: () => ({
      activeTween: null,
      graphics: scene.add.graphics().setDepth(EFFECT_DEPTH).setVisible(false),
      onRelease: null
    }),
    size: PULSE_POOL_SIZE
  });

  return {
    getPoolStats() {
      const entries = pulsePool.entries();

      return {
        active: entries.filter((entry) => entry.active).length,
        size: entries.length
      };
    },
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
            lease: takePulseLease(),
            x: gateTarget.x,
            y: gateTarget.y,
            color: gateTarget.color,
            alpha: 0.88,
            lineWidth: 4,
            startRadius: 24,
            endRadius: 76,
            duration: command.duration,
            onRelease: () => {
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
        lease: takePulseLease(),
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
      pulsePool.entries().forEach((entry) => {
        entry.resource.activeTween?.remove();
        entry.resource.activeTween = null;
        entry.resource.onRelease?.();
        entry.resource.onRelease = null;
        entry.resource.graphics.destroy();
      });
    }
  };

  function takePulseLease() {
    const lease = pulsePool.acquire();
    lease.resource.onRelease?.();
    lease.resource.activeTween?.remove();
    lease.resource.activeTween = null;
    lease.resource.onRelease = null;
    lease.resource.graphics.clear();
    lease.resource.graphics.setAlpha(1);
    lease.resource.graphics.setVisible(true);
    return lease;
  }
}

function playRingPulse({
  scene,
  lease,
  x,
  y,
  color,
  alpha,
  lineWidth,
  startRadius,
  endRadius,
  duration,
  onRelease
}: {
  scene: Phaser.Scene;
  lease: IEffectPoolLease<IPulseGraphicsSlot>;
  x: number;
  y: number;
  color: number;
  alpha: number;
  lineWidth: number;
  startRadius: number;
  endRadius: number;
  duration: number;
  onRelease?: () => void;
}) {
  const { resource } = lease;
  const graphics = resource.graphics;
  const state = {
    radius: startRadius,
    alpha
  };
  resource.onRelease = onRelease ?? null;

  render();
  resource.activeTween = scene.tweens.add({
    targets: state,
    radius: endRadius,
    alpha: 0,
    duration,
    ease: 'Cubic.easeOut',
    onUpdate: render,
    onComplete: () => {
      if (!lease.release()) {
        return;
      }

      resource.activeTween = null;
      graphics.clear();
      graphics.setVisible(false);
      const releaseHandler = resource.onRelease;
      resource.onRelease = null;
      releaseHandler?.();
    }
  });

  function render() {
    if (!lease.isCurrent()) {
      return;
    }

    graphics.clear();
    graphics.lineStyle(lineWidth, color, state.alpha);
    graphics.strokeCircle(x, y, state.radius);
  }
}
