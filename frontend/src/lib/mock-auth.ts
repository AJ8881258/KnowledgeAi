import {
  AUTH_SESSION_CHANGE_EVENT,
  AUTH_SESSION_STORAGE_KEY,
  DEFAULT_MOCK_USER_PROFILE,
  USER_PROFILE_STORAGE_KEY,
  useAuthStore,
  type AuthSession,
  type BackendUserSession,
  type MockUserProfile,
} from "@/store/auth";

export {
  AUTH_SESSION_STORAGE_KEY,
  DEFAULT_MOCK_USER_PROFILE,
  USER_PROFILE_STORAGE_KEY,
};

export const MOCK_AUTH_SESSION_CHANGE_EVENT = AUTH_SESSION_CHANGE_EVENT;

export type {
  AuthSession,
  BackendUserSession,
  MockUserProfile,
};

export type MockAuthSession = AuthSession;

export function getMockUserProfile(): MockUserProfile {
  return useAuthStore.getState().getProfile();
}

export function getAuthSession(): AuthSession | null {
  return useAuthStore.getState().session;
}

export function setMockUserProfile(profile: MockUserProfile) {
  useAuthStore.getState().setProfile(profile);
}

export function getMockAuthSession(): MockAuthSession | null {
  return getAuthSession();
}

export function setMockAuthSession(account: string) {
  void account;
}

export function setAuthSession(
  user: BackendUserSession,
  options: { remember?: boolean } = {},
) {
  useAuthStore.getState().setSession(user, options);
}

export function updateMockAuthProfile(profile: MockUserProfile) {
  useAuthStore.getState().setProfile(profile);
}

export function clearMockAuthSession(options: { clearProfile?: boolean } = {}) {
  useAuthStore.getState().clearSession(options);
}
