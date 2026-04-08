export interface IAppConfig {
  targetFps: number;
  initialWorldId: string;
}

const appConfig: IAppConfig = {
  targetFps: 60,
  initialWorldId: 'world-01'
};

export default appConfig;
