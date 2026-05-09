import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";

export const AUTH_SESSION_STORAGE_KEY = "knowflow-auth-session";
export const USER_PROFILE_STORAGE_KEY = "knowflow-user-profile";
export const AUTH_SESSION_CHANGE_EVENT = "knowflow-auth-session-change";

export type AuthPersistMode = "local" | "session";

export type AuthSession = {
  isAuthenticated: true;
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
  id: number | null;
  username: string;
  role: string;
  token?: string;
};

export type MockUserProfile = {
  displayName: string;
  email: string;
};

export const DEFAULT_MOCK_USER_PROFILE: MockUserProfile = {
  displayName: "Oya",
  email: "oya@example.com",
};

type AuthPersistedState = {
  session: AuthSession | null;
  persistMode: AuthPersistMode;
};

type AuthState = AuthPersistedState & {
  profile: MockUserProfile;
};

type SetSessionOptions = {
  remember?: boolean;
};

type ClearSessionOptions = {
  clearProfile?: boolean;
};

type AuthStore = AuthState & {
  setSession: (user: BackendUserSession, options?: SetSessionOptions) => void;
  clearSession: (options?: ClearSessionOptions) => void;
  setProfile: (profile: MockUserProfile) => void;
  getProfile: () => MockUserProfile;
};

function getStorage(mode: AuthPersistMode) {
  if (typeof window === "undefined") {
    return null;
  }

  return mode === "local" ? window.localStorage : window.sessionStorage;
}

function dispatchAuthSessionChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(AUTH_SESSION_CHANGE_EVENT));
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readLegacyProfile(): Partial<MockUserProfile> | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawProfile = window.localStorage.getItem(USER_PROFILE_STORAGE_KEY);

  if (!rawProfile) {
    return null;
  }

  try {
    return JSON.parse(rawProfile) as Partial<MockUserProfile>;
  } catch {
    window.localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
    return null;
  }
}

function writeLegacyProfile(profile: MockUserProfile) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

function removeLegacyProfile() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
}

function normalizeProfile(profile: unknown): MockUserProfile {
  const profileRecord = toRecord(profile);

  return {
    displayName:
      typeof profileRecord?.displayName === "string" &&
      profileRecord.displayName.trim()
        ? profileRecord.displayName.trim()
        : DEFAULT_MOCK_USER_PROFILE.displayName,
    email:
      typeof profileRecord?.email === "string" && profileRecord.email.trim()
        ? profileRecord.email.trim()
        : DEFAULT_MOCK_USER_PROFILE.email,
  };
}

function normalizeSession(session: unknown): AuthSession | null {
  const sessionRecord = toRecord(session);

  if (!sessionRecord?.isAuthenticated) {
    return null;
  }

  const username =
    typeof sessionRecord.username === "string" && sessionRecord.username.trim()
      ? sessionRecord.username.trim()
      : typeof sessionRecord.account === "string" && sessionRecord.account.trim()
        ? sessionRecord.account.trim()
        : "";

  if (!username) {
    return null;
  }

  return {
    isAuthenticated: true,
    id: typeof sessionRecord.id === "number" ? sessionRecord.id : null,
    username,
    account:
      typeof sessionRecord.account === "string" && sessionRecord.account.trim()
        ? sessionRecord.account.trim()
        : username,
    role: typeof sessionRecord.role === "string" ? sessionRecord.role : "",
    token:
      typeof sessionRecord.token === "string" && sessionRecord.token.trim()
        ? sessionRecord.token
        : undefined,
    displayName:
      typeof sessionRecord.displayName === "string" &&
      sessionRecord.displayName.trim()
        ? sessionRecord.displayName.trim()
        : username,
    email:
      typeof sessionRecord.email === "string" ? sessionRecord.email.trim() : "",
    loginAt:
      typeof sessionRecord.loginAt === "string" && sessionRecord.loginAt.trim()
        ? sessionRecord.loginAt
        : new Date().toISOString(),
  };
}

function normalizePersistMode(
  mode: unknown,
  fallback: AuthPersistMode,
): AuthPersistMode {
  return mode === "local" || mode === "session" ? mode : fallback;
}

function parseStoredState(
  rawValue: string,
  fallbackMode: AuthPersistMode,
) {
  try {
    const parsedValue = JSON.parse(rawValue) as unknown;
    const parsedRecord = toRecord(parsedValue);

    if (!parsedRecord) {
      return null;
    }

    const stateRecord = toRecord(parsedRecord.state) ?? parsedRecord;
    const session = normalizeSession(
      "session" in stateRecord ? stateRecord.session : stateRecord,
    );

    const persistMode = normalizePersistMode(
      stateRecord.persistMode,
      fallbackMode,
    );

    return {
      state: {
        session,
        persistMode,
      },
      version: typeof parsedRecord.version === "number" ? parsedRecord.version : 0,
    };
  } catch {
    return null;
  }
}

function readStoredState(
  storage: Storage | null,
  name: string,
  fallbackMode: AuthPersistMode,
) {
  if (!storage) {
    return null;
  }

  const rawValue = storage.getItem(name);

  if (!rawValue) {
    return null;
  }

  const storedState = parseStoredState(rawValue, fallbackMode);

  if (!storedState) {
    storage.removeItem(name);
  }

  return storedState;
}

const authPersistStorage: PersistStorage<AuthPersistedState> = {
  getItem: (name) => {
    const localState = readStoredState(getStorage("local"), name, "local");

    if (localState?.state.session) {
      return localState;
    }

    const sessionState = readStoredState(getStorage("session"), name, "session");

    if (sessionState?.state.session) {
      return sessionState;
    }

    return localState ?? sessionState;
  },
  setItem: (name, value) => {
    if (!value.state.session) {
      getStorage("local")?.removeItem(name);
      getStorage("session")?.removeItem(name);
      return;
    }

    const targetMode = value.state.persistMode;
    const targetStorage = getStorage(targetMode);
    const staleStorage = getStorage(targetMode === "local" ? "session" : "local");

    staleStorage?.removeItem(name);
    targetStorage?.setItem(name, JSON.stringify(value));
  },
  removeItem: (name) => {
    getStorage("local")?.removeItem(name);
    getStorage("session")?.removeItem(name);
  },
};

function createSession(
  user: BackendUserSession,
  profile: MockUserProfile,
): { session: AuthSession; profile: MockUserProfile } {
  const username = user.username.trim();
  const displayName =
    profile.displayName === DEFAULT_MOCK_USER_PROFILE.displayName
      ? username
      : profile.displayName;
  const nextProfile = {
    ...profile,
    displayName,
  };

  return {
    session: {
      isAuthenticated: true,
      id: user.id,
      username,
      account: username,
      role: user.role,
      token: user.token,
      displayName,
      email: nextProfile.email,
      loginAt: new Date().toISOString(),
    },
    profile: nextProfile,
  };
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      session: null,
      profile: normalizeProfile(readLegacyProfile()),
      persistMode: "session",
      setSession: (user, options = {}) => {
        const nextMode: AuthPersistMode = options.remember ? "local" : "session";
        const nextAuthState = createSession(user, get().profile);

        set({
          ...nextAuthState,
          persistMode: nextMode,
        });
        dispatchAuthSessionChange();
      },
      clearSession: (options = {}) => {
        if (options.clearProfile) {
          removeLegacyProfile();
        }

        set({
          session: null,
          profile: options.clearProfile
            ? DEFAULT_MOCK_USER_PROFILE
            : get().profile,
          persistMode: "session",
        });
        dispatchAuthSessionChange();
      },
      setProfile: (profile) => {
        const nextProfile = normalizeProfile(profile);
        const currentSession = get().session;

        writeLegacyProfile(nextProfile);
        set({
          profile: nextProfile,
          session: currentSession
            ? {
                ...currentSession,
                displayName: nextProfile.displayName,
                email: nextProfile.email,
              }
            : null,
        });
        dispatchAuthSessionChange();
      },
      getProfile: () => {
        const currentSession = get().session;

        if (currentSession) {
          return {
            displayName: currentSession.displayName,
            email: currentSession.email,
          };
        }

        return get().profile;
      },
    }),
    {
      name: AUTH_SESSION_STORAGE_KEY,
      storage: authPersistStorage,
      partialize: (state): AuthPersistedState => ({
        session: state.session,
        persistMode: state.persistMode,
      }),
    },
  ),
);
