const {
  validatePassword,
  validateRegistration,
  validateLogin,
} = require('../src/validation/auth');

describe('validatePassword', () => {
  it('accepts a strong password', () => {
    expect(validatePassword('Abcdefg1')).toBeNull();
  });

  it('accepts spaces and symbols', () => {
    expect(validatePassword('Hello #2026')).toBeNull();
  });

  it('rejects a missing uppercase letter', () => {
    expect(validatePassword('abcdefg1')).toBe(
      'Password must include an uppercase letter.',
    );
  });

  it('rejects a missing lowercase letter', () => {
    expect(validatePassword('ABCDEFG1')).toBe(
      'Password must include a lowercase letter.',
    );
  });

  it('rejects a missing number', () => {
    expect(validatePassword('Abcdefgh')).toBe(
      'Password must include a number.',
    );
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(validatePassword('Abcde1')).toBe(
      'Password must be at least 8 characters.',
    );
  });

  it('accepts exactly 72 bytes', () => {
    expect(validatePassword(`Aa1${'b'.repeat(69)}`)).toBeNull();
  });

  it('rejects 73 bytes', () => {
    expect(validatePassword(`Aa1${'b'.repeat(70)}`)).toBe(
      'Password is too long.',
    );
  });

  it('counts bytes, not characters (25 emoji = 100 bytes)', () => {
    const password = '😀'.repeat(25);
    expect(password.length).toBeLessThan(72);
    expect(validatePassword(password)).toBe('Password is too long.');
  });

  it('rejects an empty password', () => {
    expect(validatePassword('')).toBe('Please enter a password.');
  });
});

describe('validateRegistration', () => {
  const good = { name: 'Prithvi', email: 'a@b.co', password: 'Abcdefg1' };

  it('returns the cleaned values for valid input', () => {
    expect(validateRegistration(good)).toEqual({ value: good });
  });

  it('returns the name error for a whitespace-only name', () => {
    expect(validateRegistration({ ...good, name: '  ' })).toEqual({
      error: 'Please enter your name.',
    });
  });

  it('rejects a name over 255 characters', () => {
    expect(validateRegistration({ ...good, name: 'a'.repeat(256) }).error).toBe(
      'Name is too long.',
    );
  });

  it('accepts a very short name like "Al"', () => {
    expect(validateRegistration({ ...good, name: 'Al' }).error).toBeUndefined();
  });

  it('trims the name but keeps its capitalisation', () => {
    const { value } = validateRegistration({ ...good, name: '  Prithvi B S ' });
    expect(value.name).toBe('Prithvi B S');
  });

  it('trims and lower-cases the email', () => {
    const { value } = validateRegistration({ ...good, email: ' A@B.CO ' });
    expect(value.email).toBe('a@b.co');
  });

  it('gives a separate message for an empty email', () => {
    expect(validateRegistration({ ...good, email: '' }).error).toBe(
      'Please enter your email address.',
    );
  });

  it('rejects a malformed email', () => {
    expect(validateRegistration({ ...good, email: 'not-an-email' }).error).toBe(
      'Please enter a valid email address.',
    );
  });

  it('accepts an email of exactly 255 characters', () => {
    const email = `${'a'.repeat(250)}@b.co`; // 255
    expect(validateRegistration({ ...good, email }).error).toBeUndefined();
  });

  it('rejects an email over 255 characters', () => {
    const email = `${'a'.repeat(251)}@b.co`; // 256
    expect(validateRegistration({ ...good, email }).error).toBe(
      'Please enter a valid email address.',
    );
  });

  it('never modifies the password', () => {
    const { value } = validateRegistration({
      ...good,
      password: ' Hello 2026 ',
    });
    expect(value.password).toBe(' Hello 2026 ');
  });

  it('returns an error for a non-string name instead of crashing', () => {
    expect(() => validateRegistration({ ...good, name: 123 })).not.toThrow();
    expect(validateRegistration({ ...good, name: 123 }).error).toBe(
      'Please enter your name.',
    );
  });

  it('returns an error for a non-string email instead of crashing', () => {
    expect(validateRegistration({ ...good, email: 123 }).error).toBe(
      'Please enter your email address.',
    );
  });

  it('returns an error for a non-string password instead of crashing', () => {
    expect(validateRegistration({ ...good, password: 12345678 }).error).toBe(
      'Please enter a password.',
    );
  });

  it('returns an error when the body is missing entirely', () => {
    expect(validateRegistration(undefined).error).toBe(
      'Please enter your name.',
    );
  });
});

describe('validateLogin', () => {
  it('lower-cases and trims the email and keeps the password as typed', () => {
    expect(
      validateLogin({ email: ' A@B.CO ', password: ' Whatever ' }),
    ).toEqual({ value: { email: 'a@b.co', password: ' Whatever ' } });
  });

  it('does not apply the registration password rules', () => {
    expect(
      validateLogin({ email: 'a@b.co', password: 'old' }).error,
    ).toBeUndefined();
  });

  it.each([
    ['missing email', { password: 'x' }],
    ['blank email', { email: '   ', password: 'x' }],
    ['missing password', { email: 'a@b.co' }],
    ['empty password', { email: 'a@b.co', password: '' }],
    ['non-string email', { email: 123, password: 'x' }],
    ['non-string password', { email: 'a@b.co', password: 123 }],
  ])('rejects %s', (_label, body) => {
    expect(validateLogin(body)).toEqual({
      error: 'Please enter your email and password.',
    });
  });

  it('returns an error when the body is missing entirely', () => {
    expect(validateLogin(undefined).error).toBe(
      'Please enter your email and password.',
    );
  });
});
