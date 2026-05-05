import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";

import dashboardPreview from "@/assets/login-carousel/dashboard.png";
import knowledgeBasesPreview from "@/assets/login-carousel/knowledge-bases.png";
import documentsPreview from "@/assets/login-carousel/documents.png";
import chatPreview from "@/assets/login-carousel/chat.png";
import settingsPreview from "@/assets/login-carousel/settings.png";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const AUTO_SLIDE_DELAY_MS = 3600;
const RECENT_AUTO_ADVANCE_MS = 700;
const VALID_LOGIN_ACCOUNT = "admin";
const VALID_LOGIN_PASSWORD = "admin";

const carouselSlides = [
  {
    image: dashboardPreview,
    alt: "KnowFlow AI 首页数据概览界面截图",
    label: "首页",
  },
  {
    image: knowledgeBasesPreview,
    alt: "KnowFlow AI 知识库管理界面截图",
    label: "知识库",
  },
  {
    image: documentsPreview,
    alt: "KnowFlow AI 文档管理界面截图",
    label: "文档",
  },
  {
    image: chatPreview,
    alt: "KnowFlow AI 问答对话界面截图",
    label: "问答",
  },
  {
    image: settingsPreview,
    alt: "KnowFlow AI 设置界面截图",
    label: "设置",
  },
];

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-blue-600 text-lg font-bold text-white shadow-[0_8px_22px_rgba(37,99,235,0.25)]">
        KF
      </div>
      <span className="font-semibold text-slate-950">KnowFlow AI</span>
    </div>
  );
}

function LoginVisualCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [autoResetKey, setAutoResetKey] = useState(0);
  const timerRef = useRef<number | null>(null);
  const timerGenerationRef = useRef(0);
  const lastAutoAdvanceAtRef = useRef(0);

  const clearAutoAdvance = useCallback(() => {
    timerGenerationRef.current += 1;

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const generation = timerGenerationRef.current + 1;
    timerGenerationRef.current = generation;

    timerRef.current = window.setTimeout(() => {
      if (timerGenerationRef.current !== generation) {
        return;
      }

      timerRef.current = null;
      lastAutoAdvanceAtRef.current = Date.now();
      setActiveSlide((current) => (current + 1) % carouselSlides.length);
    }, AUTO_SLIDE_DELAY_MS);

    return clearAutoAdvance;
  }, [activeSlide, autoResetKey, clearAutoAdvance]);

  const goToSlide = useCallback(
    (
      nextSlide: number | ((current: number) => number),
      options: { coalesceRecentAuto?: boolean } = {},
    ) => {
      clearAutoAdvance();

      if (
        options.coalesceRecentAuto &&
        Date.now() - lastAutoAdvanceAtRef.current < RECENT_AUTO_ADVANCE_MS
      ) {
        setAutoResetKey((current) => current + 1);
        return;
      }

      setActiveSlide((current) => {
        const resolvedSlide =
          typeof nextSlide === "function" ? nextSlide(current) : nextSlide;

        return (resolvedSlide + carouselSlides.length) % carouselSlides.length;
      });
      setAutoResetKey((current) => current + 1);
    },
    [clearAutoAdvance],
  );

  const showPreviousSlide = () => {
    goToSlide((current) => current - 1);
  };

  const showNextSlide = () => {
    goToSlide((current) => current + 1, { coalesceRecentAuto: true });
  };

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <div className="relative w-full max-w-[940px]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.12)]">
          <div className="relative aspect-[16/10] bg-slate-50">
            {carouselSlides.map((slide, index) => (
              <img
                key={slide.label}
                src={slide.image}
                alt={slide.alt}
                className={cn(
                  "absolute inset-0 size-full object-cover transition-opacity duration-500 ease-out",
                  activeSlide === index ? "opacity-100" : "opacity-0",
                )}
              />
            ))}
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          aria-label="上一张截图"
          onPointerDown={clearAutoAdvance}
          onClick={showPreviousSlide}
          className="absolute left-4 top-1/2 size-10 -translate-y-1/2 rounded-full border-slate-200 bg-white/90 p-0 text-slate-700 shadow-lg backdrop-blur hover:bg-white"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          aria-label="下一张截图"
          onPointerDown={clearAutoAdvance}
          onClick={showNextSlide}
          className="absolute right-4 top-1/2 size-10 -translate-y-1/2 rounded-full border-slate-200 bg-white/90 p-0 text-slate-700 shadow-lg backdrop-blur hover:bg-white"
        >
          <ChevronRight className="size-4" />
        </Button>

        <div className="mt-5 flex items-center justify-center gap-2">
          {carouselSlides.map((slide, index) => (
            <button
              key={slide.label}
              type="button"
              aria-label={`切换到${slide.label}截图`}
              onPointerDown={clearAutoAdvance}
              onClick={() => goToSlide(index)}
              className={cn(
                "h-2.5 rounded-full transition-all",
                activeSlide === index ? "w-8 bg-blue-600" : "w-2.5 bg-slate-300",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [account, setAccount] = useState(VALID_LOGIN_ACCOUNT);
  const [password, setPassword] = useState(VALID_LOGIN_PASSWORD);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);

  const submitLogin = (nextAccount: string, nextPassword: string) => {
    if (
      nextAccount.trim() === VALID_LOGIN_ACCOUNT &&
      nextPassword === VALID_LOGIN_PASSWORD
    ) {
      toast.success("登录成功");
      navigate("/");
      return;
    }

    toast.error("登录失败，请检查账号或密码");
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitLogin(account, password);
  };

  const handleDemoLogin = () => {
    setAccount(VALID_LOGIN_ACCOUNT);
    setPassword(VALID_LOGIN_PASSWORD);
    submitLogin(VALID_LOGIN_ACCOUNT, VALID_LOGIN_PASSWORD);
  };

  return (
    <main className="h-dvh overflow-hidden bg-white text-slate-950">
      <div className="grid h-full min-h-0 xl:grid-cols-[minmax(0,1.42fr)_minmax(420px,0.88fr)]">
        <section className="hidden h-dvh min-h-0 flex-col overflow-hidden border-r border-slate-200 bg-slate-50/60 px-8 py-7 xl:flex 2xl:px-12">
          <BrandMark />
          <LoginVisualCarousel />
        </section>

        <section className="flex h-dvh min-h-0 items-center justify-center px-6 py-5 sm:px-10 xl:px-12">
          <div className="flex max-h-full w-full max-w-[432px] flex-col justify-center">
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center gap-5">
                <div className="flex size-12 items-center justify-center rounded-lg bg-blue-600 text-xl font-bold text-white shadow-[0_12px_32px_rgba(37,99,235,0.22)]">
                  KF
                </div>
                <h1 className="text-[30px] font-semibold leading-none text-slate-950">
                  KnowFlow AI
                </h1>
              </div>
              <p className="mt-4 text-base text-slate-500">
                登录你的智能知识库工作台
              </p>
            </div>

            <form className="mt-8 flex flex-col gap-5" onSubmit={handleLogin}>
              <FieldGroup className="gap-5">
                <Field className="gap-2">
                  <FieldLabel
                    htmlFor="email"
                    className="text-sm font-medium normal-case tracking-normal text-slate-950"
                  >
                    账号
                  </FieldLabel>
                  <InputGroup className="h-11 rounded-md border border-slate-300 bg-white px-4 shadow-sm has-[[data-slot=input-group-control]:focus-visible]:border-blue-500 has-[[data-slot=input-group-control]:focus-visible]:ring-4 has-[[data-slot=input-group-control]:focus-visible]:ring-blue-500/10">
                    <InputGroupAddon>
                      <UserRound className="size-4 text-slate-500" />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="email"
                      type="text"
                      value={account}
                      onChange={(event) => setAccount(event.target.value)}
                      placeholder="请输入账号或邮箱"
                      autoComplete="username"
                      className="text-base text-slate-900 placeholder:text-slate-400 md:text-sm"
                    />
                  </InputGroup>
                </Field>

                <Field className="gap-2">
                  <FieldLabel
                    htmlFor="password"
                    className="text-sm font-medium normal-case tracking-normal text-slate-950"
                  >
                    密码
                  </FieldLabel>
                  <InputGroup className="h-11 rounded-md border border-slate-300 bg-white px-4 shadow-sm has-[[data-slot=input-group-control]:focus-visible]:border-blue-500 has-[[data-slot=input-group-control]:focus-visible]:ring-4 has-[[data-slot=input-group-control]:focus-visible]:ring-blue-500/10">
                    <InputGroupAddon>
                      <LockKeyhole className="size-4 text-slate-500" />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="请输入密码"
                      autoComplete="current-password"
                      className="text-base text-slate-900 placeholder:text-slate-400 md:text-sm"
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        aria-label={showPassword ? "隐藏密码" : "显示密码"}
                        onClick={() => setShowPassword((value) => !value)}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff /> : <Eye />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
              </FieldGroup>

              <div className="flex items-center justify-between gap-4">
                <Field orientation="horizontal" className="w-fit gap-3">
                  <Checkbox
                    id="remember"
                    className="rounded-sm border-slate-300 data-checked:border-blue-600 data-checked:bg-blue-600"
                  />
                  <FieldLabel
                    htmlFor="remember"
                    className="text-sm font-normal normal-case tracking-normal text-slate-700"
                  >
                    记住我
                  </FieldLabel>
                </Field>

                <Button
                  type="button"
                  variant="link"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="h-auto p-0 text-sm font-medium normal-case tracking-normal text-blue-600 hover:text-blue-700"
                >
                  忘记密码？
                </Button>
              </div>

              <Button
                type="submit"
                className="h-12 rounded-md bg-blue-600 text-base font-semibold normal-case tracking-normal text-white shadow-[0_14px_30px_rgba(37,99,235,0.22)] hover:bg-blue-700"
              >
                登录
              </Button>
            </form>

            <div className="mt-5 flex items-center justify-center gap-3 text-sm text-slate-500">
              <span>还没有账号？</span>
              <Button
                type="button"
                variant="link"
                onClick={() => setCreateAccountOpen(true)}
                className="h-auto p-0 text-sm font-medium normal-case tracking-normal text-blue-600 hover:text-blue-700"
              >
                创建账号
              </Button>
            </div>

            <div className="mt-8 flex items-center gap-4 text-sm text-slate-500">
              <Separator className="bg-slate-200" />
              <span className="shrink-0">或</span>
              <Separator className="bg-slate-200" />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleDemoLogin}
              className="mt-7 h-11 rounded-md border-blue-600 bg-white text-sm font-medium normal-case tracking-normal text-blue-600 hover:border-blue-700 hover:bg-blue-50 hover:text-blue-700"
            >
              <LockKeyhole data-icon="inline-start" />
              演示账号登录
            </Button>

            <p className="mt-3 text-center text-sm text-slate-500">
              体验完整功能，适合演示与学习
            </p>

            <footer className="mt-9 text-center text-xs text-slate-500">
              © 2025 KnowFlow AI · 让知识流动，让回答更可信
            </footer>
          </div>
        </section>
      </div>

      <Sheet open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <SheetContent className="w-full max-w-[420px]">
          <SheetHeader>
            <SheetTitle className="normal-case tracking-normal">
              找回密码
            </SheetTitle>
            <SheetDescription>
              输入账号或邮箱后，当前版本仅展示找回流程 UI，不会发送后端请求。
            </SheetDescription>
          </SheetHeader>

          <form className="flex flex-col gap-5 px-8">
            <FieldGroup className="gap-5">
              <Field className="gap-2">
                <FieldLabel
                  htmlFor="reset-account"
                  className="text-sm font-medium normal-case tracking-normal"
                >
                  账号或邮箱
                </FieldLabel>
                <InputGroup className="h-11 rounded-md border border-slate-300 bg-white px-4 shadow-sm has-[[data-slot=input-group-control]:focus-visible]:border-blue-500 has-[[data-slot=input-group-control]:focus-visible]:ring-4 has-[[data-slot=input-group-control]:focus-visible]:ring-blue-500/10">
                  <InputGroupAddon>
                    <Mail className="size-4 text-slate-500" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="reset-account"
                    type="text"
                    defaultValue="admin"
                    placeholder="请输入账号或邮箱"
                    autoComplete="username"
                    className="text-base text-slate-900 placeholder:text-slate-400 md:text-sm"
                  />
                </InputGroup>
              </Field>
            </FieldGroup>

            <Button
              type="button"
              className="h-11 rounded-md bg-blue-600 font-medium normal-case tracking-normal text-white hover:bg-blue-700"
            >
              发送重置说明
            </Button>
          </form>

          <SheetFooter>
            <SheetClose asChild>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-md normal-case tracking-normal"
              >
                关闭
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={createAccountOpen} onOpenChange={setCreateAccountOpen}>
        <SheetContent className="w-full max-w-[420px]">
          <SheetHeader>
            <SheetTitle className="normal-case tracking-normal">
              创建账号
            </SheetTitle>
            <SheetDescription>
              先完成注册表单 UI，当前版本不会创建账号或连接后端服务。
            </SheetDescription>
          </SheetHeader>

          <form className="flex flex-col gap-5 px-8">
            <FieldGroup className="gap-5">
              <Field className="gap-2">
                <FieldLabel
                  htmlFor="signup-username"
                  className="text-sm font-medium normal-case tracking-normal"
                >
                  用户名
                </FieldLabel>
                <InputGroup className="h-11 rounded-md border border-slate-300 bg-white px-4 shadow-sm has-[[data-slot=input-group-control]:focus-visible]:border-blue-500 has-[[data-slot=input-group-control]:focus-visible]:ring-4 has-[[data-slot=input-group-control]:focus-visible]:ring-blue-500/10">
                  <InputGroupAddon>
                    <UserRound className="size-4 text-slate-500" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="signup-username"
                    type="text"
                    placeholder="请输入用户名"
                    autoComplete="username"
                    className="text-base text-slate-900 placeholder:text-slate-400 md:text-sm"
                  />
                </InputGroup>
              </Field>

              <Field className="gap-2">
                <FieldLabel
                  htmlFor="signup-email"
                  className="text-sm font-medium normal-case tracking-normal"
                >
                  邮箱
                </FieldLabel>
                <InputGroup className="h-11 rounded-md border border-slate-300 bg-white px-4 shadow-sm has-[[data-slot=input-group-control]:focus-visible]:border-blue-500 has-[[data-slot=input-group-control]:focus-visible]:ring-4 has-[[data-slot=input-group-control]:focus-visible]:ring-blue-500/10">
                  <InputGroupAddon>
                    <Mail className="size-4 text-slate-500" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="signup-email"
                    type="email"
                    placeholder="请输入邮箱地址"
                    autoComplete="email"
                    className="text-base text-slate-900 placeholder:text-slate-400 md:text-sm"
                  />
                </InputGroup>
              </Field>

              <Field className="gap-2">
                <FieldLabel
                  htmlFor="signup-password"
                  className="text-sm font-medium normal-case tracking-normal"
                >
                  密码
                </FieldLabel>
                <InputGroup className="h-11 rounded-md border border-slate-300 bg-white px-4 shadow-sm has-[[data-slot=input-group-control]:focus-visible]:border-blue-500 has-[[data-slot=input-group-control]:focus-visible]:ring-4 has-[[data-slot=input-group-control]:focus-visible]:ring-blue-500/10">
                  <InputGroupAddon>
                    <LockKeyhole className="size-4 text-slate-500" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="signup-password"
                    type="password"
                    placeholder="请输入密码"
                    autoComplete="new-password"
                    className="text-base text-slate-900 placeholder:text-slate-400 md:text-sm"
                  />
                </InputGroup>
              </Field>

              <Field className="gap-2">
                <FieldLabel
                  htmlFor="signup-confirm-password"
                  className="text-sm font-medium normal-case tracking-normal"
                >
                  确认密码
                </FieldLabel>
                <InputGroup className="h-11 rounded-md border border-slate-300 bg-white px-4 shadow-sm has-[[data-slot=input-group-control]:focus-visible]:border-blue-500 has-[[data-slot=input-group-control]:focus-visible]:ring-4 has-[[data-slot=input-group-control]:focus-visible]:ring-blue-500/10">
                  <InputGroupAddon>
                    <LockKeyhole className="size-4 text-slate-500" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="signup-confirm-password"
                    type="password"
                    placeholder="请再次输入密码"
                    autoComplete="new-password"
                    className="text-base text-slate-900 placeholder:text-slate-400 md:text-sm"
                  />
                </InputGroup>
              </Field>
            </FieldGroup>

            <Button
              type="button"
              className="h-11 rounded-md bg-blue-600 font-medium normal-case tracking-normal text-white hover:bg-blue-700"
            >
              创建账号
            </Button>
          </form>

          <SheetFooter>
            <SheetClose asChild>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-md normal-case tracking-normal"
              >
                关闭
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </main>
  );
}

export default LoginPage;
