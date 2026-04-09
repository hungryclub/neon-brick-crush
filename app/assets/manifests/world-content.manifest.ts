import type { IRawStageContentDefinition } from '../../domain/models/stage-model';
import type { IWorldContentDefinition } from '../../domain/models/world-model';

const worlds: IWorldContentDefinition[] = [
  {
    id: 'world-01',
    title: 'Neon Alley',
    assetBundleIds: ['world-01-core'],
    stageIds: [
      'world-01-stage-01',
      'world-01-stage-02',
      'world-01-stage-03',
      'world-01-stage-04'
    ]
  },
  {
    id: 'world-02',
    title: 'Prism Circuit',
    assetBundleIds: ['world-02-core'],
    stageIds: ['world-02-stage-01', 'world-02-stage-02']
  }
];

const stages: IRawStageContentDefinition[] = [
  {
    id: 'world-01-stage-01',
    worldId: 'world-01',
    title: 'First Bounce',
    kind: 'tutorial',
    assetBundleIds: ['stage-01-board', 'stage-01-ui'],
    teachingFocusText: '각도와 첫 반사를 직접 익히는 안전한 도입 스테이지',
    initialBoardPatterns: [
      [1, 1, 0, 1, 0, 1, 1],
      [0, 1, 1, 0, 1, 1, 0]
    ],
    spawnPatterns: [
      [1, 0, 1, 0, 1, 0, 1],
      [0, 1, 0, 1, 0, 1, 0],
      [1, 1, 0, 1, 1, 0, 1],
      [0, 1, 1, 0, 1, 1, 0]
    ]
  },
  {
    id: 'world-01-stage-02',
    worldId: 'world-01',
    title: 'Arc Pulse',
    kind: 'normal',
    assetBundleIds: ['stage-02-board'],
    initialBoardPatterns: [
      [1, 0, 1, 1, 1, 0, 1],
      [0, 1, 1, 0, 1, 1, 0]
    ],
    spawnPatterns: [
      [0, 1, 0, 1, 0, 1, 0],
      [1, 1, 0, 1, 0, 1, 1],
      [0, 1, 1, 0, 1, 1, 0],
      [1, 0, 1, 0, 1, 0, 1]
    ]
  },
  {
    id: 'world-01-stage-03',
    worldId: 'world-01',
    title: 'Voltage Drill',
    kind: 'challenge',
    assetBundleIds: ['stage-03-board'],
    teachingFocusText: '짧은 턴 안에 효율적인 파괴 루트를 찾는 숙련 테스트',
    initialBoardPatterns: [
      [1, 1, 1, 0, 1, 1, 1],
      [0, 1, 0, 1, 0, 1, 0]
    ],
    spawnPatterns: [
      [1, 0, 1, 1, 1, 0, 1],
      [0, 1, 0, 1, 0, 1, 0],
      [1, 1, 0, 0, 0, 1, 1],
      [0, 1, 1, 1, 1, 1, 0]
    ]
  },
  {
    id: 'world-01-stage-04',
    worldId: 'world-01',
    title: 'Final Lattice',
    kind: 'climax',
    assetBundleIds: ['stage-04-board', 'stage-04-bgm'],
    nextWorldIdToUnlock: 'world-02',
    initialBoardPatterns: [
      [1, 1, 0, 1, 0, 1, 1],
      [1, 0, 1, 0, 1, 0, 1]
    ],
    spawnPatterns: [
      [1, 1, 1, 0, 1, 1, 1],
      [0, 1, 1, 1, 1, 1, 0],
      [1, 0, 1, 0, 1, 0, 1],
      [1, 1, 0, 1, 0, 1, 1]
    ]
  },
  {
    id: 'world-02-stage-01',
    worldId: 'world-02',
    title: 'Spark Relay',
    kind: 'tutorial',
    assetBundleIds: ['stage-05-board', 'stage-05-ui'],
    teachingFocusText: '새 월드의 리듬과 반사 타이밍을 짧게 익히는 도입 스테이지',
    initialBoardPatterns: [
      [1, 0, 1, 0, 1, 0, 1],
      [0, 1, 1, 1, 1, 1, 0]
    ],
    spawnPatterns: [
      [1, 1, 0, 1, 0, 1, 1],
      [0, 1, 0, 1, 0, 1, 0],
      [1, 0, 1, 1, 1, 0, 1],
      [0, 1, 1, 0, 1, 1, 0]
    ]
  },
  {
    id: 'world-02-stage-02',
    worldId: 'world-02',
    title: 'Prism Breaker',
    kind: 'climax',
    assetBundleIds: ['stage-06-board', 'stage-06-bgm'],
    initialBoardPatterns: [
      [1, 1, 1, 0, 1, 1, 1],
      [1, 0, 1, 1, 1, 0, 1]
    ],
    spawnPatterns: [
      [1, 1, 0, 1, 0, 1, 1],
      [0, 1, 1, 1, 1, 1, 0],
      [1, 0, 1, 0, 1, 0, 1],
      [1, 1, 1, 0, 1, 1, 1]
    ]
  }
];

const worldContentManifest = {
  worlds,
  stages
};

export default worldContentManifest;
