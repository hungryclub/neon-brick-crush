import type { ILiveEventDefinition } from '../../domain/models/event-model';

const EVENT_CONTENT_MANIFEST: ILiveEventDefinition[] = [
  {
    id: 'event-neon-kickoff',
    title: 'Neon Kickoff Bonus',
    description: '월드 1을 돌파하기 전, 운영 보상 구조를 가볍게 체험할 수 있는 복귀 보너스입니다.',
    startsAt: '2026-04-01T00:00:00.000Z',
    endsAt: '2026-12-31T23:59:59.999Z',
    reward: {
      id: 'reward-neon-kickoff-xp',
      title: 'Kickoff XP Cache',
      description: '한 번만 받을 수 있는 250 XP 보상입니다.',
      xpAmount: 250
    },
    eligibility: {
      minimumPlayerLevel: 1,
      requiredCompletedStageIds: ['world-01-stage-01']
    }
  }
];

export function loadEventContentManifest() {
  return EVENT_CONTENT_MANIFEST.map((entry) => structuredClone(entry));
}
