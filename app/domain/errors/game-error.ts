export interface IGameError {
  code: string;
  message: string;
}

export const AD_LOAD_FAILED = 'AD_LOAD_FAILED';
export const IAP_PURCHASE_FAILED = 'IAP_PURCHASE_FAILED';
export const MONETIZATION_UNAVAILABLE = 'MONETIZATION_UNAVAILABLE';
export const SAVE_LOAD_FAILED = 'SAVE_LOAD_FAILED';
export const STAGE_CONFIG_NOT_FOUND = 'STAGE_CONFIG_NOT_FOUND';
export const STAGE_CONFIG_INVALID = 'STAGE_CONFIG_INVALID';
