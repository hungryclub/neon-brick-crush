import type { Result } from 'neverthrow';

import worldContentManifest from '../manifests/world-content.manifest.ts';
import type {
  IRawStageContentDefinition,
  IStagePresentationProfile,
  IStageRulesProfile,
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

export function loadAllWorldContent(): Result<IWorldContentDefinition[], IGameError> {
  return ok(
    worldContentManifest.worlds.map((world) => ({
      ...world,
      assetBundleIds: [...world.assetBundleIds],
      stageIds: [...world.stageIds]
    }))
  );
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
    presentationProfile: createStagePresentationProfile(stage),
    rulesProfile: createStageRulesProfile(stage),
    unlockProfile: {
      nextWorldIdToUnlock: stage.nextWorldIdToUnlock ?? null,
      stageIdsToUnlockOnClear: [...(stage.stageIdsToUnlockOnClear ?? [])]
    },
    initialBoardPatterns: clonePatterns(stage.initialBoardPatterns),
    spawnPatterns: clonePatterns(stage.spawnPatterns)
  });
}

function clonePatterns(patterns: number[][]) {
  return patterns.map((row) => [...row]);
}

function createStagePresentationProfile(
  stage: IRawStageContentDefinition
): IStagePresentationProfile {
  if (stage.kind === 'tutorial') {
    return {
      accentColor: '#78e3ff',
      completionHeadline: '배운 흐름을 다음 스테이지에서도 이어가세요.',
      objectiveText:
        stage.teachingFocusText ??
        '안전한 첫 성공을 통해 각도와 기본 규칙을 몸으로 익히세요.',
      shellLabel: 'Tutorial Stage',
      teachByPlayCueList: [
        '런처를 드래그해서 첫 반사를 직접 만들어 보세요.',
        '좋아요. 이제 다음 줄이 내려오기 전에 같은 감각으로 한 번 더 맞혀보세요.'
      ]
    };
  }

  if (stage.kind === 'challenge') {
    return {
      accentColor: '#ffd36f',
      completionHeadline: '숙련 플레이를 위한 별과 효율 목표가 열려 있습니다.',
      objectiveText:
        stage.teachingFocusText ??
        '짧은 턴 안에 높은 효율과 정교한 루트를 만들어 별을 지켜내세요.',
      shellLabel: 'Challenge Stage',
      teachByPlayCueList: ['짧은 턴과 적은 실수로 3성 클리어를 노려 보세요.']
    };
  }

  if (stage.kind === 'climax') {
    return {
      accentColor: '#ff8aa0',
      completionHeadline: '월드의 마무리를 통과했습니다.',
      objectiveText: '지금까지 배운 리듬과 조합을 한 번에 시험하는 월드 마지막 스테이지입니다.',
      shellLabel: 'World Climax',
      teachByPlayCueList: ['압박선과 게이트를 함께 읽으며 월드의 최종 테스트를 마무리하세요.']
    };
  }

  return {
    accentColor: '#b8c7ff',
    completionHeadline: '다음 스테이지를 향한 별을 확보했습니다.',
    objectiveText: '핵심 루프를 안정적으로 다듬으며 다음 도전에 대비하세요.',
    shellLabel: 'Standard Stage',
    teachByPlayCueList: ['현재 월드의 기본 퍼즐 리듬을 안정적으로 익히세요.']
  };
}

function createStageRulesProfile(stage: IRawStageContentDefinition): IStageRulesProfile {
  if (stage.kind === 'tutorial') {
    return {
      gateLayout: 'training',
      lossRowBufferRows: 3
    };
  }

  if (stage.kind === 'challenge') {
    return {
      gateLayout: 'pressure',
      lossRowBufferRows: 1
    };
  }

  if (stage.kind === 'climax') {
    return {
      gateLayout: 'pressure',
      lossRowBufferRows: 1
    };
  }

  return {
    gateLayout: 'standard',
    lossRowBufferRows: 2
  };
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
