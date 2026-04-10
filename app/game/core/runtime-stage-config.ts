import {
  loadInitialStageRuntimeConfig,
  loadStageRuntimeConfig
} from '../../assets/loaders/stage-config.loader.ts';
import createLogger from '../../shared/logging/create-logger.ts';
import type { IStageSelection } from '../../domain/models/stage-model';

export function resolveRuntimeStageConfig(
  stageSelection: IStageSelection | null | undefined,
  logger = createLogger()
) {
  const stageRuntimeConfigResult = stageSelection
    ? loadStageRuntimeConfig(stageSelection)
    : loadInitialStageRuntimeConfig();

  if (stageRuntimeConfigResult.isOk()) {
    return stageRuntimeConfigResult.value;
  }

  if (stageSelection) {
    logger.warn('runtime.stage_config_fallback_to_default', {
      code: stageRuntimeConfigResult.error.code,
      message: stageRuntimeConfigResult.error.message,
      worldId: stageSelection.worldId,
      stageId: stageSelection.stageId
    });

    const defaultStageRuntimeConfigResult = loadInitialStageRuntimeConfig();

    if (defaultStageRuntimeConfigResult.isOk()) {
      return defaultStageRuntimeConfigResult.value;
    }

    logger.error('runtime.default_stage_config_load_failed', {
      code: defaultStageRuntimeConfigResult.error.code,
      message: defaultStageRuntimeConfigResult.error.message
    });

    throw new Error(defaultStageRuntimeConfigResult.error.message);
  }

  logger.error('runtime.stage_config_load_failed', {
    code: stageRuntimeConfigResult.error.code,
    message: stageRuntimeConfigResult.error.message
  });

  throw new Error(stageRuntimeConfigResult.error.message);
}
