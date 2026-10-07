export const getPasswordRequirements = password => [
  {
    label: '8 Chars',
    valid: password.length >= 8,
  },
  {
    label: 'A-Z',
    valid: /[A-Z]/.test(password),
  },
  {
    label: 'a-z',
    valid: /[a-z]/.test(password),
  },
  {
    label: '123',
    valid: /[0-9]/.test(password),
  },
  {
    label: '@#$',
    valid: /[^A-Za-z0-9]/.test(password),
  },
];

export const getPasswordScore = password =>
  getPasswordRequirements(password).filter(requirement => requirement.valid).length;

export const isPasswordStrong = password => getPasswordScore(password) === 5;

export const doPasswordsMatch = (password, confirmPassword) =>
  password.length > 0 &&
  confirmPassword.length > 0 &&
  password === confirmPassword;

export const getPasswordStrengthLabel = password => {
  const score = getPasswordScore(password);

  if (score === 5) {
    return 'Strong';
  }

  if (score >= 4) {
    return 'Good';
  }

  if (score >= 3) {
    return 'Fair';
  }

  return 'Weak';
};
