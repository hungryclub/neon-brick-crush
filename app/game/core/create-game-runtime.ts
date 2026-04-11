import Phaser from 'phaser';

import createLogger from '../../shared/logging/create-logger.ts';
import type { IStageSelection } from '../../domain/models/stage-model';
import type { IGameRuntimeBridge } from '../hud-bridges/game-runtime-bridge';
import {
  GAME_RUNTIME_BRIDGE_REGISTRY_KEY,
  STAGE_RUNTIME_CONFIG_REGISTRY_KEY
} from './runtime-registry-keys.ts';
import { resolveRuntimeStageConfig } from './runtime-stage-config.ts';
import BootScene, { BOOT_SCENE_KEY } from '../scenes/BootScene.ts';
import StageScene from '../scenes/StageScene.ts';

interface ICreateGameRuntimeProps {
  parent: HTMLDivElement;
  bridge: IGameRuntimeBridge;
  stageSelection?: IStageSelection | null;
}

export default function createGameRuntime({
  parent,
  bridge,
  stageSelection = null
}: ICreateGameRuntimeProps) {
  const logger = createLogger();
  const stageRuntimeConfig = resolveRuntimeStageConfig(stageSelection, logger);
  const parentBounds = parent.getBoundingClientRect();
  const runtimeWidth = Math.max(Math.round(parentBounds.width), 320);
  const runtimeHeight = Math.max(Math.round(parentBounds.height), 320);

  logger.info('runtime.stage_config_loaded', {
    worldId: stageRuntimeConfig.worldId,
    stageId: stageRuntimeConfig.stageId,
    stageKind: stageRuntimeConfig.stageKind,
    assetBundleIds: stageRuntimeConfig.assetBundleIds,
    runtimeWidth,
    runtimeHeight
  });

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: runtimeWidth,
    height: runtimeHeight,
    parent,
    backgroundColor: '#050711',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: {
          x: 0,
          y: 0
        },
        debug: false
      }
    },
    scene: [BootScene, StageScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER
    },
    callbacks: {
      preBoot(game) {
        game.registry.set(GAME_RUNTIME_BRIDGE_REGISTRY_KEY, bridge);
        game.registry.set(STAGE_RUNTIME_CONFIG_REGISTRY_KEY, stageRuntimeConfig);
      }
    }
  });

  const bootScene = game.scene.getScene(BOOT_SCENE_KEY) as BootScene | undefined;
  bootScene?.notifyRuntimeReady();

  return {
    destroy() {
      game.destroy(true);
    }
  };
}
