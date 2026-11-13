// Turns API errors into friendly text for ErrorAlert and the inline field messages.

const FIELD_LABELS = {
  title: 'Title', content: 'Content', name: 'Name', email: 'Email', password: 'Password', tags: 'Tags',
  category_id: 'Category', interests: 'Interests', role_id: 'Role', permissions: 'Permissions', description: 'Description',
  isArchived: 'Archived', pinned: 'Pinned', isActive: 'Active', q: 'Search', user_id: 'User', sort: 'Sort', order: 'Order',
};

/** "category_id" -> "Category", "tags.0" -> "Tags (item 1)". */
export function fieldLabel(field) {
  const [head, index] = field.split('.');
  const label = FIELD_LABELS[head] ?? head.replace(/_id$/, '').replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
  return index !== undefined && /^\d+$/.test(index) ? `${label} (item ${Number(index) + 1})` : label;
}

// class-validator's default wording, made friendlier.
const REWRITES = [
  [/^must be longer than or equal to (\d+) characters?$/, (n) => (n === '1' ? 'cannot be empty' : `must be at least ${n} characters`)],
  [/^must be shorter than or equal to (\d+) characters?$/, (n) => `must be at most ${n} characters`],
  [/^must be an email$/, () => 'must be a valid email address'],
  [/^must be a string$/, () => 'must be text'],
  [/^must be a boolean value$/, () => 'must be true or false'],
  [/^should not be empty$/, () => 'cannot be empty'],
  [/^should not exist$/, () => 'is not allowed here'],
  [/^must contain no more than (\d+) elements$/, (n) => `can have at most ${n} items`],
];

export function friendlyMessage(message) {
  for (const [pattern, rewrite] of REWRITES) {
    const match = message.match(pattern);
    if (match) return rewrite(...match.slice(1));
  }
  return message;
}

/** The friendly messages for one field of an error (inline under an input), or []. */
export function fieldMessages(error, field) {
  const fields = error && typeof error === 'object' ? error.fields ?? [] : [];
  return fields.filter((f) => f.field === field || f.field.startsWith(`${field}.`)).flatMap((f) => f.messages.map(friendlyMessage));
}

const KINDS = {
  PERMISSION_DENIED: { tone: 'warning', icon: 'lock', title: 'Permission not given' },
  FORBIDDEN: { tone: 'warning', icon: 'lock', title: 'Not allowed' },
  VALIDATION_FAILED: { tone: 'danger', icon: 'alert', title: 'Please check your input' },
  BAD_REQUEST: { tone: 'danger', icon: 'alert', title: 'That request was not accepted' },
  UNAUTHORIZED: { tone: 'danger', icon: 'lock', title: 'Sign-in needed' },
  NOT_FOUND: { tone: 'info', icon: 'search', title: 'Not found' },
  CONFLICT: { tone: 'warning', icon: 'alert', title: 'Already exists' },
  RATE_LIMITED: { tone: 'warning', icon: 'clock', title: 'Too many attempts' },
  NETWORK: { tone: 'danger', icon: 'offline', title: 'Connection problem' },
  INTERNAL: { tone: 'danger', icon: 'alert', title: 'Something went wrong on our side' },
};

/** { tone, icon, title, message, fields, permission } for any error (ApiError, Error or string). */
export function describeError(error) {
  if (!error) return null;
  if (typeof error === 'string') return { tone: 'danger', icon: 'alert', title: 'Something went wrong', message: error, fields: [] };
  const kind = KINDS[error.code] ?? { tone: 'danger', icon: 'alert', title: 'Something went wrong' };
  const fields = (error.fields ?? []).map((f) => ({ field: f.field, label: fieldLabel(f.field), messages: f.messages.map(friendlyMessage) }));
  let message = error.message;
  if (error.code === 'PERMISSION_DENIED') message = message.replace(/\s*Ask an admin.*$/, '');
  if (fields.length && error.code === 'VALIDATION_FAILED') message = fields.length === 1 ? 'One field needs your attention.' : `${fields.length} fields need your attention.`;
  return { ...kind, message, fields, permission: error.permission };
}
