import Phaser from 'phaser';

import type { IGameRuntimeBridge } from '../hud-bridges/game-runtime-bridge';

export const BOOT_SCENE_KEY = 'boot-scene';

export default class BootScene extends Phaser.Scene {
  private hasSignaledRuntimeReady = false;

  constructor() {
    super(BOOT_SCENE_KEY);
  }

  create() {
    this.notifyRuntimeReady();
    this.scene.start('stage-scene');
  }

  notifyRuntimeReady() {
    if (this.hasSignaledRuntimeReady) {
      return;
    }

    const runtimeBridge = this.registry.get(
      'game-runtime-bridge'
    ) as IGameRuntimeBridge | undefined;

    if (!runtimeBridge) {
      return;
    }

    this.hasSignaledRuntimeReady = true;
    runtimeBridge.signalRuntimeReady();
  }
}
