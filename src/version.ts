export interface AppVersionInfo {
  version: string;
  releaseChannel: 'Beta' | 'Stable';
  buildDate: string;
}

export const APP_VERSION_INFO: AppVersionInfo = {
  version: 'b18112026',
  releaseChannel: 'Beta',
  buildDate: '18/11/2026',
};
