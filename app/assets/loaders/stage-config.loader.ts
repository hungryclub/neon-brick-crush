import type { Result } from 'neverthrow';

import worldContentManifest from '../manifests/world-content.manifest.ts';
import type {
  IRawStageContentDefinition,
  IStageRuntimeConfig,
  IStageSelection
} from '../../domain/models/stage-model';
import type { IWorldContentDefinition } from '../../domain/models/world-model';
import {
  STAGE_CONFIG_INVALID,
  STAGE_CONFIG_NOT_FOUND,
  type IGameError
} from '../../domain/errors/game-error.ts';
import { err, ok } from '../../shared/result/result.ts';

export const DEFAULT_STAGE_SELECTION: IStageSelection = {
  worldId: 'world-01',
  stageId: 'world-01-stage-01'
};

export function loadWorldContent(
  worldId: string
): Result<IWorldContentDefinition, IGameError> {
  const world = worldContentManifest.worlds.find((entry) => entry.id === worldId);

  if (!world) {
    return err({
      code: STAGE_CONFIG_NOT_FOUND,
      message: `World content was not found for ${worldId}.`
    });
  }

  return ok({
    ...world,
    assetBundleIds: [...world.assetBundleIds],
    stageIds: [...world.stageIds]
  });
}

export function loadWorldStageRuntimeConfigs(
  worldId: string
): Result<IStageRuntimeConfig[], IGameError> {
  const worldResult = loadWorldContent(worldId);

  if (worldResult.isErr()) {
    return err(worldResult.error);
  }

  const stageResults = worldResult.value.stageIds.map((stageId) =>
    loadStageRuntimeConfig({ worldId, stageId })
  );
  const firstError = stageResults.find((result) => result.isErr());

  if (firstError?.isErr()) {
    return err(firstError.error);
  }

  return ok(stageResults.map((result) => result._unsafeUnwrap()));
}

export function loadInitialStageRuntimeConfig(): Result<IStageRuntimeConfig, IGameError> {
  return loadStageRuntimeConfig(DEFAULT_STAGE_SELECTION);
}

export function loadStageRuntimeConfig({
  worldId,
  stageId
}: IStageSelection): Result<IStageRuntimeConfig, IGameError> {
  const worldResult = loadWorldContent(worldId);

  if (worldResult.isErr()) {
    return err(worldResult.error);
  }

  const stage = worldContentManifest.stages.find((entry) => entry.id === stageId);

  if (!stage || stage.worldId !== worldId || !worldResult.value.stageIds.includes(stage.id)) {
    return err({
      code: STAGE_CONFIG_NOT_FOUND,
      message: `Stage content was not found for ${worldId}/${stageId}.`
    });
  }

  const validationError = validateStageDefinition(stage);

  if (validationError) {
    return err(validationError);
  }

  const boardColumns = stage.initialBoardPatterns[0].length;

  return ok({
    worldId,
    stageId: stage.id,
    stageTitle: stage.title,
    stageKind: stage.kind,
    boardColumns,
    assetBundleIds: [...new Set([...worldResult.value.assetBundleIds, ...stage.assetBundleIds])],
    initialBoardPatterns: clonePatterns(stage.initialBoardPatterns),
    spawnPatterns: clonePatterns(stage.spawnPatterns)
  });
}

function clonePatterns(patterns: number[][]) {
  return patterns.map((row) => [...row]);
}

function validateStageDefinition(
  stage: IRawStageContentDefinition
): IGameError | null {
  if (stage.initialBoardPatterns.length === 0 || stage.spawnPatterns.length === 0) {
    return {
      code: STAGE_CONFIG_INVALID,
      message: `Stage ${stage.id} must define initial and spawn patterns.`
    };
  }

  const boardColumns = stage.initialBoardPatterns[0].length;

  if (boardColumns === 0) {
    return {
      code: STAGE_CONFIG_INVALID,
      message: `Stage ${stage.id} must define at least one board column.`
    };
  }

  const hasInvalidInitialRows = stage.initialBoardPatterns.some((row) => {
    return row.length !== boardColumns || row.some((cell) => cell !== 0 && cell !== 1);
  });
  const hasInvalidSpawnRows = stage.spawnPatterns.some((row) => {
    return row.length !== boardColumns || row.some((cell) => cell !== 0 && cell !== 1);
  });

  if (hasInvalidInitialRows || hasInvalidSpawnRows) {
    return {
      code: STAGE_CONFIG_INVALID,
      message: `Stage ${stage.id} contains invalid board pattern data.`
    };
  }

  return null;
}
