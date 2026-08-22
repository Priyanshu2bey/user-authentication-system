import { useEffect, useRef, useState } from "react";
import "./App.css";
import api from "./api";

function App() {
  const [screen, setScreen] = useState("auth");
  const [isLogin, setIsLogin] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState(300);

  const [resetPassword, setResetPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const otpRefs = useRef([]);

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");

    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  // =====================================================
  // OTP TIMER
  // =====================================================

  useEffect(() => {
    if (
      (screen !== "otp" && screen !== "reset-otp") ||
      otpTimer <= 0
    ) {
      return;
    }

    const interval = setInterval(() => {
      setOtpTimer((previous) => previous - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [screen, otpTimer]);

  // =====================================================
  // TIMER FORMAT
  // =====================================================

  const formatTimer = () => {
    const minutes = Math.floor(otpTimer / 60);
    const seconds = otpTimer % 60;

    return `${minutes}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  // =====================================================
  // FORM INPUT
  // =====================================================

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setError("");
    setSuccess("");
  };

  // =====================================================
  // OTP INPUT
  // =====================================================

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) {
      return;
    }

    // Support pasting a complete OTP
    if (value.length > 1) {
      const digits = value.slice(0, 6).split("");

      const newOtp = [
        "",
        "",
        "",
        "",
        "",
        "",
      ];

      digits.forEach((digit, i) => {
        newOtp[i] = digit;
      });

      setOtp(newOtp);
      setError("");

      otpRefs.current[
        Math.min(digits.length, 5)
      ]?.focus();

      return;
    }

    const newOtp = [...otp];

    newOtp[index] = value;

    setOtp(newOtp);
    setError("");

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // =====================================================
  // OTP KEYBOARD
  // =====================================================

  const handleOtpKeyDown = (index, event) => {
    if (
      event.key === "Backspace" &&
      !otp[index] &&
      index > 0
    ) {
      otpRefs.current[index - 1]?.focus();
    }

    if (
      event.key === "ArrowLeft" &&
      index > 0
    ) {
      otpRefs.current[index - 1]?.focus();
    }

    if (
      event.key === "ArrowRight" &&
      index < 5
    ) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // =====================================================
  // LOGIN / REGISTER
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // LOGIN
      if (isLogin) {
        const response = await api.post(
          "/api/auth/login",
          {
            email: formData.email,
            password: formData.password,
          }
        );

        localStorage.setItem(
          "token",
          response.data.token
        );

        localStorage.setItem(
          "user",
          JSON.stringify(response.data.user)
        );

        setUser(response.data.user);

        setSuccess("Login successful.");

        setTimeout(() => {
          setScreen("dashboard");
        }, 500);

        return;
      }

      // REGISTER
      await api.post(
        "/api/auth/register",
        {
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }
      );

      // SEND VERIFICATION OTP
      await api.post(
        "/api/auth/send-otp",
        {
          email: formData.email,
        }
      );

      setOtp([
        "",
        "",
        "",
        "",
        "",
        "",
      ]);

      setOtpTimer(300);

      setSuccess(
        "Verification code sent to your email."
      );

      setScreen("otp");

      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);

    } catch (error) {
      console.error(
        "Authentication error:",
        error
      );

      let message =
        error.response?.data ||
        "Something went wrong. Please try again.";

      if (typeof message !== "string") {
        message =
          "Something went wrong. Please try again.";
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // VERIFY REGISTRATION OTP
  // =====================================================

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    const enteredOtp = otp.join("");

    if (enteredOtp.length !== 6) {
      setError(
        "Please enter the complete 6-digit code."
      );
      return;
    }

    if (otpTimer <= 0) {
      setError(
        "Your verification code has expired."
      );
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await api.post(
        "/api/auth/verify-otp",
        {
          email: formData.email,
          otp: enteredOtp,
        }
      );

      setSuccess(
        "Email verified successfully."
      );

      setTimeout(() => {
        setScreen("auth");
        setIsLogin(true);

        setFormData({
          name: "",
          email: formData.email,
          password: "",
        });

        setOtp([
          "",
          "",
          "",
          "",
          "",
          "",
        ]);
      }, 1200);

    } catch (error) {
      const message =
        error.response?.data ||
        "Invalid or expired verification code.";

      setError(message);

      setOtp([
        "",
        "",
        "",
        "",
        "",
        "",
      ]);

      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);

    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // RESEND REGISTRATION OTP
  // =====================================================

  const handleResendOtp = async () => {
    if (loading || otpTimer > 0) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await api.post(
        "/api/auth/send-otp",
        {
          email: formData.email,
        }
      );

      setOtp([
        "",
        "",
        "",
        "",
        "",
        "",
      ]);

      setOtpTimer(300);

      setSuccess(
        "A new verification code has been sent."
      );

      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);

    } catch (error) {
      const message =
        error.response?.data ||
        "Unable to resend the code.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FORGOT PASSWORD
  // =====================================================

  const openForgotPassword = () => {
    setScreen("forgot-password");

    setError("");
    setSuccess("");

    setFormData({
      name: "",
      email: "",
      password: "",
    });
  };

  // =====================================================
  // SEND PASSWORD RESET OTP
  // =====================================================

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    if (!formData.email) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await api.post(
        "/api/auth/forgot-password",
        {
          email: formData.email,
        }
      );

      setOtp([
        "",
        "",
        "",
        "",
        "",
        "",
      ]);

      setOtpTimer(300);

      setSuccess(
        "Password reset code sent to your email."
      );

      setScreen("reset-otp");

      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);

    } catch (error) {
      const message =
        error.response?.data ||
        "Unable to send reset code.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // RESET PASSWORD
  // =====================================================

  const handleResetPassword = async (e) => {
    e.preventDefault();

    const enteredOtp = otp.join("");

    if (enteredOtp.length !== 6) {
      setError(
        "Please enter the complete 6-digit OTP."
      );
      return;
    }

    if (otpTimer <= 0) {
      setError(
        "Your OTP has expired. Please request a new one."
      );
      return;
    }

    if (resetPassword.length < 8) {
      setError(
        "Password must be at least 8 characters."
      );
      return;
    }

    if (resetPassword !== confirmPassword) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await api.post(
        "/api/auth/reset-password",
        {
          email: formData.email,
          otp: enteredOtp,
          newPassword: resetPassword,
        }
      );

      setSuccess(
        "Password reset successfully."
      );

      setTimeout(() => {
        setScreen("auth");
        setIsLogin(true);

        setFormData({
          name: "",
          email: formData.email,
          password: "",
        });

        setOtp([
          "",
          "",
          "",
          "",
          "",
          "",
        ]);

        setResetPassword("");
        setConfirmPassword("");
      }, 1500);

    } catch (error) {
      const message =
        error.response?.data ||
        "Unable to reset password.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);

    setFormData({
      name: "",
      email: "",
      password: "",
    });

    setOtp([
      "",
      "",
      "",
      "",
      "",
      "",
    ]);

    setResetPassword("");
    setConfirmPassword("");

    setIsLogin(true);
    setScreen("auth");

    setError("");
    setSuccess("");
  };

  // =====================================================
  // SWITCH LOGIN / REGISTER
  // =====================================================

  const switchAuthMode = () => {
    setIsLogin(!isLogin);

    setFormData({
      name: "",
      email: "",
      password: "",
    });

    setError("");
    setSuccess("");
  };

  // =====================================================
  // DASHBOARD
  // =====================================================

  if (screen === "dashboard" && user) {
    return (
      <div className="app">

        <div className="dashboard-wrapper">

          <header className="dashboard-header">

            <div className="brand">

              <div className="logo">
                🔐
              </div>

              <div>
                <h1>SecureAuth</h1>

                <span>
                  Authentication Center
                </span>
              </div>

            </div>

            <button
              className="logout-button"
              onClick={handleLogout}
            >
              Logout
            </button>

          </header>

          <main className="dashboard-content">

            <div className="welcome-section">

              <div>

                <span className="eyebrow">
                  SECURE DASHBOARD
                </span>

                <h2>
                  Welcome back,{" "}
                  {user.name || "there"} 👋
                </h2>

                <p>
                  Your account is verified and
                  securely authenticated.
                </p>

              </div>

              <div className="status-badge">
                <span></span>
                Authenticated
              </div>

            </div>

            <div className="dashboard-grid">

              <div className="dashboard-card profile-card">

                <div className="card-icon">
                  👤
                </div>

                <h3>Profile</h3>

                <p className="card-description">
                  Your account information
                </p>

                <div className="profile-info">

                  <div>
                    <span>Name</span>

                    <strong>
                      {user.name ||
                        "Not available"}
                    </strong>
                  </div>

                  <div>
                    <span>Email</span>

                    <strong>
                      {user.email}
                    </strong>
                  </div>

                  <div>
                    <span>Role</span>

                    <strong>
                      {user.role || "USER"}
                    </strong>
                  </div>

                </div>

              </div>

              <div className="dashboard-card security-card">

                <div className="card-icon">
                  🛡️
                </div>

                <h3>Security</h3>

                <p className="card-description">
                  Your authentication status
                </p>

                <div className="security-item">

                  <span>✓</span>

                  <div>
                    <strong>
                      Email verified
                    </strong>

                    <small>
                      Your email has been verified
                    </small>
                  </div>

                </div>

                <div className="security-item">

                  <span>✓</span>

                  <div>
                    <strong>
                      JWT authenticated
                    </strong>

                    <small>
                      Secure session is active
                    </small>
                  </div>

                </div>

                <div className="security-item">

                  <span>✓</span>

                  <div>
                    <strong>
                      Password protected
                    </strong>

                    <small>
                      Password is securely encrypted
                    </small>
                  </div>

                </div>

              </div>

            </div>

            <div className="dashboard-footer">

              <span>
                🔒 Your session is protected
              </span>

              <span>
                SecureAuth • Spring Boot + React
              </span>

            </div>

          </main>

        </div>

      </div>
    );
  }

  // =====================================================
  // FORGOT PASSWORD EMAIL SCREEN
  // =====================================================

  if (screen === "forgot-password") {
    return (
      <div className="app">

        <div className="auth-wrapper">

          <div className="brand-section">

            <div className="logo">
              🔑
            </div>

            <h1>SecureAuth</h1>

            <p>
              Recover your account securely
              using email verification.
            </p>

            <div className="tech-badges">
              <span>Secure</span>
              <span>OTP</span>
              <span>Recovery</span>
            </div>

            <div className="brand-note">
              <span>✓</span>

              <p>
                We'll never send your password
                by email.
              </p>
            </div>

          </div>

          <div className="auth-card">

            <div className="auth-heading">

              <div className="otp-mail-icon">
                🔑
              </div>

              <span className="eyebrow">
                ACCOUNT RECOVERY
              </span>

              <h2>
                Forgot your password?
              </h2>

              <p>
                Enter your registered email and
                we'll send you a verification code.
              </p>

            </div>

            {error && (
              <div className="message error">
                {error}
              </div>
            )}

            {success && (
              <div className="message success">
                {success}
              </div>
            )}

            <form
              onSubmit={handleForgotPassword}
            >

              <div className="input-group">

                <label>
                  Email address
                </label>

                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  autoFocus
                  required
                />

              </div>

              <button
                className="submit-button"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Sending code..."
                  : "Send verification code"}
              </button>

            </form>

            <button
              type="button"
              className="back-button"
              onClick={() => {
                setScreen("auth");
                setIsLogin(true);
                setError("");
                setSuccess("");
              }}
            >
              ← Back to login
            </button>

          </div>

        </div>

      </div>
    );
  }

  // =====================================================
  // PASSWORD RESET OTP SCREEN
  // =====================================================

  if (screen === "reset-otp") {
    return (
      <div className="app">

        <div className="auth-wrapper">

          <div className="brand-section">

            <div className="logo">
              🔐
            </div>

            <h1>SecureAuth</h1>

            <p>
              Verify your identity before
              creating a new password.
            </p>

            <div className="tech-badges">
              <span>Email OTP</span>
              <span>5 min</span>
              <span>Secure</span>
            </div>

          </div>

          <div className="auth-card otp-card">

            <div className="auth-heading">

              <div className="otp-mail-icon">
                ✉️
              </div>

              <span className="eyebrow">
                PASSWORD RECOVERY
              </span>

              <h2>
                Enter verification code
              </h2>

              <p>
                We sent a 6-digit code to
              </p>

              <strong className="email-highlight">
                {formData.email}
              </strong>

            </div>

            {error && (
              <div className="message error">
                {error}
              </div>
            )}

            {success && (
              <div className="message success">
                {success}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();

                const enteredOtp =
                  otp.join("");

                if (
                  enteredOtp.length !== 6
                ) {
                  setError(
                    "Please enter the complete 6-digit code."
                  );
                  return;
                }

                if (otpTimer <= 0) {
                  setError(
                    "Your code has expired."
                  );
                  return;
                }

                setError("");
                setScreen("new-password");
              }}
            >

              <div className="otp-inputs">

                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      otpRefs.current[index] =
                        element;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) =>
                      handleOtpChange(
                        index,
                        e.target.value
                      )
                    }
                    onKeyDown={(e) =>
                      handleOtpKeyDown(
                        index,
                        e
                      )
                    }
                  />
                ))}

              </div>

              <div className="otp-timer">

                <span>
                  Code expires in
                </span>

                <strong
                  className={
                    otpTimer <= 60
                      ? "timer-warning"
                      : ""
                  }
                >
                  {formatTimer()}
                </strong>

              </div>

              <button
                className="submit-button"
                type="submit"
              >
                Verify code
              </button>

            </form>

            <div className="otp-footer">

              <p>
                Didn't receive the code?
              </p>

              <button
                type="button"
                className="resend-button"
                disabled={
                  loading || otpTimer > 0
                }
                onClick={async () => {
                  await handleForgotPassword({
                    preventDefault: () => {},
                  });
                }}
              >
                {otpTimer > 0
                  ? `Resend available in ${formatTimer()}`
                  : "Resend verification code"}
              </button>

            </div>

            <button
              type="button"
              className="back-button"
              onClick={() => {
                setScreen("forgot-password");
                setError("");
                setSuccess("");
              }}
            >
              ← Change email
            </button>

          </div>

        </div>

      </div>
    );
  }

  // =====================================================
  // NEW PASSWORD SCREEN
  // =====================================================

  if (screen === "new-password") {
    return (
      <div className="app">

        <div className="auth-wrapper">

          <div className="brand-section">

            <div className="logo">
              🛡️
            </div>

            <h1>SecureAuth</h1>

            <p>
              Create a new password to secure
              your account.
            </p>

            <div className="tech-badges">
              <span>Verified</span>
              <span>Encrypted</span>
              <span>Secure</span>
            </div>

          </div>

          <div className="auth-card">

            <div className="auth-heading">

              <div className="otp-mail-icon">
                🔒
              </div>

              <span className="eyebrow">
                NEW PASSWORD
              </span>

              <h2>
                Create new password
              </h2>

              <p>
                Choose a strong password you
                haven't used before.
              </p>

            </div>

            {error && (
              <div className="message error">
                {error}
              </div>
            )}

            {success && (
              <div className="message success">
                {success}
              </div>
            )}

            <form
              onSubmit={handleResetPassword}
            >

              <div className="input-group">

                <label>
                  New password
                </label>

                <input
                  type="password"
                  placeholder="At least 8 characters"
                  value={resetPassword}
                  onChange={(e) => {
                    setResetPassword(
                      e.target.value
                    );
                    setError("");
                  }}
                  minLength={8}
                  autoFocus
                  required
                />

              </div>

              <div className="input-group">

                <label>
                  Confirm new password
                </label>

                <input
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(
                      e.target.value
                    );
                    setError("");
                  }}
                  minLength={8}
                  required
                />

              </div>

              <button
                className="submit-button"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Updating password..."
                  : "Reset password"}
              </button>

            </form>

            <div className="secure-note">
              <span>🔒</span>

              <span>
                Your new password is securely
                encrypted before storage.
              </span>
            </div>

          </div>

        </div>

      </div>
    );
  }

  // =====================================================
  // LOGIN / REGISTER SCREEN
  // =====================================================

  return (
    <div className="app">

      <div className="auth-wrapper">

        <div className="brand-section">

          <div className="logo">
            🔐
          </div>

          <h1>SecureAuth</h1>

          <p>
            Simple, secure authentication built
            for modern applications.
          </p>

          <div className="tech-badges">
            <span>React</span>
            <span>Spring Boot</span>
            <span>JWT</span>
            <span>OTP</span>
          </div>

          <div className="brand-note">
            <span>✓</span>

            <p>
              Your security is our priority.
            </p>
          </div>

        </div>

        <div className="auth-card">

          <div className="auth-heading">

            <span className="eyebrow">
              {isLogin
                ? "WELCOME BACK"
                : "GET STARTED"}
            </span>

            <h2>
              {isLogin
                ? "Welcome back"
                : "Create your account"}
            </h2>

            <p>
              {isLogin
                ? "Sign in securely to continue."
                : "Create an account and verify your email."}
            </p>

          </div>

          {error && (
            <div className="message error">
              {error}
            </div>
          )}

          {success && (
            <div className="message success">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {!isLogin && (
              <div className="input-group">

                <label>Name</label>

                <input
                  type="text"
                  name="name"
                  placeholder="Dhruv Kumar"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />

              </div>
            )}

            <div className="input-group">

              <label>Email</label>

              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />

            </div>

            <div className="input-group">

              <label>Password</label>

              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                minLength={8}
                required
              />

            </div>

            {isLogin && (
              <div className="forgot-password">

                <button
                  type="button"
                  onClick={openForgotPassword}
                >
                  Forgot password?
                </button>

              </div>
            )}

            <button
              className="submit-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? isLogin
                  ? "Signing in..."
                  : "Creating account..."
                : isLogin
                ? "Sign in"
                : "Create account"}
            </button>

          </form>

          <div className="divider">
            <span>OR</span>
          </div>

          <div className="switch-auth">

            <span>
              {isLogin
                ? "Don't have an account?"
                : "Already have an account?"}
            </span>

            <button
              type="button"
              onClick={switchAuthMode}
            >
              {isLogin
                ? "Create account"
                : "Sign in"}
            </button>

          </div>

          <div className="secure-note">

            <span>🔒</span>

            <span>
              Protected with encrypted passwords,
              OTP verification & JWT
            </span>

          </div>

        </div>

      </div>

    </div>
  );
}

export default App;