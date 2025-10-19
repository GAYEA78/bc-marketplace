// src/utils/imageUrl.js
const apiBase = import.meta.env.VITE_API_BASE_URL;
export function normalizeImg(raw) {
  const url = (raw || '').trim();
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;  // absolute S3/CDN
  return `${apiBase}${url.startsWith('/') ? url : `/${url}`}`;
}
