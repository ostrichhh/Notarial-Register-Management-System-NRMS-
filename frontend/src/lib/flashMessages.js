const FLASH_PREFIX = 'nrms.flash.';

export function setFlashMessage(scope, message) {
  if (!scope || !message) return;
  window.sessionStorage.setItem(`${FLASH_PREFIX}${scope}`, JSON.stringify(message));
}

export function consumeFlashMessage(scope) {
  if (!scope) return null;
  const key = `${FLASH_PREFIX}${scope}`;
  const raw = window.sessionStorage.getItem(key);
  if (!raw) return null;
  window.sessionStorage.removeItem(key);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
