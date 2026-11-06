const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const rootDir = path.resolve(__dirname, '..');

// 1. Load GH_TOKEN from .env if present
const envFilePath = path.join(rootDir, '.env');
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
    }
  }
}

// 2. Read current version from package.json or src/version.ts
const pkgPath = path.join(rootDir, 'package.json');
let pkg = {};
if (fs.existsSync(pkgPath)) {
  pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
}

const now = new Date();
const day = String(now.getDate()).padStart(2, '0');
const month = String(now.getMonth() + 1).padStart(2, '0');
const year = now.getFullYear();
const defaultBuildTag = `b${day}${month}${year}`;
const formattedDate = `${day}/${month}/${year}`;

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
    console.log(`  [2] Compilar e PUBLICAR RELEASE no GitHub (Automático)`);
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

  const versionTag = defaultBuildTag;
  console.log(`\n--------------------------------------------------------`);
  console.log(`  Versão do Build: ${versionTag}`);
  console.log(`  Data: ${formattedDate}`);
  console.log(`  Modo: ${isPublish ? '🚀 PUBLICAR NO GITHUB RELEASES' : '💻 BUILD LOCAL APENAS'}`);
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

  // Update package.json version
  if (pkgPath && pkg) {
    pkg.version = `1.0.0-${versionTag}`;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
  }

  // Set environment variable for electron-builder artifactName
  const env = { ...process.env, APP_VERSION: versionTag };

  // 1. Build frontend & electron bundle
  console.log(`[1/2] Compilando frontend (Vite) e processo Electron...`);
  execSync('npm run build', { stdio: 'inherit', cwd: rootDir, env });

  // 2. Package / Publish with electron-builder
  const publishFlag = isPublish ? '--publish always' : '--publish never';
  const builderCmd = `npx electron-builder ${targetArg} ${publishFlag}`;

  console.log(`\n[2/2] Executando electron-builder (${builderCmd})...\n`);
  execSync(builderCmd, { stdio: 'inherit', cwd: rootDir, env });

  console.log(`\n========================================================`);
  if (isPublish) {
    console.log(`  🎉 SUCESSO! A release v${versionTag} foi publicada no GitHub!`);
    console.log(`  Link: https://github.com/berserkker2/Aegis-Hub/releases`);
  } else {
    console.log(`  ✅ Build concluído com sucesso localmente na pasta 'release/'!`);
  }
  console.log(`========================================================\n`);
}

main().catch((err) => {
  console.error('\n❌ Erro durante o processo:', err?.message || err);
  process.exit(1);
});
