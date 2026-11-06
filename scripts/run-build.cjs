const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const rootDir = path.resolve(__dirname, '..');

// 1. Load GH_TOKEN from .env if present
const envFilePath = path.join(rootDir, '.env');
let ghToken = process.env.GH_TOKEN || '';
if (fs.existsSync(envFilePath)) {
  const envContent = fs.readFileSync(envFilePath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match) {
      const key = match[1];
      const val = match[2].replace(/^['"](.*)['"]$/, '$1');
      if (!process.env[key]) {
        process.env[key] = val;
      }
      if (key === 'GH_TOKEN') {
        ghToken = val;
      }
    }
  }
}

// 2. Read current version from package.json or src/version.ts
const pkgPath = path.join(rootDir, 'package.json');
let pkg = {};
if (fs.existsSync(pkgPath)) {
  pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
}

const { getNextBuildVersion } = require('./get-build-version.cjs');
const { versionTag, formattedDate } = getNextBuildVersion();

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

function syncGitSourceCode(versionTag) {
  console.log(`\n[GIT] Sincronizando código-fonte com o GitHub (Open Source)...`);
  try {
    // Add safe directory to prevent Windows ownership mismatch errors
    try {
      execSync(`git config --global --add safe.directory "${rootDir.replace(/\\/g, '/')}"`, { stdio: 'ignore' });
    } catch {}

    // Stage all tracked and new non-ignored files
    execSync('git add .', { stdio: 'inherit', cwd: rootDir });

    // Commit if there are changes
    try {
      execSync(`git commit -m "chore(release): version ${versionTag} source update"`, {
        stdio: 'inherit',
        cwd: rootDir,
      });
    } catch {
      // Nothing new to commit, continue
    }

    // Ensure we are on branch main
    try {
      execSync('git branch -M main', { stdio: 'ignore', cwd: rootDir });
    } catch {}

    // Ensure Git tag exists and is pushed to GitHub to prevent concurrent release creation race conditions
    const gitTag = `v1.0.0-${versionTag}`;
    try {
      execSync(`git tag -a ${gitTag} -m "Release ${gitTag}"`, { stdio: 'ignore', cwd: rootDir });
    } catch {}

    // Push code to GitHub
    if (ghToken) {
      const authenticatedUrl = `https://${ghToken}@github.com/berserkker2/Aegis-Hub.git`;
      execSync(`git push -u "${authenticatedUrl}" main`, { stdio: 'inherit', cwd: rootDir });
    } else {
      execSync('git push -u origin main', { stdio: 'inherit', cwd: rootDir });
    }

    // Push tags safely without failing if the tag was already pushed previously
    try {
      if (ghToken) {
        const authenticatedUrl = `https://${ghToken}@github.com/berserkker2/Aegis-Hub.git`;
        execSync(`git push "${authenticatedUrl}" --tags`, { stdio: 'ignore', cwd: rootDir });
      } else {
        execSync('git push origin --tags', { stdio: 'ignore', cwd: rootDir });
      }
    } catch {}

    console.log(`[GIT] ✅ Código-fonte sincronizado com sucesso no GitHub!`);
  } catch (err) {
    console.warn(`[GIT] Aviso ao sincronizar com git:`, err?.message || err);
  }
}

async function main() {
  console.log(`\n========================================================`);
  console.log(`   🚀 AEGIS HUB - UNIFIED BUILD & RELEASE ASSISTANT`);
  console.log(`========================================================\n`);

  const passedArgs = process.argv.slice(2);
  let isPublish = passedArgs.includes('--publish');
  let targetArg = '';

  if (passedArgs.includes('--win') && passedArgs.includes('nsis')) targetArg = '--win nsis';
  else if (passedArgs.includes('--win') && passedArgs.includes('portable')) targetArg = '--win portable';

  // If no direct CLI arguments passed, show interactive menu
  if (passedArgs.length === 0) {
    console.log(`Escolhe a ação pretendida:`);
    console.log(`  [1] Compilar LOCALMENTE apenas (sem enviar para o GitHub)`);
    console.log(`  [2] Sincronizar Código e PUBLICAR RELEASE no GitHub (Automático)`);
    const actionChoice = (await askQuestion(`\nOpção [1/2] (Default 1): `)) || '1';
    isPublish = actionChoice === '2';

    console.log(`\nEscolhe o formato do executável:`);
    console.log(`  [1] Instalador NSIS (Setup.exe - Recomendado)`);
    console.log(`  [2] Versão Portátil (Portable.exe)`);
    console.log(`  [3] Ambos (Instalador + Portátil)`);
    const formatChoice = (await askQuestion(`\nOpção [1/2/3] (Default 1): `)) || '1';

    if (formatChoice === '1') targetArg = '--win nsis';
    else if (formatChoice === '2') targetArg = '--win portable';
    else targetArg = '--win nsis --win portable';
  } else {
    // Filter out our custom --publish flag before passing to electron-builder
    targetArg = passedArgs.filter((a) => a !== '--publish').join(' ');
  }

  // versionTag and formattedDate computed dynamically from getNextBuildVersion()
  console.log(`\n--------------------------------------------------------`);
  console.log(`  Versão do Build: ${versionTag}`);
  console.log(`  Data: ${formattedDate}`);
  console.log(`  Modo: ${isPublish ? '🚀 PUBLICAR NO GITHUB RELEASES & CÓDIGO-FONTE' : '💻 BUILD LOCAL APENAS'}`);
  console.log(`  Alvo: ${targetArg || 'Padrão'}`);
  console.log(`--------------------------------------------------------\n`);

  // Update src/version.ts
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

  // Update package.json version: electron-builder strictly requires SemVer (X.Y.Z) in package.json
  // We keep package.json as 1.0.0-b06112026, and tell electron-builder to create the GitHub release tag as b06112026
  if (pkgPath && pkg) {
    pkg.version = `1.0.0-${versionTag}`;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
  }

  // If publishing, sync source code to GitHub first so branch 'main' exists and matches the release
  if (isPublish) {
    syncGitSourceCode(versionTag);
  }

  // Set environment variable for electron-builder artifactName
  const env = { ...process.env, APP_VERSION: versionTag };

  // 1. Build frontend & electron bundle
  console.log(`\n[1/2] Compilando frontend (Vite) e processo Electron...`);
  execSync('npm run build', { stdio: 'inherit', cwd: rootDir, env });

  // 2. Package / Publish with electron-builder
  // -c.releaseInfo.releaseNotes and releaseName configure GitHub Release cleanly
  const publishFlag = isPublish ? '--publish always' : '--publish never';
  const releaseTitle = `Beta ${versionTag.replace(/^b/i, '')}`;
  const builderCmd = `npx electron-builder ${targetArg} ${publishFlag} -c.extraMetadata.name="Aegis Hub" -c.releaseInfo.releaseName="${releaseTitle}" -c.publish.releaseType="release"`;

  console.log(`\n[2/2] Executando electron-builder (${builderCmd})...\n`);
  execSync(builderCmd, { stdio: 'inherit', cwd: rootDir, env });

  console.log(`\n========================================================`);
  if (isPublish) {
    console.log(`  🎉 SUCESSO!`);
    console.log(`  1. Código-fonte atualizado em: https://github.com/berserkker2/Aegis-Hub`);
    console.log(`  2. Release v${versionTag} publicada com instaladores em: https://github.com/berserkker2/Aegis-Hub/releases`);
  } else {
    console.log(`  ✅ Build concluído com sucesso localmente na pasta 'release/'!`);
  }
  console.log(`========================================================\n`);
}

main().catch((err) => {
  console.error('\n❌ Erro durante o processo:', err?.message || err);
  process.exit(1);
});
