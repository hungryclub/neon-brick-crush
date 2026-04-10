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

  logger.info('runtime.stage_config_loaded', {
    worldId: stageRuntimeConfig.worldId,
    stageId: stageRuntimeConfig.stageId,
    stageKind: stageRuntimeConfig.stageKind,
    assetBundleIds: stageRuntimeConfig.assetBundleIds
  });

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent,
    backgroundColor: '#050711',
    scene: [BootScene, StageScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
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
