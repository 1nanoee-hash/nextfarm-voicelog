import {
  useState,
} from "react";

import {
  loginDemo,
  loginWithGoogle,
  loginWithFacebook,
  registerDemo,
} from "../services/authService";


const SOCIAL_PROVIDERS = [
  {
    id: "google",
    mark: "G",
    label: "Google",
  },
  {
    id: "facebook",
    mark: "f",
    label: "Facebook",
  },
  {
    id: "microsoft",
    mark: "M",
    label: "Microsoft",
  },
];


function AuthPage({
  language = "vi",
  onAuthenticated,
}) {
  const isVietnamese =
    language === "vi";

  const [
    mode,
    setMode,
  ] = useState("login");

  const [
    name,
    setName,
  ] = useState("");

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState(null);


  const copy =
    isVietnamese
      ? {
          title:
            "NextFarm VoiceLog",
          subtitle:
            "Nhật ký canh tác thông minh bằng giọng nói",
          welcome:
            "Chào mừng trở lại",
          create:
            "Tạo tài khoản NextFarm",
          loginHint:
            "Đăng nhập để tiếp tục quản lý nhật ký canh tác.",
          registerHint:
            "Tạo tài khoản để bắt đầu sử dụng NextFarm VoiceLog.",
          login:
            "Đăng nhập",
          register:
            "Đăng ký",
          fullName:
            "Họ và tên",
          email:
            "Email",
          password:
            "Mật khẩu",
          confirmPassword:
            "Xác nhận mật khẩu",
          forgot:
            "Quên mật khẩu?",
          or:
            "hoặc tiếp tục với",
          noAccount:
            "Chưa có tài khoản?",
          hasAccount:
            "Đã có tài khoản?",
          demo:
            "Google và Facebook đã hỗ trợ đăng nhập thật. Microsoft đang được cấu hình OAuth.",
        }
      : {
          title:
            "NextFarm VoiceLog",
          subtitle:
            "Smart farming logs powered by voice",
          welcome:
            "Welcome back",
          create:
            "Create your NextFarm account",
          loginHint:
            "Sign in to continue managing farming logs.",
          registerHint:
            "Create an account to start using NextFarm VoiceLog.",
          login:
            "Sign in",
          register:
            "Register",
          fullName:
            "Full name",
          email:
            "Email",
          password:
            "Password",
          confirmPassword:
            "Confirm password",
          forgot:
            "Forgot password?",
          or:
            "or continue with",
          noAccount:
            "Don't have an account?",
          hasAccount:
            "Already have an account?",
          demo:
            "Google and Facebook sign-in are enabled. Microsoft OAuth is being configured.",
        };


  const changeMode = (
    nextMode
  ) => {
    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    setMessage(null);
  };


  const handleSubmit =
    async (event) => {
      event.preventDefault();

      setMessage(null);

      const normalizedEmail =
        email.trim();

      if (
        !normalizedEmail ||
        !password
      ) {
        setMessage({
          type: "error",
          text:
            isVietnamese
              ? "Vui lòng nhập đầy đủ email và mật khẩu."
              : "Enter your email and password.",
        });

        return;
      }

      if (
        password.length < 6
      ) {
        setMessage({
          type: "error",
          text:
            isVietnamese
              ? "Mật khẩu cần có ít nhất 6 ký tự."
              : "Password must contain at least 6 characters.",
        });

        return;
      }

      if (
        mode === "register"
      ) {
        if (!name.trim()) {
          setMessage({
            type: "error",
            text:
              isVietnamese
                ? "Vui lòng nhập họ và tên."
                : "Enter your full name.",
          });

          return;
        }

        if (
          password !==
          confirmPassword
        ) {
          setMessage({
            type: "error",
            text:
              isVietnamese
                ? "Mật khẩu xác nhận không khớp."
                : "Passwords do not match.",
          });

          return;
        }
      }

      setLoading(true);

      try {
        const session =
          mode === "login"
            ? await loginDemo({
                email:
                  normalizedEmail,
                password,
              })
            : await registerDemo({
                name:
                  name.trim(),
                email:
                  normalizedEmail,
                password,
              });

        onAuthenticated?.(
          session
        );
      } catch (error) {
        setMessage({
          type: "error",
          text:
            error?.message ||
            "Authentication failed.",
        });
      } finally {
        setLoading(false);
      }
    };


  const handleSocialLogin =
    async (provider) => {
      if (
        provider === "microsoft"
      ) {
        setMessage({
          type: "info",
          text:
            language === "vi"
              ? "Microsoft OAuth đang được cấu hình."
              : "Microsoft OAuth sign-in is being configured.",
        });

        return;
      }

      setLoading(true);
      setMessage(null);

      try {
        const session =
          provider === "facebook"
            ? await loginWithFacebook()
            : await loginWithGoogle();

        onAuthenticated(
          session
        );
      } catch (error) {
        setMessage({
          type: "error",
          text:
            error?.message ||
            (
              language === "vi"
                ? "Không thể đăng nhập bằng Google."
                : "Unable to sign in with Google."
            ),
        });
      } finally {
        setLoading(false);
      }
    };

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-brand-panel">
          <div className="auth-brand-badge">
            NEXTFARM AI WORKSPACE
          </div>

          <div className="auth-brand-logo">
            🌱
          </div>

          <h1>
            {copy.title}
          </h1>

          <p>
            {copy.subtitle}
          </p>

          <div className="auth-feature-list">
            <div>
              <span>🎙️</span>
              <span>
                Ghi nhật ký bằng giọng nói
              </span>
            </div>

            <div>
              <span>🤖</span>
              <span>
                AI hỗ trợ trích xuất dữ liệu
              </span>
            </div>

            <div>
              <span>🌾</span>
              <span>
                Quản lý dữ liệu canh tác
              </span>
            </div>
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-mobile-brand">
            <span>🌱</span>
            <strong>
              NextFarm VoiceLog
            </strong>
          </div>

          <div className="auth-tab-list">
            <button
              type="button"
              className={
                mode === "login"
                  ? "active"
                  : ""
              }
              onClick={() =>
                changeMode(
                  "login"
                )
              }
            >
              {copy.login}
            </button>

            <button
              type="button"
              className={
                mode ===
                "register"
                  ? "active"
                  : ""
              }
              onClick={() =>
                changeMode(
                  "register"
                )
              }
            >
              {copy.register}
            </button>
          </div>

          <div className="auth-heading">
            <h2>
              {mode === "login"
                ? copy.welcome
                : copy.create}
            </h2>

            <p>
              {mode === "login"
                ? copy.loginHint
                : copy.registerHint}
            </p>
          </div>

          <div className="auth-social-grid">
            {SOCIAL_PROVIDERS.map(
              (provider) => (
                <button
                  key={
                    provider.id
                  }
                  type="button"
                  className={`auth-social-btn ${provider.id}`}
                  onClick={() =>
                    handleSocialLogin(
                      provider.id
                    )
                  }
                >
                  <span className="auth-provider-mark">
                    {
                      provider.mark
                    }
                  </span>

                  <span>
                    {
                      provider.label
                    }
                  </span>
                </button>
              )
            )}
          </div>

          <div className="auth-divider">
            <span>
              {copy.or}
            </span>
          </div>

          <form
            className="auth-form"
            onSubmit={
              handleSubmit
            }
          >
            {mode ===
              "register" && (
              <label className="auth-field">
                <span>
                  {copy.fullName}
                </span>

                <input
                  type="text"
                  value={name}
                  onChange={(
                    event
                  ) =>
                    setName(
                      event.target
                        .value
                    )
                  }
                  autoComplete="name"
                />
              </label>
            )}

            <label className="auth-field">
              <span>
                {copy.email}
              </span>

              <input
                type="email"
                value={email}
                onChange={(
                  event
                ) =>
                  setEmail(
                    event.target
                      .value
                  )
                }
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>

            <label className="auth-field">
              <span>
                {copy.password}
              </span>

              <div className="auth-password-wrapper">
                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(
                    event
                  ) =>
                    setPassword(
                      event.target
                        .value
                    )
                  }
                  autoComplete={
                    mode ===
                    "login"
                      ? "current-password"
                      : "new-password"
                  }
                  placeholder="••••••••"
                />

                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (previous) =>
                        !previous
                    )
                  }
                >
                  {showPassword
                    ? "🙈"
                    : "👁️"}
                </button>
              </div>
            </label>

            {mode ===
              "register" && (
              <label className="auth-field">
                <span>
                  {
                    copy.confirmPassword
                  }
                </span>

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    confirmPassword
                  }
                  onChange={(
                    event
                  ) =>
                    setConfirmPassword(
                      event.target
                        .value
                    )
                  }
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
              </label>
            )}

            {mode ===
              "login" && (
              <div className="auth-form-options">
                <span />

                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() =>
                    setMessage({
                      type:
                        "info",
                      text:
                        isVietnamese
                          ? "Chức năng khôi phục mật khẩu sẽ được kết nối sau."
                          : "Password recovery will be connected later.",
                    })
                  }
                >
                  {copy.forgot}
                </button>
              </div>
            )}

            {message && (
              <div
                className={`auth-message ${message.type}`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading
                ? "..."
                : mode ===
                    "login"
                  ? copy.login
                  : copy.register}
            </button>
          </form>

          <div className="auth-switch">
            <span>
              {mode === "login"
                ? copy.noAccount
                : copy.hasAccount}
            </span>

            <button
              type="button"
              onClick={() =>
                changeMode(
                  mode ===
                    "login"
                    ? "register"
                    : "login"
                )
              }
            >
              {mode === "login"
                ? copy.register
                : copy.login}
            </button>
          </div>

          <p className="auth-demo-note">
            {copy.demo}
          </p>
        </div>
      </section>
    </main>
  );
}


export default AuthPage;
