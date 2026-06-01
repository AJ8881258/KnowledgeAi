import { http } from "@/api/http";

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  id: number;
  username: string;
  role: string;
  phone?: string | null;
  tokenType: string;
  accessToken: string;
  avatarUrl?: string | null;
  avatarConfigured?: boolean;
  avatarStorageConfigured?: boolean;
  avatarSource?: AvatarSource;
  avatarPresetId?: DefaultAvatarPresetId | null;
};

export type RegisterRequest = {
  username: string;
  password: string;
};

export type RegisterResponse = {
  id: number;
  username: string;
  role: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  avatarConfigured?: boolean;
  avatarStorageConfigured?: boolean;
  avatarSource?: AvatarSource;
  avatarPresetId?: DefaultAvatarPresetId | null;
};

export type ResetPasswordRequest = {
  username: string;
  newPassword: string;
};

export type ResetPasswordResponse = {
  message: string;
};

export type AvatarSource = "UPLOAD" | "PRESET" | "NONE";

export type DefaultAvatarPresetId =
  | "blue"
  | "green"
  | "coral"
  | "violet"
  | "mint"
  | "rose"
  | "amber"
  | "slate";

export type AvatarPresetId = DefaultAvatarPresetId;

export type UserResponse = {
  id: number;
  username: string;
  role: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  avatarConfigured: boolean;
  avatarStorageConfigured: boolean;
  avatarSource: AvatarSource;
  avatarPresetId: DefaultAvatarPresetId | null;
};

export type CurrentUserResponse = UserResponse;

export type UpdateCurrentUserRequest = {
  username?: string;
  email?: string | null;
  phone?: string | null;
};

export async function login(request: LoginRequest) {
  const response = await http.post<LoginResponse>("/auth/login", request);

  return response.data;
}

export async function register(request: RegisterRequest) {
  const response = await http.post<RegisterResponse>("/auth/register", request);

  return response.data;
}

export async function getCurrentUser() {
  const response = await http.get<CurrentUserResponse>("/auth/me");

  return response.data;
}

export async function updateCurrentUser(request: UpdateCurrentUserRequest) {
  const response = await http.patch<CurrentUserResponse>("/auth/me", request);

  return response.data;
}

export async function uploadCurrentUserAvatar(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await http.post<CurrentUserResponse>(
    "/auth/me/avatar",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
}

export async function deleteCurrentUserAvatar() {
  const response = await http.delete<CurrentUserResponse>("/auth/me/avatar");

  return response.data;
}

export async function selectCurrentUserAvatarPreset(
  avatarPresetId: DefaultAvatarPresetId,
) {
  const response = await http.patch<CurrentUserResponse>(
    "/auth/me/avatar-preset",
    { avatarPresetId },
  );

  return response.data;
}

export async function deleteCurrentUser() {
  await http.delete("/auth/me");
}

export async function resetPassword(request: ResetPasswordRequest) {
  const response = await http.post<ResetPasswordResponse>(
    "/auth/reset-password",
    request,
  );

  return response.data;
}
