import steamLogo from '../assets/logos/steam.webp';
import epicLogo from '../assets/logos/epic.webp';
import gogLogo from '../assets/logos/gog.webp';
import eaLogo from '../assets/logos/ea.webp';
import ubisoftLogo from '../assets/logos/ubisoft.webp';
import xboxLogo from '../assets/logos/xbox.webp';
import emulatedLogo from '../assets/logos/emulated.webp';
import localLogo from '../assets/logos/local.webp';

export interface PlatformBadgeInfo {
  name: string;
  logo: string;
  color: string;
  bg: string;
}

export function formatPlaytime(minutes: number): string {
  if (!minutes || minutes <= 0) return '0h';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

export function formatRelativeDate(isoDate?: string): string {
  if (!isoDate) return 'Never';
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 2) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getPlatformBadge(platform: string): PlatformBadgeInfo {
  switch ((platform || '').toLowerCase()) {
    case 'steam':
      return { name: 'Steam', logo: steamLogo, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30' };
    case 'epic':
      return { name: 'Epic Games', logo: epicLogo, color: 'text-slate-200', bg: 'bg-slate-700/40 border-slate-600/40' };
    case 'gog':
      return { name: 'GOG Galaxy', logo: gogLogo, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' };
    case 'ubisoft':
      return { name: 'Ubisoft', logo: ubisoftLogo, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' };
    case 'ea':
      return { name: 'EA App', logo: eaLogo, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' };
    case 'xbox':
      return { name: 'Xbox', logo: xboxLogo, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
    case 'emulator':
    case 'emulated':
      return { name: 'Emulated', logo: emulatedLogo, color: 'text-violet-400', bg: 'bg-violet-500/15 border-violet-500/30' };
    case 'manual':
    case 'local':
    default:
      return { name: 'Local', logo: localLogo, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
  }
}

export function getPlaceholderCover(title: string): string {
  // Return a stylish SVG poster placeholder
  const encodedTitle = encodeURIComponent(title.slice(0, 24));
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e293b"/><stop offset="100%" stop-color="%230f172a"/></linearGradient></defs><rect width="600" height="900" fill="url(%23g)"/><circle cx="300" cy="400" r="80" fill="%233b82f6" opacity="0.2"/><path d="M280 370 L340 400 L280 430 Z" fill="%233b82f6"/><text x="300" y="550" fill="%23e2e8f0" font-size="28" font-family="sans-serif" font-weight="bold" text-anchor="middle">${encodedTitle}</text></svg>`;
}

export function getPlaceholderBanner(title: string): string {
  const encodedTitle = encodeURIComponent(title.slice(0, 32));
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23111827"/><stop offset="100%" stop-color="%230b0f19"/></linearGradient></defs><rect width="1920" height="1080" fill="url(%23g)"/><text x="960" y="540" fill="%23475569" font-size="48" font-family="sans-serif" font-weight="bold" text-anchor="middle">${encodedTitle}</text></svg>`;
}

export function isoToDateInput(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

export function dateInputToIso(dateStr?: string): string | undefined {
  if (!dateStr || !dateStr.trim()) return undefined;
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return undefined;
    const now = new Date();
    const d = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
    return d.toISOString();
  } catch {
    return undefined;
  }
}

export function toLocalDateStr(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

