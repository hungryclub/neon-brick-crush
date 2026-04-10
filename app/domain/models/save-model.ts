import type { IProgressionSnapshot } from './progression-model';

export interface IProgressionSaveEnvelope {
  schemaVersion: number;
  progression: IProgressionSnapshot;
}
