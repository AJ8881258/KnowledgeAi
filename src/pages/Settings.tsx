import { useCallback, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import {
  deleteCurrentUser,
  getCurrentUser,
  updateCurrentUser,
  type CurrentUserResponse,
} from "@/api/auth";
import {
  fetchModelList,
  getModelSettings,
  getRagSettings,
  getUserPreferences,
  updateModelSettings,
  updateRagSettings,
  updateUserPreferences,
  type FetchModelListRequest,
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
  const [savingModel, setSavingModel] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [savingRag, setSavingRag] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

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
          "语言和时区加载失败，请稍后重试。",
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

  async function handleSaveProfile(
    email: string | null,
    nextPreferences: UserPreferenceResponse,
    changes: { emailChanged: boolean; preferencesChanged: boolean },
  ) {
    if (!changes.emailChanged && !changes.preferencesChanged) {
      return;
    }

    setSavingProfile(true);
    if (changes.preferencesChanged) {
      setSavingPreferences(true);
    }

    try {
      if (changes.emailChanged) {
        const updatedUser = await updateCurrentUser({ email });
        setCurrentUser(updatedUser);
        syncCurrentUser(updatedUser);
      }

      if (changes.preferencesChanged) {
        const updatedPreferences = await updateUserPreferences(nextPreferences);
        setPreferences(updatedPreferences);
        setChatTimezone(updatedPreferences.timezone);
        void refreshTodayUsage(updatedPreferences.timezone);
      }

      toast.success("账号资料已保存");
    } catch (error) {
      if (isUnauthorized(error)) {
        handleUnauthorized();
        return;
      }

      toast.error(getErrorMessage(error, "账号资料保存失败，请稍后重试。"));
    } finally {
      setSavingProfile(false);
      if (changes.preferencesChanged) {
        setSavingPreferences(false);
      }
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
        getErrorMessage(error, "模型列表获取失败，请检查 Base URL 和 API Key。"),
      );
    } finally {
      setFetchingModels(false);
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

  return (
    <div className="flex w-full flex-col gap-4 p-3 text-slate-900 lg:p-4">
      <AccountProfileSection
        key={currentUser ? `${currentUser.id}-${currentUser.email ?? ""}` : "empty-user"}
        user={currentUser}
        loading={loading.profile}
        error={errors.profile}
        saving={savingProfile}
        preferences={preferences}
        preferencesLoading={loading.preferences}
        preferencesError={errors.preferences}
        savingPreferences={savingPreferences}
        browserTimezone={browserTimezoneRef.current}
        onRetry={loadProfile}
        onSave={handleSaveProfile}
        onRetryPreferences={loadPreferences}
        onLogout={() => {
          clearSession();
          navigate("/login", { replace: true });
        }}
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
        modelOptions={modelOptions}
        modelFetchError={modelFetchError}
        onRetry={loadModelSettings}
        onFetchModels={handleFetchModels}
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
  );
}
