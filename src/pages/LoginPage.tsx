import { type FormEvent, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";

import { login, register, resetPassword as requestResetPassword } from "@/api/auth";
import { BrandMark, LoginVisualCarousel } from "@/components/login/login-visuals";
import { getErrorResponseMessage, getRedirectPath } from "@/components/login/login-utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getAuthSession, setAuthSession } from "@/lib/mock-auth";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupUsername, setSignupUsername] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [resetAccount, setResetAccount] = useState("");
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const redirectPath = getRedirectPath(location.state);

  useEffect(() => {
    if (getAuthSession()) {
      navigate(redirectPath, { replace: true });
    }
  }, [navigate, redirectPath]);

  const submitLogin = async (nextAccount: string, nextPassword: string) => {
    const username = nextAccount.trim();

    if (!username || !nextPassword) {
      toast.error("请输入账号和密码");
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await login({
        username,
        password: nextPassword,
      });

      setAuthSession(user, { remember: rememberMe });
      toast.success("登录成功");
      navigate(redirectPath, { replace: true });
    } catch (error) {
      if (isAxiosError(error)) {
        if (error.response?.status === 401) {
          toast.error("登录失败，请检查账号或密码");
          return;
        }

        if (!error.response) {
          toast.error("无法连接登录服务，请确认后端已启动");
          return;
        }
      }

      toast.error("登录失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitLogin(account, password);
  };

  const resetForgotPasswordForm = () => {
    setResetAccount("");
    setResetPassword("");
    setResetConfirmPassword("");
  };

  const handleForgotPasswordOpenChange = (open: boolean) => {
    setForgotPasswordOpen(open);

    if (!open) {
      setResetPasswordOpen(false);
      resetForgotPasswordForm();
    }
  };

  const handleResetPasswordOpenChange = (open: boolean) => {
    setResetPasswordOpen(open);

    if (!open) {
      setResetPassword("");
      setResetConfirmPassword("");
    }
  };

  const handleSendResetInstructions = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const targetAccount = resetAccount.trim();

    if (!targetAccount) {
      toast.error("请输入需要重置的账号或邮箱");
      return;
    }

    setResetAccount(targetAccount);
    setResetPasswordOpen(true);
  };

  const handleResetPasswordSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const username = resetAccount.trim();

    if (!username) {
      toast.error("请输入需要重置的账号或邮箱");
      return;
    }

    if (!resetPassword) {
      toast.error("请输入新密码");
      return;
    }

    if (resetPassword !== resetConfirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    setIsResettingPassword(true);

    try {
      await requestResetPassword({
        username,
        newPassword: resetPassword,
      });

      toast.success("密码修改成功");
      setResetPasswordOpen(false);
      setForgotPasswordOpen(false);
      resetForgotPasswordForm();
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status;

        if (status === 400) {
          toast.error("重置密码信息不完整，请检查账号和新密码");
          return;
        }

        if (status === 404) {
          toast.error("用户不存在，请检查账号是否正确");
          return;
        }

        if (!error.response) {
          toast.error("无法连接重置服务，请确认后端已启动");
          return;
        }
      }

      toast.error("重置密码失败，请稍后重试");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const resetRegisterForm = () => {
    setSignupUsername("");
    setSignupPassword("");
    setSignupConfirmPassword("");
  };

  const handleCreateAccountOpenChange = (open: boolean) => {
    if (isRegistering) {
      return;
    }

    setCreateAccountOpen(open);

    if (!open) {
      resetRegisterForm();
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const username = signupUsername.trim();

    if (!username || !signupPassword) {
      toast.error("请输入用户名和密码");
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    setIsRegistering(true);

    try {
      await register({
        username,
        password: signupPassword,
      });
      const user = await login({
        username,
        password: signupPassword,
      });

      setAuthSession(user, { remember: false });
      resetRegisterForm();
      setCreateAccountOpen(false);
      toast.success("注册成功，已登录");
      navigate(redirectPath, { replace: true });
    } catch (error) {
      if (isAxiosError(error)) {
        if (error.response?.status === 400 || error.response?.status === 409) {
          const message = getErrorResponseMessage(error.response.data);

          if (/exist|duplicate|already|存在/i.test(message)) {
            toast.error("用户名已存在，请换一个用户名");
            return;
          }

          toast.error("注册信息不完整，请检查用户名和密码");
          return;
        }

        if (!error.response) {
          toast.error("无法连接注册服务，请确认后端已启动");
          return;
        }
      }

      toast.error("注册失败，请稍后重试");
    } finally {
      setIsRegistering(false);
    }
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
                      disabled={isSubmitting}
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
                      disabled={isSubmitting}
                      className="text-base text-slate-900 placeholder:text-slate-400 md:text-sm"
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        aria-label={showPassword ? "隐藏密码" : "显示密码"}
                        onClick={() => setShowPassword((value) => !value)}
                        disabled={isSubmitting}
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
                    checked={rememberMe}
                    onCheckedChange={(checked) =>
                      setRememberMe(checked === true)
                    }
                    disabled={isSubmitting}
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
                disabled={isSubmitting}
                className="h-12 rounded-md bg-blue-600 text-base font-semibold normal-case tracking-normal text-white shadow-[0_14px_30px_rgba(37,99,235,0.22)] hover:bg-blue-700"
              >
                {isSubmitting ? "登录中..." : "登录"}
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

            <footer className="mt-9 text-center text-xs text-slate-500">
              © 2026 KnowFlow AI · 让知识流动，让回答更可信
            </footer>
          </div>
        </section>
      </div>

      <Sheet
        open={forgotPasswordOpen}
        onOpenChange={handleForgotPasswordOpenChange}
      >
        <SheetContent className="w-full max-w-[420px]">
          <SheetHeader>
            <SheetTitle className="normal-case tracking-normal">
              找回密码
            </SheetTitle>
            <SheetDescription>
              输入账号或邮箱后，当前版本仅展示找回流程 UI，不会发送后端请求。
            </SheetDescription>
          </SheetHeader>

          <form
            className="flex flex-col gap-5 px-8"
            onSubmit={handleSendResetInstructions}
          >
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
                    value={resetAccount}
                    onChange={(event) => setResetAccount(event.target.value)}
                    placeholder="请输入账号或邮箱"
                    autoComplete="username"
                    className="text-base text-slate-900 placeholder:text-slate-400 md:text-sm"
                  />
                </InputGroup>
              </Field>
            </FieldGroup>

            <Button
              type="submit"
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

      <Dialog
        open={resetPasswordOpen}
        onOpenChange={handleResetPasswordOpenChange}
      >
        <DialogContent className="rounded-[8px]">
          <DialogHeader>
            <DialogTitle className="font-sans text-lg normal-case tracking-normal">
              重置密码
            </DialogTitle>
            <DialogDescription>
              确认需要重置的账户并设置新密码。
            </DialogDescription>
          </DialogHeader>

          <form className="flex flex-col gap-5" onSubmit={handleResetPasswordSubmit}>
            <FieldGroup className="gap-5">
              <Field className="gap-2">
                <FieldLabel
                  htmlFor="reset-dialog-account"
                  className="text-sm font-medium normal-case tracking-normal"
                >
                  重置账户
                </FieldLabel>
                <InputGroup className="h-11 rounded-md border border-slate-300 bg-slate-50 px-4 shadow-sm">
                  <InputGroupAddon>
                    <UserRound className="size-4 text-slate-500" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="reset-dialog-account"
                    type="text"
                    value={resetAccount}
                    readOnly
                    className="text-base text-slate-900 md:text-sm"
                  />
                </InputGroup>
              </Field>

              <Field className="gap-2">
                <FieldLabel
                  htmlFor="reset-new-password"
                  className="text-sm font-medium normal-case tracking-normal"
                >
                  新密码
                </FieldLabel>
                <InputGroup className="h-11 rounded-md border border-slate-300 bg-white px-4 shadow-sm has-[[data-slot=input-group-control]:focus-visible]:border-blue-500 has-[[data-slot=input-group-control]:focus-visible]:ring-4 has-[[data-slot=input-group-control]:focus-visible]:ring-blue-500/10">
                  <InputGroupAddon>
                    <LockKeyhole className="size-4 text-slate-500" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="reset-new-password"
                    type="password"
                    value={resetPassword}
                    onChange={(event) => setResetPassword(event.target.value)}
                    placeholder="请输入新密码"
                    autoComplete="new-password"
                    disabled={isResettingPassword}
                    className="text-base text-slate-900 placeholder:text-slate-400 md:text-sm"
                  />
                </InputGroup>
              </Field>

              <Field className="gap-2">
                <FieldLabel
                  htmlFor="reset-confirm-password"
                  className="text-sm font-medium normal-case tracking-normal"
                >
                  确认密码
                </FieldLabel>
                <InputGroup className="h-11 rounded-md border border-slate-300 bg-white px-4 shadow-sm has-[[data-slot=input-group-control]:focus-visible]:border-blue-500 has-[[data-slot=input-group-control]:focus-visible]:ring-4 has-[[data-slot=input-group-control]:focus-visible]:ring-blue-500/10">
                  <InputGroupAddon>
                    <LockKeyhole className="size-4 text-slate-500" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="reset-confirm-password"
                    type="password"
                    value={resetConfirmPassword}
                    onChange={(event) =>
                      setResetConfirmPassword(event.target.value)
                    }
                    placeholder="请再次输入新密码"
                    autoComplete="new-password"
                    disabled={isResettingPassword}
                    className="text-base text-slate-900 placeholder:text-slate-400 md:text-sm"
                  />
                </InputGroup>
              </Field>
            </FieldGroup>

            <DialogFooter>
              <Button
                type="submit"
                disabled={isResettingPassword}
                className="h-10 rounded-md bg-blue-600 font-medium normal-case tracking-normal text-white hover:bg-blue-700"
              >
                {isResettingPassword ? "提交中..." : "提交"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet
        open={createAccountOpen}
        onOpenChange={handleCreateAccountOpenChange}
      >
        <SheetContent className="w-full max-w-[420px]">
          <SheetHeader>
            <SheetTitle className="normal-case tracking-normal">
              创建账号
            </SheetTitle>
            <SheetDescription>
              创建后将直接进入 KnowFlow AI 工作台。
            </SheetDescription>
          </SheetHeader>

          <form className="flex flex-col gap-5 px-8" onSubmit={handleRegister}>
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
                    value={signupUsername}
                    onChange={(event) => setSignupUsername(event.target.value)}
                    placeholder="请输入用户名"
                    autoComplete="username"
                    disabled={isRegistering}
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
                    value={signupPassword}
                    onChange={(event) => setSignupPassword(event.target.value)}
                    placeholder="请输入密码"
                    autoComplete="new-password"
                    disabled={isRegistering}
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
                    value={signupConfirmPassword}
                    onChange={(event) =>
                      setSignupConfirmPassword(event.target.value)
                    }
                    placeholder="请再次输入密码"
                    autoComplete="new-password"
                    disabled={isRegistering}
                    className="text-base text-slate-900 placeholder:text-slate-400 md:text-sm"
                  />
                </InputGroup>
              </Field>
            </FieldGroup>

            <Button
              type="submit"
              disabled={isRegistering}
              className="h-11 rounded-md bg-blue-600 font-medium normal-case tracking-normal text-white hover:bg-blue-700"
            >
              {isRegistering ? "创建中..." : "创建账号"}
            </Button>
          </form>

          <SheetFooter>
            <SheetClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isRegistering}
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
