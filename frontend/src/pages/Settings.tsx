import { useCallback, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import {
  deleteCurrentUser,
  getCurrentUser,
  selectCurrentUserAvatarPreset,
  updateCurrentUser,
  uploadCurrentUserAvatar,
  type CurrentUserResponse,
  type DefaultAvatarPresetId,
  type UpdateCurrentUserRequest,
} from "@/api/auth";
import {
  fetchModelList,
  getModelSettings,
  getRagSettings,
  getUserPreferences,
  testModelConnection,
  updateModelSettings,
  updateRagSettings,
  updateUserTimezone,
  type FetchModelListRequest,
  type ModelConnectionTestRequest,
  type ModelConnectionTestResponse,
  type ModelListItem,
  type ModelSettingsResponse,
  type RagSettingsResponse,
  type UpdateModelSettingsRequest,
  type UserPreferenceResponse,
} from "@/api/settings";
import { AccountProfileSection } from "@/components/settings/account-profile-section";
import { DangerZoneSection } from "@/components/settings/danger-zone-section";
import { ModelSettingsSection } from "@/components/settings/model-settings-section";
import { RagSettingsSection } from "@/components/settings/rag-settings-section";
import { normalizeRagSettings } from "@/components/settings/settings-rag";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuthStore } from "@/store/auth";
import { useChatStatusStore } from "@/store/chat-status";

function getErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    const responseMessage = error.response?.data?.message;

    if (typeof responseMessage === "string" && responseMessage.trim()) {
      return responseMessage;
    }

    if (!error.response) {
      return "无法连接后端服务，请确认后端已启动。";
    }
  }

  return fallback;
}

function normalizeAvatarUploadError(error: unknown) {
  const message = getErrorMessage(error, "头像上传失败，请稍后重试。");

  if (/avatar storage is not configured/i.test(message)) {
    return "头像上传服务暂不可用，请先选择默认头像。";
  }

  return sanitizeSensitiveMessage(message);
}

function sanitizeSensitiveMessage(message: string) {
  return message
    .replace(
      /authorization\s*:\s*bearer\s+[^\s,;]+/gi,
      "Authorization: Bearer ***",
    )
    .replace(/bearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, "Bearer ***")
    .replace(/sk-[A-Za-z0-9._-]{8,}/gi, "sk-***")
    .replace(/api[_-]?key\s*[:=]\s*[^\s,;]+/gi, "API Key ***")
    .replace(/https?:\/\/[^\s"'<>]+/gi, "[Base URL]");
}

function getSafeErrorMessage(error: unknown, fallback: string) {
  return sanitizeSensitiveMessage(getErrorMessage(error, fallback));
}

function isUnauthorized(error: unknown) {
  return isAxiosError(error) && error.response?.status === 401;
}

type SectionErrors = {
  profile: string;
  model: string;
  preferences: string;
  rag: string;
};

type SectionLoading = {
  profile: boolean;
  model: boolean;
  preferences: boolean;
  rag: boolean;
};

function getBrowserTimezone() {
  if (typeof Intl === "undefined") {
    return "Asia/Shanghai";
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai";
}

export default function Settings() {
  const navigate = useNavigate();
  const syncCurrentUser = useAuthStore((state) => state.syncCurrentUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setChatTimezone = useChatStatusStore((state) => state.setTimezone);
  const refreshTodayUsage = useChatStatusStore(
    (state) => state.refreshTodayUsage,
  );
  const handledUnauthorizedRef = useRef(false);
  const browserTimezoneRef = useRef(getBrowserTimezone());
  const [currentUser, setCurrentUser] = useState<CurrentUserResponse | null>(
    null,
  );
  const [modelSettings, setModelSettings] =
    useState<ModelSettingsResponse | null>(null);
  const [modelOptions, setModelOptions] = useState<ModelListItem[]>([]);
  const [modelFetchError, setModelFetchError] = useState("");
  const [preferences, setPreferences] =
    useState<UserPreferenceResponse | null>(null);
  const [ragSettings, setRagSettings] = useState<RagSettingsResponse | null>(
    null,
  );
  const [loading, setLoading] = useState<SectionLoading>({
    profile: true,
    model: true,
    preferences: true,
    rag: true,
  });
  const [errors, setErrors] = useState<SectionErrors>({
    profile: "",
    model: "",
    preferences: "",
    rag: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [savingModel, setSavingModel] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [testingModel, setTestingModel] = useState(false);
  const [savingRag, setSavingRag] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const handleUnauthorized = useCallback(() => {
    if (handledUnauthorizedRef.current) {
      return;
    }

    handledUnauthorizedRef.current = true;
    toast.error("登录状态已失效，请重新登录");
    clearSession();
    navigate("/login", { replace: true });
  }, [clearSession, navigate]);

  const loadProfile = useCallback(async () => {
    setLoading((current) => ({ ...current, profile: true }));
    setErrors((current) => ({ ...current, profile: "" }));

    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      syncCurrentUser(user);
    } catch (error) {
      if (isUnauthorized(error)) {
        handleUnauthorized();
        return;
      }

      setErrors((current) => ({
        ...current,
        profile: getErrorMessage(error, "账号资料加载失败，请稍后重试。"),
      }));
    } finally {
      setLoading((current) => ({ ...current, profile: false }));
    }
  }, [handleUnauthorized, syncCurrentUser]);

  const loadModelSettings = useCallback(async () => {
    setLoading((current) => ({ ...current, model: true }));
    setErrors((current) => ({ ...current, model: "" }));
    setModelFetchError("");

    try {
      setModelSettings(await getModelSettings());
    } catch (error) {
      if (isUnauthorized(error)) {
        handleUnauthorized();
        return;
      }

      setErrors((current) => ({
        ...current,
        model: getErrorMessage(error, "模型配置状态加载失败，请稍后重试。"),
      }));
    } finally {
      setLoading((current) => ({ ...current, model: false }));
    }
  }, [handleUnauthorized]);

  const loadPreferences = useCallback(async () => {
    setLoading((current) => ({ ...current, preferences: true }));
    setErrors((current) => ({ ...current, preferences: "" }));

    try {
      const nextPreferences = await getUserPreferences();

      setPreferences(nextPreferences);
      setChatTimezone(nextPreferences.timezone);
      void refreshTodayUsage(nextPreferences.timezone);
    } catch (error) {
      if (isUnauthorized(error)) {
        handleUnauthorized();
        return;
      }

      setErrors((current) => ({
        ...current,
        preferences: getErrorMessage(
          error,
          "时区加载失败，请稍后重试。",
        ),
      }));
    } finally {
      setLoading((current) => ({ ...current, preferences: false }));
    }
  }, [handleUnauthorized, refreshTodayUsage, setChatTimezone]);

  const loadRagSettings = useCallback(async () => {
    setLoading((current) => ({ ...current, rag: true }));
    setErrors((current) => ({ ...current, rag: "" }));

    try {
      setRagSettings(normalizeRagSettings(await getRagSettings()));
    } catch (error) {
      if (isUnauthorized(error)) {
        handleUnauthorized();
        return;
      }

      setErrors((current) => ({
        ...current,
        rag: getErrorMessage(error, "RAG 参数加载失败，请稍后重试。"),
      }));
    } finally {
      setLoading((current) => ({ ...current, rag: false }));
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    void Promise.all([
      loadProfile(),
      loadModelSettings(),
      loadPreferences(),
      loadRagSettings(),
    ]);
  }, [loadModelSettings, loadPreferences, loadProfile, loadRagSettings]);

  async function handleSaveProfile(request: UpdateCurrentUserRequest) {
    setSavingProfile(true);

    try {
      const updatedUser = await updateCurrentUser(request);

      setCurrentUser(updatedUser);
      syncCurrentUser(updatedUser);
      toast.success("账号资料已保存");
    } catch (error) {
      if (isUnauthorized(error)) {
        handleUnauthorized();
        throw new Error("登录状态已失效，请重新登录", { cause: error });
      }

      throw new Error(getErrorMessage(error, "账号资料保存失败，请稍后重试。"), {
        cause: error,
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleUploadAvatar(file: File) {
    setUploadingAvatar(true);

    try {
      const updatedUser = await uploadCurrentUserAvatar(file);

      setCurrentUser(updatedUser);
      syncCurrentUser(updatedUser);
      toast.success("头像已上传");
    } catch (error) {
      if (isUnauthorized(error)) {
        handleUnauthorized();
        throw new Error("登录状态已失效，请重新登录", { cause: error });
      }

      throw new Error(normalizeAvatarUploadError(error), {
        cause: error,
      });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSelectAvatarPreset(presetId: DefaultAvatarPresetId) {
    setSavingAvatar(true);

    try {
      const updatedUser = await selectCurrentUserAvatarPreset(presetId);

      setCurrentUser(updatedUser);
      syncCurrentUser(updatedUser);
      toast.success("头像已保存");
    } catch (error) {
      if (isUnauthorized(error)) {
        handleUnauthorized();
        throw new Error("登录状态已失效，请重新登录", { cause: error });
      }

      throw new Error(getErrorMessage(error, "头像保存失败，请稍后重试。"), {
        cause: error,
      });
    } finally {
      setSavingAvatar(false);
    }
  }

  async function handleSaveTimezone(timezone: string) {
    setSavingPreferences(true);

    try {
      const updatedPreferences = await updateUserTimezone(timezone, preferences);

      setPreferences(updatedPreferences);
      setChatTimezone(updatedPreferences.timezone);
      await refreshTodayUsage(updatedPreferences.timezone);
      toast.success("时区偏好已保存");
    } catch (error) {
      if (isUnauthorized(error)) {
        handleUnauthorized();
        throw new Error("登录状态已失效，请重新登录", { cause: error });
      }

      throw new Error(getErrorMessage(error, "时区保存失败，请稍后重试。"), {
        cause: error,
      });
    } finally {
      setSavingPreferences(false);
    }
  }

  async function handleFetchModels(request: FetchModelListRequest) {
    setFetchingModels(true);
    setModelFetchError("");

    try {
      const response = await fetchModelList(request);

      setModelOptions(response.models);
      if (response.models.length === 0) {
        setModelFetchError("服务返回的模型列表为空，可以手动输入模型名称。");
      } else {
        toast.success(`已获取 ${response.models.length} 个模型`);
      }
    } catch (error) {
      if (isUnauthorized(error)) {
        handleUnauthorized();
        return;
      }

      setModelFetchError(
        getSafeErrorMessage(error, "模型列表获取失败，请检查 Base URL 和 API Key。"),
      );
    } finally {
      setFetchingModels(false);
    }
  }

  async function handleTestModelConnection(
    request: ModelConnectionTestRequest,
  ): Promise<ModelConnectionTestResponse | null> {
    setTestingModel(true);

    try {
      const response = await testModelConnection(request);

      return {
        ...response,
        message: sanitizeSensitiveMessage(response.message),
      };
    } catch (error) {
      if (isUnauthorized(error)) {
        handleUnauthorized();
        return null;
      }

      return {
        success: false,
        message: getSafeErrorMessage(
          error,
          "模型测试失败，请检查 Base URL、API Key 和模型权限。",
        ),
      };
    } finally {
      setTestingModel(false);
    }
  }

  async function handleSaveModelSettings(request: UpdateModelSettingsRequest) {
    setSavingModel(true);

    try {
      const updatedSettings = await updateModelSettings(request);

      setModelSettings(updatedSettings);
      toast.success("模型配置已保存");
      return true;
    } catch (error) {
      if (isUnauthorized(error)) {
        handleUnauthorized();
        return false;
      }

      toast.error(
        getErrorMessage(error, "模型配置保存失败，请检查配置后重试。"),
      );
      return false;
    } finally {
      setSavingModel(false);
    }
  }

  async function handleSaveRagSettings(settings: RagSettingsResponse) {
    setSavingRag(true);

    try {
      const updatedSettings = await updateRagSettings(settings);
      setRagSettings(normalizeRagSettings(updatedSettings));
      toast.success("RAG 参数已保存，后续 RAG 问答会使用这些设置。");
    } catch (error) {
      if (isUnauthorized(error)) {
        handleUnauthorized();
        return;
      }

      toast.error(getErrorMessage(error, "RAG 参数保存失败，请稍后重试。"));
    } finally {
      setSavingRag(false);
    }
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);

    try {
      await deleteCurrentUser();
      toast.success("账号已删除");
      clearSession({ clearProfile: true });
      navigate("/login", { replace: true });
    } catch (error) {
      if (isUnauthorized(error)) {
        handleUnauthorized();
        return;
      }

      toast.error(getErrorMessage(error, "删除账号失败，请稍后重试。"));
    } finally {
      setDeletingAccount(false);
    }
  }

  function handleLogout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <>
      <div className="flex w-full min-w-0 flex-col gap-4 p-3 text-slate-900 lg:p-4">
      <AccountProfileSection
        user={currentUser}
        loading={loading.profile}
        error={errors.profile}
        savingProfile={savingProfile}
        savingAvatar={savingAvatar}
        uploadingAvatar={uploadingAvatar}
        savingPreferences={savingPreferences}
        preferences={preferences}
        preferencesLoading={loading.preferences}
        preferencesError={errors.preferences}
        browserTimezone={browserTimezoneRef.current}
        onRetry={loadProfile}
        onSaveProfile={handleSaveProfile}
        onSaveTimezone={handleSaveTimezone}
        onUploadAvatar={handleUploadAvatar}
        onSelectAvatarPreset={handleSelectAvatarPreset}
        onRetryPreferences={loadPreferences}
        onLogout={() => setLogoutDialogOpen(true)}
      />

      <ModelSettingsSection
        key={
          modelSettings
            ? `${modelSettings.configured}-${modelSettings.model ?? ""}-${modelSettings.baseUrl ?? ""}-${modelSettings.timeoutSeconds ?? ""}-${modelSettings.apiKeyConfigured}-${modelSettings.updatedAt ?? ""}`
            : "empty-model-settings"
        }
        settings={modelSettings}
        loading={loading.model}
        error={errors.model}
        saving={savingModel}
        fetchingModels={fetchingModels}
        testingModel={testingModel}
        modelOptions={modelOptions}
        modelFetchError={modelFetchError}
        onRetry={loadModelSettings}
        onFetchModels={handleFetchModels}
        onTestModel={handleTestModelConnection}
        onSave={handleSaveModelSettings}
      />

      <RagSettingsSection
        key={
          ragSettings
            ? `${ragSettings.topK}-${ragSettings.maxContextChunks}-${ragSettings.temperature}`
            : "empty-rag-settings"
        }
        settings={ragSettings}
        loading={loading.rag}
        error={errors.rag}
        saving={savingRag}
        onRetry={loadRagSettings}
        onSave={handleSaveRagSettings}
      />

      {currentUser && (
        <DangerZoneSection
          username={currentUser.username}
          deleting={deletingAccount}
          onDeleteAccount={handleDeleteAccount}
        />
      )}
      </div>

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent className="rounded-[8px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-sans text-lg normal-case tracking-normal">
              确认退出登录？
            </AlertDialogTitle>
            <AlertDialogDescription>
              退出后会清除当前登录状态，并返回登录页。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction type="button" onClick={handleLogout}>
              确认退出
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
