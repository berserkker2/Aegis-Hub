export interface AppVersionInfo {
  version: string;
  releaseChannel: 'Beta' | 'Stable';
  buildDate: string;
}

export const APP_VERSION_INFO: AppVersionInfo = {
  version: 'b14112026-1',
  releaseChannel: 'Beta',
  buildDate: '14/11/2026',
};
