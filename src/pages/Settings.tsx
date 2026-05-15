import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { CircleAlert, Download, Eye, EyeOff, LogOut, Pencil, ShieldAlert, Trash2, Wifi } from "lucide-react";

import MyAvatar from "@/assets/mypic.jpg";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RagControl, ProfileEditDialog, SectionCard, SettingsSelect, StatusPill, TextField } from "@/components/settings/settings-components";
import { clampNumber, persistRagSettings, ragControlConfig, readStoredRagSettings, type RagNumberKey, type RagSettings } from "@/components/settings/settings-rag";
import { clearMockAuthSession, getMockUserProfile, updateMockAuthProfile, type MockUserProfile } from "@/lib/mock-auth";

export default function Settings() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<MockUserProfile>(() =>
    getMockUserProfile(),
  );
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [language, setLanguage] = useState("简体中文");
  const [timezone, setTimezone] = useState("Asia/Hong_Kong");
  const [showApiKey, setShowApiKey] = useState(false);
  const [connectionState, setConnectionState] = useState<
    "Connected" | "Testing..." | "Connected just now"
  >("Connected");
  const [modelSettings, setModelSettings] = useState({
    provider: "OpenAI Compatible",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "sk-knowflow-local-secret",
    chatModel: "deepseek-chat",
    embeddingModel: "text-embedding-3-small",
  });
  const [ragSettings, setRagSettings] = useState<RagSettings>(() =>
    readStoredRagSettings(),
  );

  function saveProfile(nextProfile: MockUserProfile) {
    setProfile(nextProfile);
    updateMockAuthProfile(nextProfile);
    toast.success("资料已更新");
  }

  function logout() {
    clearMockAuthSession();
    navigate("/login", { replace: true });
  }

  function testConnection() {
    setConnectionState("Testing...");
    window.setTimeout(() => {
      setConnectionState("Connected just now");
      toast.success("连接测试完成（前端模拟）");
    }, 500);
  }

  function updateRagValue(key: RagNumberKey, value: number) {
    const config = ragControlConfig[key];
    const nextValue = clampNumber(value, config.min, config.max);

    setRagSettings((current) => {
      const nextSettings = {
        ...current,
        [key]: nextValue,
      };

      persistRagSettings(nextSettings);
      return nextSettings;
    });
  }

  function updateRagMetric(value: string) {
    const nextMetric: RagSettings["similarityMetric"] =
      value === "dot" || value === "euclidean" ? value : "cosine";

    setRagSettings((current) => {
      const nextSettings = {
        ...current,
        similarityMetric: nextMetric,
      };

      persistRagSettings(nextSettings);
      return nextSettings;
    });
  }

  function confirmExportData() {
    toast.success("数据导出已模拟完成，未生成真实文件");
  }

  function confirmDeleteAccount() {
    clearMockAuthSession({ clearProfile: true });
    toast.success("账号删除已模拟完成");
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex w-full flex-col gap-4 p-3 text-slate-900 lg:p-4">
      <section className="flex min-w-0 flex-col gap-4">
            <SectionCard>
              <CardHeader>
                <CardTitle className="font-sans text-base normal-case tracking-normal">
                  账号信息
                </CardTitle>
                <CardDescription>
                  管理个人资料、语言、时区和当前前端演示登录态。
                </CardDescription>
                <CardAction className="hidden gap-3 sm:flex">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setProfileDialogOpen(true)}
                  >
                    <Pencil data-icon="inline-start" />
                    编辑资料
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={logout}>
                    <LogOut data-icon="inline-start" />
                    退出登录
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Avatar className="size-16">
                    <AvatarImage src={MyAvatar} />
                    <AvatarFallback>
                      {profile.displayName.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-semibold text-slate-900">
                      {profile.displayName}
                    </div>
                    <div className="text-sm text-slate-500">
                      {profile.email}
                    </div>
                    <span className="mt-2 inline-flex rounded-[5px] bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600">
                      Student Developer
                    </span>
                  </div>
                  <div className="flex gap-2 sm:hidden">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setProfileDialogOpen(true)}
                    >
                      <Pencil data-icon="inline-start" />
                      编辑资料
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={logout}
                    >
                      <LogOut data-icon="inline-start" />
                      退出登录
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <TextField
                    id="display-name"
                    label="显示名称"
                    value={profile.displayName}
                    readOnly
                  />
                  <TextField
                    id="email"
                    label="邮箱"
                    value={profile.email}
                    readOnly
                  />
                  <SettingsSelect
                    label="语言偏好"
                    value={language}
                    options={["简体中文", "English", "日本語"]}
                    onChange={setLanguage}
                  />
                  <SettingsSelect
                    label="时区"
                    value={timezone}
                    options={["Asia/Hong_Kong", "Asia/Shanghai", "UTC"]}
                    onChange={setTimezone}
                  />
                </div>
              </CardContent>
            </SectionCard>

            <SectionCard>
              <CardHeader>
                <CardTitle className="font-sans text-base normal-case tracking-normal">
                  模型配置
                </CardTitle>
                <CardDescription>
                  当前为前端演示配置，用于展示后续模型接入表单。
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 xl:grid-cols-[1fr_1fr_auto]">
                <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:col-span-2">
                  <SettingsSelect
                    label="LLM Provider"
                    value={modelSettings.provider}
                    options={[
                      "OpenAI Compatible",
                      "OpenAI",
                      "Azure OpenAI",
                      "Local Ollama",
                    ]}
                    onChange={(provider) =>
                      setModelSettings((current) => ({ ...current, provider }))
                    }
                  />
                  <SettingsSelect
                    label="Chat Model"
                    value={modelSettings.chatModel}
                    options={["deepseek-chat", "gpt-4.1-mini", "qwen-plus"]}
                    onChange={(chatModel) =>
                      setModelSettings((current) => ({
                        ...current,
                        chatModel,
                      }))
                    }
                  />
                  <TextField
                    id="base-url"
                    label="Base URL"
                    value={modelSettings.baseUrl}
                    onChange={(baseUrl) =>
                      setModelSettings((current) => ({ ...current, baseUrl }))
                    }
                  />
                  <SettingsSelect
                    label="Embedding Model"
                    value={modelSettings.embeddingModel}
                    options={[
                      "text-embedding-3-small",
                      "text-embedding-3-large",
                      "bge-m3",
                    ]}
                    onChange={(embeddingModel) =>
                      setModelSettings((current) => ({
                        ...current,
                        embeddingModel,
                      }))
                    }
                  />
                  <TextField
                    id="api-key"
                    label="API Key"
                    value={
                      showApiKey
                        ? modelSettings.apiKey
                        : "••••••••••••••••••••••••••"
                    }
                    type="text"
                    readOnly={!showApiKey}
                    onChange={(apiKey) =>
                      setModelSettings((current) => ({ ...current, apiKey }))
                    }
                    action={
                      <button
                        type="button"
                        aria-label={showApiKey ? "隐藏 API Key" : "显示 API Key"}
                        data-testid="api-key-visibility-toggle"
                        onClick={() => setShowApiKey((value) => !value)}
                        className="ml-2 text-slate-500 transition-colors hover:text-slate-900"
                      >
                        {showApiKey ? <EyeOff /> : <Eye />}
                      </button>
                    }
                  />
                  <div className="flex flex-col gap-2">
                    <span className="text-sm text-slate-700">连接状态</span>
                    <div className="flex h-10 items-center">
                      <StatusPill
                        status={connectionState}
                        tone={
                          connectionState === "Testing..." ? "orange" : "green"
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={testConnection}
                    data-testid="test-connection-button"
                    disabled={connectionState === "Testing..."}
                    className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <Wifi data-icon="inline-start" />
                    测试连接
                  </Button>
                </div>
                <div className="xl:col-span-3">
                  <div className="flex items-start gap-2 text-sm text-orange-500">
                    <CircleAlert aria-hidden="true" className="mt-0.5" />
                    <span>
                      当前为前端演示配置，正式后端版本应由服务端环境变量管理 API Key。
                    </span>
                  </div>
                </div>
              </CardContent>
            </SectionCard>

            <SectionCard>
              <CardHeader>
                <CardTitle className="font-sans text-base normal-case tracking-normal">
                  RAG 参数
                </CardTitle>
                <CardDescription>
                  调整检索窗口、上下文重叠和引用展示数量，参数会保存到本地。
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 xl:grid-cols-[1fr_260px]">
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  {(
                    [
                      "chunkSize",
                      "chunkOverlap",
                      "topK",
                      "citationLimit",
                    ] as RagNumberKey[]
                  ).map((key) => (
                    <RagControl
                      key={key}
                      label={ragControlConfig[key].label}
                      value={ragSettings[key]}
                      min={ragControlConfig[key].min}
                      max={ragControlConfig[key].max}
                      step={ragControlConfig[key].step}
                      onChange={(value) => updateRagValue(key, value)}
                    />
                  ))}
                  <SettingsSelect
                    label="相似度度量"
                    value={ragSettings.similarityMetric}
                    options={["cosine", "dot", "euclidean"]}
                    onChange={updateRagMetric}
                  />
                </div>
                <div className="rounded-[6px] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">
                    参数说明
                  </div>
                  <ul className="mt-3 flex list-disc flex-col gap-2 pl-4 text-xs leading-5 text-slate-600">
                    <li>更大的 Chunk Size 提升上下文完整性</li>
                    <li>适当的 Overlap 有助于减少信息丢失</li>
                    <li>Top K 越大，召回越高但成本也越高</li>
                    <li>Citation Limit 控制展示的引用来源数量</li>
                  </ul>
                </div>
              </CardContent>
            </SectionCard>

            <SectionCard className="border-red-200 bg-red-50/20">
              <CardHeader>
                <CardTitle className="font-sans text-base text-red-700 normal-case tracking-normal">
                  危险操作
                </CardTitle>
                <CardDescription>
                  当前仅执行前端本地模拟，不会请求后端或删除真实数据。
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      <Download data-icon="inline-start" />
                      导出数据
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-[8px]">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-sans text-lg normal-case tracking-normal">
                        确认导出数据？
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        当前仅执行前端本地模拟，不会生成真实文件，也不会请求后端服务。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        type="button"
                        onClick={confirmExportData}
                      >
                        确认导出
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" size="sm">
                      <Trash2 data-icon="inline-start" />
                      删除账号
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-[8px]">
                    <AlertDialogHeader>
                      <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-[8px] bg-red-100 text-red-600 sm:mx-0">
                        <ShieldAlert aria-hidden="true" />
                      </div>
                      <AlertDialogTitle className="font-sans text-lg normal-case tracking-normal">
                        确认删除账号？
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        当前仅执行前端本地模拟。确认后会清除本地 mock 登录态和账号资料缓存，并返回登录页。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        type="button"
                        variant="destructive"
                        onClick={confirmDeleteAccount}
                      >
                        确认删除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </SectionCard>
      </section>

      {profileDialogOpen && (
        <ProfileEditDialog
          open={profileDialogOpen}
          profile={profile}
          onOpenChange={setProfileDialogOpen}
          onSave={saveProfile}
        />
      )}
    </div>
  );
}
