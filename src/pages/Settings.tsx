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
  getModelSettings,
  getRagSettings,
  updateRagSettings,
  type ModelSettingsResponse,
  type RagSettingsResponse,
} from "@/api/settings";
import { AccountProfileSection } from "@/components/settings/account-profile-section";
import { DangerZoneSection } from "@/components/settings/danger-zone-section";
import { ModelSettingsSection } from "@/components/settings/model-settings-section";
import { RagSettingsSection } from "@/components/settings/rag-settings-section";
import { normalizeRagSettings } from "@/components/settings/settings-rag";
import { useAuthStore } from "@/store/auth";

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
  rag: string;
};

type SectionLoading = {
  profile: boolean;
  model: boolean;
  rag: boolean;
};

export default function Settings() {
  const navigate = useNavigate();
  const syncCurrentUser = useAuthStore((state) => state.syncCurrentUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const handledUnauthorizedRef = useRef(false);
  const [currentUser, setCurrentUser] = useState<CurrentUserResponse | null>(
    null,
  );
  const [modelSettings, setModelSettings] =
    useState<ModelSettingsResponse | null>(null);
  const [ragSettings, setRagSettings] = useState<RagSettingsResponse | null>(
    null,
  );
  const [loading, setLoading] = useState<SectionLoading>({
    profile: true,
    model: true,
    rag: true,
  });
  const [errors, setErrors] = useState<SectionErrors>({
    profile: "",
    model: "",
    rag: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
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
    void Promise.all([loadProfile(), loadModelSettings(), loadRagSettings()]);
  }, [loadModelSettings, loadProfile, loadRagSettings]);

  async function handleSaveProfile(email: string | null) {
    setSavingProfile(true);

    try {
      const updatedUser = await updateCurrentUser({ email });
      setCurrentUser(updatedUser);
      syncCurrentUser(updatedUser);
      toast.success("邮箱已保存");
    } catch (error) {
      if (isUnauthorized(error)) {
        handleUnauthorized();
        return;
      }

      toast.error(getErrorMessage(error, "邮箱保存失败，请稍后重试。"));
    } finally {
      setSavingProfile(false);
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
        onRetry={loadProfile}
        onSave={handleSaveProfile}
        onLogout={() => {
          clearSession();
          navigate("/login", { replace: true });
        }}
      />

      <ModelSettingsSection
        settings={modelSettings}
        loading={loading.model}
        error={errors.model}
        onRetry={loadModelSettings}
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
