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

export const validateFullName = name => {
  const raw = typeof name === 'string' ? name : '';
  const trimmed = raw.trim().replace(/\s+/g, ' ');

  if (!trimmed) {
    return {
      valid: false,
      message: 'Please enter your full name.',
    };
  }

  if (trimmed.length < 2) {
    return {
      valid: false,
      message: 'Name must be at least 2 characters long.',
    };
  }

  if (trimmed.length > 100) {
    return {
      valid: false,
      message: 'Name cannot exceed 100 characters.',
    };
  }

  if (/\d/.test(trimmed)) {
    return {
      valid: false,
      message: 'Name cannot contain numbers. Please use letters only.',
    };
  }

  const validPattern = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ\s.'-]*$/;
  if (!validPattern.test(trimmed)) {
    return {
      valid: false,
      message:
        'Name can only contain letters, spaces, hyphens, apostrophes, and periods, and must start with a letter.',
    };
  }

  const letterCount = (trimmed.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) || []).length;
  if (letterCount < 2) {
    return {
      valid: false,
      message: 'Name must contain at least 2 letters.',
    };
  }

  return {
    valid: true,
    message: '',
    normalized: trimmed,
  };
};
