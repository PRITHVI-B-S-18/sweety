const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX_LENGTH = 255;
const EMAIL_MAX_LENGTH = 255;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 72; 

const isString = (value) => typeof value === 'string';
const normalizeName = (name) => name.trim();
const normalizeEmail = (email) => email.trim().toLowerCase();

const validateName = (name) => {
  if (!name) return 'Please enter your name.';
  if (name.length > NAME_MAX_LENGTH) return 'Name is too long.';
  return null;
};

const validateEmail = (email) => {
  if (!email) return 'Please enter your email address.';
  if (!EMAIL_REGEX.test(email) || email.length > EMAIL_MAX_LENGTH) {
    return 'Please enter a valid email address.';
  }
  return null;
};

const validatePassword = (password) => {
  if (!password) return 'Please enter a password.';

  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    return 'Password is too long.';
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must include a lowercase letter.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include an uppercase letter.';
  }
  if (!/\d/.test(password)) {
    return 'Password must include a number.';
  }
  return null;
};

// Returns { error } or { value }. Non-string input is treated as empty.
const validateRegistration = (body) => {
  const { name, email, password } = body || {};
  const cleanName = isString(name) ? normalizeName(name) : '';
  const cleanEmail = isString(email) ? normalizeEmail(email) : '';
  const rawPassword = isString(password) ? password : ''; // never modified

  const error =
    validateName(cleanName) ||
    validateEmail(cleanEmail) ||
    validatePassword(rawPassword);
  if (error) return { error };

  return {
    value: { name: cleanName, email: cleanEmail, password: rawPassword },
  };
};

const validateLogin = (body) => {
  const { email, password } = body || {};
  if (!isString(email) || !isString(password) || !email.trim() || !password) {
    return { error: 'Please enter your email and password.' };
  }
  return { value: { email: normalizeEmail(email), password } };
};

module.exports = {
  validateName,
  validateEmail,
  validatePassword,
  validateRegistration,
  validateLogin,
};