export interface AppVersionInfo {
  version: string;
  releaseChannel: 'Beta' | 'Stable';
  buildDate: string;
}

export const APP_VERSION_INFO: AppVersionInfo = {
  version: 'b06112026-2',
  releaseChannel: 'Beta',
  buildDate: '06/11/2026',
};
