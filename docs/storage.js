// Storage is optional. Private browsing or a full storage quota must not break the guide.
export function readText(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function writeText(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Session interactions still work. */
  }
}
export function readList(key) {
  try {
    const value = JSON.parse(readText(key) ?? '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
