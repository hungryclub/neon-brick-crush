export interface IProgressionSnapshot {
  version: number;
  unlockedWorldIdList: string[];
}

export default function createProgressionRepository() {
  return {
    async load(): Promise<IProgressionSnapshot> {
      return {
        version: 1,
        unlockedWorldIdList: ['world-01']
      };
    }
  };
}
