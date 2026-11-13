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

// What each permission lets you do, phrased for "You can't …" (users never see the permission keys).
const PERMISSION_ACTIONS = {
  'notes.manage_own': 'create or open notes',
  'notes.update_own': 'change notes',
  'notes.delete_own': 'delete notes',
  'notes.read_all': "see other people's notes",
  'posts.create': 'write posts',
  'posts.update_own': 'edit posts',
  'posts.delete_own': 'delete posts',
  'posts.delete_any': "delete other people's posts",
  'users.read': 'see the user list',
  'users.manage': 'manage users',
  'roles.manage': 'manage roles',
};

/**
 * Per error code: tone (color), icon, eyebrow (small label above the title) and title.
 * The message under the title is the API's own sentence unless a better one is given here.
 */
const KINDS = {
  PERMISSION_DENIED: { tone: 'warning', icon: 'lock', eyebrow: 'Access restricted', title: 'You don’t have access to this', message: 'Your role doesn’t include this action. Ask an admin if you need it.' },
  FORBIDDEN: { tone: 'warning', icon: 'lock', eyebrow: 'Not allowed', title: 'This action isn’t allowed' },
  VALIDATION_FAILED: { tone: 'danger', icon: 'alert', eyebrow: 'Check your input', title: 'Something needs fixing' },
  BAD_REQUEST: { tone: 'danger', icon: 'alert', eyebrow: 'Request rejected', title: 'That didn’t go through' },
  UNAUTHORIZED: { tone: 'danger', icon: 'lock', eyebrow: 'Sign-in', title: 'Sign-in needed' },
  TOKEN_EXPIRED: { tone: 'info', icon: 'clock', eyebrow: 'Session', title: 'Your session expired', message: 'For your security you were signed out. Sign in again to continue.' },
  ACCOUNT_DISABLED: { tone: 'danger', icon: 'lock', eyebrow: 'Account', title: 'Your account is deactivated', message: 'An admin turned off your access. Contact them to get it back.' },
  NOT_FOUND: { tone: 'info', icon: 'search', eyebrow: 'Not found', title: 'We couldn’t find that' },
  CONFLICT: { tone: 'warning', icon: 'alert', eyebrow: 'Duplicate', title: 'That already exists' },
  RATE_LIMITED: { tone: 'warning', icon: 'clock', eyebrow: 'Slow down', title: 'Too many attempts', message: 'Wait a few minutes, then try again.' },
  NETWORK: { tone: 'danger', icon: 'offline', eyebrow: 'Offline', title: 'Can’t reach the server', message: 'Check your connection and try again.' },
  INTERNAL: { tone: 'danger', icon: 'alert', eyebrow: 'Server error', title: 'Something broke on our side', message: 'It’s not you. Try again in a moment.' },
};
const FALLBACK = { tone: 'danger', icon: 'alert', eyebrow: 'Error', title: 'Something went wrong' };

/** { tone, icon, eyebrow, title, message, fields } for any error (ApiError, Error or string). */
export function describeError(error) {
  if (!error) return null;
  if (typeof error === 'string') return { ...FALLBACK, message: error, fields: [] };
  const kind = KINDS[error.code] ?? FALLBACK;
  const fields = (error.fields ?? []).map((f) => ({ field: f.field, label: fieldLabel(f.field), messages: f.messages.map(friendlyMessage) }));
  let { title } = kind;
  let message = kind.message ?? error.message;
  if (error.code === 'PERMISSION_DENIED' && PERMISSION_ACTIONS[error.permission]) title = `You can’t ${PERMISSION_ACTIONS[error.permission]}`;
  if (fields.length) {
    title = fields.length === 1 ? `${fields[0].label} needs a fix` : `${fields.length} fields need a fix`;
    message = fields.length === 1 ? null : 'Click a field to jump to it.';
  }
  return { ...kind, title, message, fields };
}
