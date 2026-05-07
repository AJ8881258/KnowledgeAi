export const AUTH_SESSION_STORAGE_KEY = "knowflow-auth-session";
export const USER_PROFILE_STORAGE_KEY = "knowflow-user-profile";

export type MockAuthSession = {
  isAuthenticated: boolean;
  account: string;
  displayName: string;
  email: string;
  loginAt: string;
};

export type MockUserProfile = {
  displayName: string;
  email: string;
};

export const DEFAULT_MOCK_USER_PROFILE: MockUserProfile = {
  displayName: "Oya",
  email: "oya@example.com",
};

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(key);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

export function getMockUserProfile(): MockUserProfile {
  const storedProfile = readJson<Partial<MockUserProfile>>(
    USER_PROFILE_STORAGE_KEY,
  );

  return {
    displayName:
      storedProfile?.displayName?.trim() ||
      DEFAULT_MOCK_USER_PROFILE.displayName,
    email: storedProfile?.email?.trim() || DEFAULT_MOCK_USER_PROFILE.email,
  };
}

export function setMockUserProfile(profile: MockUserProfile) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function getMockAuthSession(): MockAuthSession | null {
  const session = readJson<MockAuthSession>(AUTH_SESSION_STORAGE_KEY);

  if (!session?.isAuthenticated || !session.account) {
    return null;
  }

  return session;
}

export function setMockAuthSession(account: string) {
  if (typeof window === "undefined") {
    return;
  }

  const profile = getMockUserProfile();
  const session: MockAuthSession = {
    isAuthenticated: true,
    account,
    displayName: profile.displayName,
    email: profile.email,
    loginAt: new Date().toISOString(),
  };

  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function updateMockAuthProfile(profile: MockUserProfile) {
  setMockUserProfile(profile);

  const currentSession = getMockAuthSession();

  if (!currentSession || typeof window === "undefined") {
    return;
  }

  const nextSession: MockAuthSession = {
    ...currentSession,
    displayName: profile.displayName,
    email: profile.email,
  };

  window.localStorage.setItem(
    AUTH_SESSION_STORAGE_KEY,
    JSON.stringify(nextSession),
  );
}

export function clearMockAuthSession(options: { clearProfile?: boolean } = {}) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);

  if (options.clearProfile) {
    window.localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
  }
}
