const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');

function getBaseBuildVersion(date = new Date()) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return {
    baseTag: `b${day}${month}${year}`,
    formattedDate: `${day}/${month}/${year}`,
  };
}

function getNextBuildVersion(customDate) {
  const { baseTag, formattedDate } = getBaseBuildVersion(customDate);
  const existingTags = new Set();

  // 1. Check local git tags
  try {
    const local = execSync('git tag -l', { cwd: rootDir, encoding: 'utf-8', timeout: 3000 });
    local.split(/\r?\n/).forEach((t) => t.trim() && existingTags.add(t.trim()));
  } catch {}

  // 2. Check remote git tags on GitHub (fast check, max 4s timeout)
  try {
    const remote = execSync('git ls-remote --tags origin', { cwd: rootDir, encoding: 'utf-8', timeout: 4000 });
    remote.split(/\r?\n/).forEach((line) => {
      const match = line.match(/refs\/tags\/([^\s^]+)/);
      if (match) existingTags.add(match[1]);
    });
  } catch {}

  // 3. Check existing build files in release/ directory
  const releaseDir = path.join(rootDir, 'release');
  if (fs.existsSync(releaseDir)) {
    try {
      const files = fs.readdirSync(releaseDir);
      for (const file of files) {
        if (file.toLowerCase().endsWith('.exe') && file.includes(baseTag)) {
          // extract tag part like b06112026 or b06112026-1
          const match = file.match(new RegExp(`${baseTag}(?:[-.]?\\d+)?`, 'i'));
          if (match) existingTags.add(match[0]);
        }
      }
    } catch {}
  }

  // Find the highest revision for today's baseTag
  // -1 means today's baseTag is completely fresh and not yet used
  let maxRev = -1;

  for (const rawTag of existingTags) {
    const clean = rawTag
      .replace(/^refs\/tags\//i, '')
      .replace(/^v/i, '')
      .replace(/^1\.0\.0-/i, '')
      .replace(/\.exe$/i, '');

    if (clean.toLowerCase() === baseTag.toLowerCase()) {
      if (maxRev < 0) maxRev = 0;
    } else if (clean.toLowerCase().startsWith(baseTag.toLowerCase())) {
      const suffix = clean.slice(baseTag.length);
      const match = suffix.match(/^[-.]?(\d+)$/);
      if (match) {
        const rev = parseInt(match[1], 10);
        if (rev > maxRev) maxRev = rev;
      }
    }
  }

  let finalTag = baseTag;
  if (maxRev >= 0) {
    // If base tag or revisions already exist today, increment next number
    finalTag = `${baseTag}-${maxRev + 1}`;
  }

  return {
    versionTag: finalTag,
    baseTag,
    formattedDate,
    revision: maxRev >= 0 ? maxRev + 1 : 0,
  };
}

if (require.main === module) {
  const result = getNextBuildVersion();
  process.stdout.write(result.versionTag);
}

module.exports = {
  getNextBuildVersion,
  getBaseBuildVersion,
};
