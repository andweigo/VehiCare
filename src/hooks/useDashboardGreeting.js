import { useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const GREETING_PERIODS = {
  MORNING: 'morning',
  AFTERNOON: 'afternoon',
  EVENING: 'evening',
  LATE_NIGHT: 'lateNight',
};

const GREETINGS = {
  [GREETING_PERIODS.MORNING]: [
    'Good morning',
    'Morning',
    'Good morning',
  ],

  [GREETING_PERIODS.AFTERNOON]: [
    'Good afternoon',
    'Hey',
    'Good afternoon',
  ],

  [GREETING_PERIODS.EVENING]: [
    'Good evening',
    'Evening',
    'Good evening',
  ],

  [GREETING_PERIODS.LATE_NIGHT]: [
    'Still up?',
    'Good evening',
    'Late-night check-in',
  ],
};

const CAPTIONS = {
  [GREETING_PERIODS.MORNING]: [
    'Ready to take care of your vehicle?',
    'Start your day with a smooth and reliable ride.',
    'A good day starts with a vehicle you can count on.',
  ],

  [GREETING_PERIODS.AFTERNOON]: [
    'Ready to take care of your vehicle?',
    'Keep your ride running smoothly throughout the day.',
    'Need a quick check or some help with your vehicle?',
  ],

  [GREETING_PERIODS.EVENING]: [
    'Ready to take care of your vehicle?',
    'Review your vehicle needs and plan ahead for tomorrow.',
    'Keep your ride ready for the days ahead.',
  ],

  [GREETING_PERIODS.LATE_NIGHT]: [
    'Ready to take care of your vehicle?',
    'Plan ahead tonight and keep your ride ready for tomorrow.',
    'Check your reminders and prepare for tomorrow’s drive.',
  ],
};

const getGreetingPeriod = hour => {
  if (hour >= 5 && hour < 12) {
    return GREETING_PERIODS.MORNING;
  }

  if (hour >= 12 && hour < 18) {
    return GREETING_PERIODS.AFTERNOON;
  }

  if (hour >= 18 && hour < 22) {
    return GREETING_PERIODS.EVENING;
  }

  return GREETING_PERIODS.LATE_NIGHT;
};

const getRandomItem = items => {
  if (!Array.isArray(items) || items.length === 0) {
    return '';
  }

  return items[Math.floor(Math.random() * items.length)];
};

const normalizeString = value => {
  if (!value) {
    return null;
  }

  const trimmed = String(value).trim();

  return trimmed.length ? trimmed : null;
};

const getEmailName = email => {
  const rawEmail = normalizeString(email);

  if (!rawEmail || !rawEmail.includes('@')) {
    return null;
  }

  const localPart = rawEmail.split('@')[0] || '';

  const cleanedLocal = localPart
    .replace(/[._-]+/g, ' ')
    .trim();

  return cleanedLocal.length ? cleanedLocal : null;
};

const getUserDisplayName = (user, loading) => {
  // 1. Saved nickname
  const nickname = normalizeString(user?.nickname);

  if (nickname) {
    return nickname;
  }

  // 2. Saved profile/display name
  const profileName =
    normalizeString(user?.displayName) ||
    normalizeString(user?.name);

  if (profileName) {
    return profileName;
  }

  // 3. Google/Firebase display name
  const firebaseName =
    normalizeString(user?.providerData?.[0]?.displayName);

  if (firebaseName) {
    return firebaseName;
  }

  // 4. Email fallback
  const emailName = getEmailName(user?.email);

  if (emailName) {
    return emailName;
  }

  // 5. Final fallback
  return loading ? null : null;
};

const buildGreeting = (period, name) => {
  const greetingPrefix = getRandomItem(GREETINGS[period]);
  const subtitleText = getRandomItem(CAPTIONS[period]);

  return {
    greetingPrefix,
    userName: name,
    subtitleText,
  };
};

const useDashboardGreeting = () => {
  const { user, loading } = useAuth();

  const greetingRef = useRef(null);

  const currentPeriod = getGreetingPeriod(
    new Date().getHours(),
  );

  const userName = getUserDisplayName(
    user,
    loading,
  );

  const shouldInitialize =
    !greetingRef.current ||
    greetingRef.current.period !== currentPeriod;

  if (shouldInitialize) {
    const greeting = buildGreeting(
      currentPeriod,
      userName,
    );

    greetingRef.current = {
      period: currentPeriod,
      greetingPrefix: greeting.greetingPrefix,
      userName: greeting.userName,
      subtitleText: greeting.subtitleText,
    };
  }

  // Update name without changing the randomly selected greeting.
  if (
    greetingRef.current.userName !== userName
  ) {
    greetingRef.current = {
      ...greetingRef.current,
      userName,
    };
  }

  return {
    greetingPrefix:
      greetingRef.current.greetingPrefix,

    userName:
      greetingRef.current.userName,

    subtitleText:
      greetingRef.current.subtitleText,
  };
};

export default useDashboardGreeting;