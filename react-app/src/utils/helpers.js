export function getInitials(name) {
  return name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2) || '??';
}

export function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text?.replace(/[&<>"']/g, (m) => map[m]) || '';
}

export function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const time = d.toLocaleTimeString('kk', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return time;
  return d.toLocaleDateString('kk', { day: 'numeric', month: 'short' }) + ' ' + time;
}

export function transliterate(str) {
  const map = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z',
    и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', ә: 'a', і: 'i', ң: 'n',
    ғ: 'g', ү: 'u', ұ: 'u', қ: 'k', ө: 'o', һ: 'h',
  };
  return str
    .split('')
    .map((c) => {
      const lower = c.toLowerCase();
      if (map[lower] !== undefined) {
        return c === lower ? map[lower] : map[lower].charAt(0).toUpperCase() + map[lower].slice(1);
      }
      return c;
    })
    .join('');
}

// ...existing code...

export function generatePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 8; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
}

export function resolveMediaUrl(photoPath) {
  if (!photoPath) return '/src/assets/placeholder.svg';
  if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
    return photoPath;
  }
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  if (photoPath.startsWith('/')) {
    return `${apiBase}${photoPath}`;
  }
  return `/src/assets/placeholder.svg`;
}

