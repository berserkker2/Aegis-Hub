export interface AppVersionInfo {
  version: string;
  releaseChannel: 'Beta' | 'Stable';
  buildDate: string;
}

export const APP_VERSION_INFO: AppVersionInfo = {
  version: 'b15112026',
  releaseChannel: 'Beta',
  buildDate: '15/11/2026',
};
