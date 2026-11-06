const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const now = new Date();
const day = String(now.getDate()).padStart(2, '0');
const month = String(now.getMonth() + 1).padStart(2, '0');
const year = now.getFullYear();

const versionTag = `b${day}${month}${year}`;
const formattedDate = `${day}/${month}/${year}`;

console.log(`[Version Generator] Setting release version to: ${versionTag} (${formattedDate})`);

// 1. Update src/version.ts
const versionTsPath = path.join(rootDir, 'src', 'version.ts');
const versionTsContent = `export interface AppVersionInfo {
  version: string;
  releaseChannel: 'Beta' | 'Stable';
  buildDate: string;
}

export const APP_VERSION_INFO: AppVersionInfo = {
  version: '${versionTag}',
  releaseChannel: 'Beta',
  buildDate: '${formattedDate}',
};
`;
fs.writeFileSync(versionTsPath, versionTsContent, 'utf-8');

// 2. Update package.json version
const pkgPath = path.join(rootDir, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  pkg.version = `1.0.0-${versionTag}`;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
}

// 3. Export for process env if available
process.env.APP_VERSION = versionTag;
console.log(`[Version Generator] Version files updated successfully!`);
