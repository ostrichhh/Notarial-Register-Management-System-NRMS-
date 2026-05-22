const FIELD_LABELS = {
  current_password: 'Current password',
  new_password: 'New password',
  confirm_password: 'Confirm password',
  non_field_errors: 'Password',
  username: 'Username',
  password: 'Password',
  detail: '',
};

function cleanMessage(message) {
  return String(message || '')
    .replace(/\bDjango\b/gi, 'the server')
    .replace(/This field may not be blank\./gi, 'This field is required.')
    .replace(/No active account found with the given credentials/gi, 'The username or password is incorrect.')
    .trim();
}

export function summarizeApiError(data, fallback = 'Something went wrong. Please try again.') {
  if (!data) return fallback;
  if (typeof data === 'string') return cleanMessage(data) || fallback;

  if (Array.isArray(data)) {
    return data.map(cleanMessage).filter(Boolean).join(' ') || fallback;
  }

  if (typeof data === 'object') {
    const parts = Object.entries(data).flatMap(([key, value]) => {
      const label = FIELD_LABELS[key] ?? key.replace(/_/g, ' ');
      const messages = Array.isArray(value) ? value : [value];
      return messages.map((item) => {
        const text = typeof item === 'object' ? summarizeApiError(item, '') : cleanMessage(item);
        if (!text) return '';
        return label ? `${label}: ${text}` : text;
      });
    });
    return parts.filter(Boolean).join(' ') || fallback;
  }

  return cleanMessage(data) || fallback;
}
