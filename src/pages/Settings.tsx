import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { CircleAlert, LogOut, Pencil } from "lucide-react";

import MyAvatar from "@/assets/mypic.jpg";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RagControl, ProfileEditDialog, SectionCard, SettingsSelect, TextField } from "@/components/settings/settings-components";
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
  const [modelSettings, setModelSettings] = useState({
    provider: "OpenAI Compatible",
    baseUrl: "由后端环境变量配置",
    chatModel: "由后端配置决定",
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

  return (
    <div className="flex w-full flex-col gap-4 p-3 text-slate-900 lg:p-4">
      <section className="flex min-w-0 flex-col gap-4">
            <SectionCard>
              <CardHeader>
                <CardTitle className="font-sans text-base normal-case tracking-normal">
                  账号信息
                </CardTitle>
                <CardDescription>
                  管理当前登录显示资料、语言和时区偏好。
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
                  模型调用由后端服务配置。这里仅展示当前前端可见的配置说明，不保存真实密钥。
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 xl:grid-cols-[1fr_300px]">
                <div className="grid min-w-0 gap-4 md:grid-cols-2">
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
                    options={["由后端配置决定"]}
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
                    readOnly
                    onChange={(baseUrl) =>
                      setModelSettings((current) => ({ ...current, baseUrl }))
                    }
                  />
                  <TextField
                    id="api-key"
                    label="API Key"
                    value="不在前端展示或保存"
                    type="text"
                    readOnly
                  />
                </div>
                <div className="rounded-[8px] border border-orange-200 bg-orange-50/50 p-4">
                  <div className="flex items-start gap-2 text-sm text-orange-700">
                    <CircleAlert aria-hidden="true" className="mt-0.5" />
                    <span>
                      当前阶段没有前端模型配置保存接口。模型不可用、超时或密钥错误会在 Chat 发送问题时由后端返回错误提示。
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
                  本区是前端本地偏好草稿，当前后端 RAG 参数仍以服务端实现为准。
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
                  账号操作
                </CardTitle>
                <CardDescription>
                  当前前端已接入登录态。账号删除和数据导出尚未提供后端接口，因此不在页面中模拟。
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button type="button" variant="outline" size="sm" onClick={logout}>
                  <LogOut data-icon="inline-start" />
                  退出登录
                </Button>
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
