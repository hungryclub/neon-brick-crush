import Phaser from 'phaser';

import type { IGameRuntimeBridge } from '../hud-bridges/game-runtime-bridge';
import { GAME_RUNTIME_BRIDGE_REGISTRY_KEY } from '../core/runtime-registry-keys';

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
      GAME_RUNTIME_BRIDGE_REGISTRY_KEY
    ) as IGameRuntimeBridge | undefined;

    if (!runtimeBridge) {
      return;
    }

    this.hasSignaledRuntimeReady = true;
    runtimeBridge.signalRuntimeReady();
  }
}
