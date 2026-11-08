export interface AppVersionInfo {
  version: string;
  releaseChannel: 'Beta' | 'Stable';
  buildDate: string;
}

export const APP_VERSION_INFO: AppVersionInfo = {
  version: 'b08112026',
  releaseChannel: 'Beta',
  buildDate: '08/11/2026',
};
