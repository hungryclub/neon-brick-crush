import type { Result } from 'neverthrow';

import { EVENT_CONFIG_NOT_FOUND, STAGE_CONFIG_INVALID, type IGameError } from '../../domain/errors/game-error.ts';
import type { ILiveEventDefinition } from '../../domain/models/event-model';
import { loadEventContentManifest } from '../manifests/event-content.manifest.ts';
import { err, ok } from '../../shared/result/result.ts';

export function loadActiveEventConfigs(now = new Date()): Result<ILiveEventDefinition[], IGameError> {
  const manifest = loadEventContentManifest();

  for (const definition of manifest) {
    const startsAt = Date.parse(definition.startsAt);
    const endsAt = Date.parse(definition.endsAt);

    if (Number.isNaN(startsAt) || Number.isNaN(endsAt) || startsAt >= endsAt) {
      return err({
        code: STAGE_CONFIG_INVALID,
        message: `Event config ${definition.id} has an invalid active window.`
      });
    }
  }

  return ok(
    manifest.filter((definition) => {
      const startsAt = Date.parse(definition.startsAt);
      const endsAt = Date.parse(definition.endsAt);

      return now.getTime() >= startsAt && now.getTime() <= endsAt;
    })
  );
}

export function loadEventConfigById(
  eventId: string
): Result<ILiveEventDefinition, IGameError> {
  const manifest = loadEventContentManifest();
  const definition = manifest.find((entry) => entry.id === eventId);

  if (!definition) {
    return err({
      code: EVENT_CONFIG_NOT_FOUND,
      message: `Event config ${eventId} could not be found.`
    });
  }

  return ok(definition);
}
