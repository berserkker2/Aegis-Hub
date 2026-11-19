export interface AppVersionInfo {
  version: string;
  releaseChannel: 'Beta' | 'Stable';
  buildDate: string;
}

export const APP_VERSION_INFO: AppVersionInfo = {
  version: 'b19112026',
  releaseChannel: 'Beta',
  buildDate: '19/11/2026',
};
