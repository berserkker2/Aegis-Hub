export interface AppVersionInfo {
  version: string;
  releaseChannel: 'Beta' | 'Stable';
  buildDate: string;
}

export const APP_VERSION_INFO: AppVersionInfo = {
  version: 'b07112026-1',
  releaseChannel: 'Beta',
  buildDate: '07/11/2026',
};
