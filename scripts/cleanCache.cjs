const fs = require('fs');
const path = require('path');

const appDataDir = process.env.APPDATA
  ? path.join(process.env.APPDATA, 'game-launcher')
  : path.join(__dirname, '..', '.launcher-data');

console.log('Clearing Aegis Hub cache and data directory:', appDataDir);

if (fs.existsSync(appDataDir)) {
  try {
    fs.rmSync(appDataDir, { recursive: true, force: true });
    console.log('✅ Aegis Hub cache and library database wiped clean successfully!');
  } catch (err) {
    console.error('⚠️ Could not remove all files (files may be in use):', err.message);
  }
} else {
  console.log('ℹ️ No existing cache folder found.');
}
