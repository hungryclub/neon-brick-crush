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
  }
];

const stages: IRawStageContentDefinition[] = [
  {
    id: 'world-01-stage-01',
    worldId: 'world-01',
    title: 'First Bounce',
    kind: 'tutorial',
    assetBundleIds: ['stage-01-board', 'stage-01-ui'],
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
  }
];

const worldContentManifest = {
  worlds,
  stages
};

export default worldContentManifest;
