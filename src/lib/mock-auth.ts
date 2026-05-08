export const AUTH_SESSION_STORAGE_KEY = "knowflow-auth-session";
export const USER_PROFILE_STORAGE_KEY = "knowflow-user-profile";
export const MOCK_AUTH_SESSION_CHANGE_EVENT = "knowflow-auth-session-change";

export type AuthSession = {
  isAuthenticated: boolean;
  id: number | null;
  username: string;
  account: string;
  role: string;
  token?: string;
  displayName: string;
  email: string;
  loginAt: string;
};

export type BackendUserSession = {
  id: number;
  username: string;
  role: string;
  token?: string;
};

export type MockAuthSession = AuthSession;

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

function dispatchMockAuthSessionChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(MOCK_AUTH_SESSION_CHANGE_EVENT));
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

export function getAuthSession(): AuthSession | null {
  const session = readJson<Partial<AuthSession>>(AUTH_SESSION_STORAGE_KEY);

  if (!session?.isAuthenticated || (!session.username && !session.account)) {
    return null;
  }

  const username = session.username || session.account || "";

  return {
    isAuthenticated: true,
    id: session.id ?? null,
    username,
    account: session.account || username,
    role: session.role || "",
    token: session.token,
    displayName: session.displayName?.trim() || username,
    email: session.email?.trim() || "",
    loginAt: session.loginAt || new Date().toISOString(),
  };
}

export function setMockUserProfile(profile: MockUserProfile) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  dispatchMockAuthSessionChange();
}

export function getMockAuthSession(): MockAuthSession | null {
  return getAuthSession();
}

export function setMockAuthSession(account: string) {
  if (typeof window === "undefined") {
    return;
  }

  const profile = getMockUserProfile();
  const session: MockAuthSession = {
    isAuthenticated: true,
    id: null,
    username: account,
    account,
    role: "",
    displayName: profile.displayName,
    email: profile.email,
    loginAt: new Date().toISOString(),
  };

  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
  dispatchMockAuthSessionChange();
}

export function setAuthSession(user: BackendUserSession) {
  if (typeof window === "undefined") {
    return;
  }

  const username = user.username.trim();
  const profile = getMockUserProfile();
  const displayName =
    profile.displayName === DEFAULT_MOCK_USER_PROFILE.displayName
      ? username
      : profile.displayName;
  const session: AuthSession = {
    isAuthenticated: true,
    id: user.id,
    username,
    account: username,
    role: user.role,
    token: user.token,
    displayName,
    email: profile.email,
    loginAt: new Date().toISOString(),
  };

  if (displayName === username) {
    window.localStorage.setItem(
      USER_PROFILE_STORAGE_KEY,
      JSON.stringify({
        displayName,
        email: profile.email,
      }),
    );
  }

  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
  dispatchMockAuthSessionChange();
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
  dispatchMockAuthSessionChange();
}

export function clearMockAuthSession(options: { clearProfile?: boolean } = {}) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);

  if (options.clearProfile) {
    window.localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
  }

  dispatchMockAuthSessionChange();
}
