"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ConfirmationResult, RecaptchaVerifier } from "firebase/auth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FirebaseError } from "firebase/app";
import { ThemeToggle } from "@/components/app-shell";
import {
  consumeRedirectResult,
  createPhoneRecaptchaVerifier,
  sendPhoneVerificationCode,
  signInWithGoogle,
  SignInCancelled,
} from "@/lib/firebase";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1Z" />
      <path fill="#EA4335" d="M12 4.76c1.76 0 3.35.6 4.59 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.87 8.87 4.76 12 4.76Z" />
    </svg>
  );
}

const EASE = [0.22, 1, 0.36, 1] as const;

function friendlyError(e: unknown) {
  if (e instanceof FirebaseError) {
    switch (e.code) {
      case "auth/unauthorized-domain":
        return "This domain isn't whitelisted yet — add it under Firebase Console → Auth → Authorized domains.";
      case "auth/operation-not-allowed":
        return "This sign-in provider is disabled — enable it in Firebase Console → Auth → Sign-in method.";
      case "auth/network-request-failed":
        return "Network hiccup reaching Google. Check your connection and retry.";
      case "auth/too-many-requests":
        return "Too many attempts. Give it a minute and try again.";
      default:
        return `Google sign-in failed (${e.code.replace("auth/", "")}).`;
    }
  }
  return e instanceof Error ? e.message : "Something went wrong. Please try again.";
}

function friendlyPhoneError(e: unknown) {
  if (e instanceof FirebaseError) {
    switch (e.code) {
      case "auth/invalid-phone-number":
        return "That mobile number is not valid. Enter a 10-digit Indian number.";
      case "auth/invalid-verification-code":
        return "That verification code is incorrect. Check the SMS and try again.";
      case "auth/code-expired":
        return "That verification code has expired. Enter the latest code.";
      case "auth/too-many-requests":
      case "auth/quota-exceeded":
        return "Too many verification attempts. Please wait a while and try again.";
      case "auth/captcha-check-failed":
        return "Phone verification could not be completed. Please try again.";
      case "auth/operation-not-allowed":
        return "Phone sign-in is disabled — enable it in Firebase Console → Auth → Sign-in method.";
      case "auth/network-request-failed":
        return "Network hiccup reaching phone verification. Check your connection and retry.";
      default:
        return `Phone verification failed (${e.code.replace("auth/", "")}).`;
    }
  }
  return e instanceof Error ? e.message : "Phone verification failed. Please try again.";
}

function QuillIllustration() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.6, ease: EASE }}
      className="relative mx-auto flex h-[200px] w-[260px] items-center justify-center sm:h-[220px] sm:w-[300px]"
    >
      {/* Minimal hand-drawn style illustration inspired by Claude reference but for Quill */}
      <svg viewBox="0 0 260 200" width="100%" height="100%" className="overflow-visible">
        {/* Subtle paper texture background */}
        <ellipse cx="130" cy="185" rx="90" ry="10" fill="#1A3B32" opacity="0.06" />
        
        {/* Journal base */}
        <motion.g
          initial={{ rotate: -2 }}
          animate={{ rotate: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
        >
          <path
            d="M 50 70 Q 50 50 70 50 L 190 50 Q 210 50 210 70 L 210 150 Q 210 170 190 170 L 70 170 Q 50 170 50 150 Z"
            fill="none"
            stroke="#1A3B32"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 50 70 Q 50 50 70 50 L 80 50 Q 60 50 60 70 L 60 150 Q 60 170 80 170 L 70 170 Q 50 170 50 150 Z"
            fill="#FAF6EB"
            stroke="#1A3B32"
            strokeWidth="2"
          />
          {/* Pages lines */}
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.5 }}>
            <line x1="75" y1="75" x2="185" y2="75" stroke="#1A3B32" strokeWidth="1.2" opacity="0.25" strokeLinecap="round" />
            <line x1="75" y1="90" x2="185" y2="90" stroke="#1A3B32" strokeWidth="1.2" opacity="0.2" strokeLinecap="round" />
            <line x1="75" y1="105" x2="160" y2="105" stroke="#1A3B32" strokeWidth="1.2" opacity="0.18" strokeLinecap="round" />
            <line x1="75" y1="120" x2="175" y2="120" stroke="#1A3B32" strokeWidth="1.2" opacity="0.15" strokeLinecap="round" />
          </motion.g>
        </motion.g>

        {/* Feather quill - floating above journal */}
        <motion.g
          initial={{ y: -10, rotate: 12, opacity: 0 }}
          animate={{ y: 0, rotate: 8, opacity: 1 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.35, type: "spring", bounce: 0.3 }}
        >
          {/* Feather shadow */}
          <ellipse cx="145" cy="48" rx="18" ry="4" fill="#1A3B32" opacity="0.08" />
          {/* Feather */}
          <g transform="translate(110, 15) rotate(22)">
            <path
              d="M 20 55 C 16 48 12 38 12 28 C 12 18 16 10 22 4 C 28 -2 36 -6 48 -8 C 50 -4 50 0 48 5 C 46 9 42 13 38 16 C 38 16 42 14 46 10 C 46 10 44 14 40 16 C 36 18 32 18 30 20 C 30 20 34 19 38 16 C 38 16 36 20 32 22 C 28 24 24 24 22 26 C 20 28 20 32 20 36 C 20 42 20 50 20 55 Z"
              fill="white"
              stroke="#1A3B32"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M 20 55 C 21 46 23 38 26 32 C 29 26 32 20 38 14"
              fill="none"
              stroke="#1A3B32"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </g>
        </motion.g>

        {/* Small accent dot - like Claude's orange dot */}
        <motion.circle
          cx="195"
          cy="35"
          r="14"
          fill="#1A3B32"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6, duration: 0.4, type: "spring", bounce: 0.5 }}
        />
      </svg>
    </motion.div>
  );
}

export function LoginClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "google" | "exchange">("idle");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phonePhase, setPhonePhase] = useState<
    "idle" | "sending" | "awaiting" | "verifying" | "failed"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const lastRequestedPhoneRef = useRef("");

  const phoneBusy =
    phonePhase === "sending" ||
    phonePhase === "awaiting" ||
    phonePhase === "verifying";
  const busy = phase !== "idle" || phoneBusy;

  const exchange = useCallback(
    async (idToken: string) => {
      setPhase("exchange");
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Sign-in verification failed.");
      }
      router.replace("/");
      router.refresh();
    },
    [router]
  );

  const resetPhoneVerifier = useCallback(() => {
    recaptchaRef.current?.clear();
    recaptchaRef.current = null;
  }, []);

  const verifyOtp = useCallback(
    async (code: string) => {
      const confirmation = confirmationRef.current;
      if (!confirmation || code.length !== 6 || phase !== "idle") return;

      setError(null);
      setPhonePhase("verifying");

      try {
        const result = await confirmation.confirm(code);
        const token = await result.user.getIdToken();
        await exchange(token);
      } catch (e) {
        setError(friendlyPhoneError(e));
        setPhonePhase("failed");
      }
    },
    [exchange, phase]
  );

  const requestPhoneCode = useCallback(
    async (digits: string) => {
      if (digits.length !== 10 || phase !== "idle") return;

      setError(null);
      setOtp("");
      setPhonePhase("sending");
      confirmationRef.current = null;
      resetPhoneVerifier();

      try {
        const verifier = createPhoneRecaptchaVerifier("phone-recaptcha-trigger");
        recaptchaRef.current = verifier;
        const confirmation = await sendPhoneVerificationCode(
          `+91${digits}`,
          verifier
        );
        confirmationRef.current = confirmation;
        setPhonePhase("awaiting");
      } catch (e) {
        setError(friendlyPhoneError(e));
        setPhonePhase("failed");
        confirmationRef.current = null;
        resetPhoneVerifier();
      }
    },
    [phase, resetPhoneVerifier]
  );

  useEffect(() => {
    if (phone.length !== 10) {
      lastRequestedPhoneRef.current = "";
      if (phone.length < 10 && phonePhase !== "idle") {
        setOtp("");
        setPhonePhase("idle");
        confirmationRef.current = null;
        resetPhoneVerifier();
      }
      return;
    }

    const canRequest =
      phonePhase === "idle" ||
      (phonePhase === "failed" && lastRequestedPhoneRef.current !== phone);

    if (
      phase === "idle" &&
      canRequest &&
      lastRequestedPhoneRef.current !== phone
    ) {
      lastRequestedPhoneRef.current = phone;
      void requestPhoneCode(phone);
    }
  }, [phone, phonePhase, phase, requestPhoneCode, resetPhoneVerifier]);

  useEffect(() => {
    if (phonePhase === "awaiting" && otp.length === 6) {
      void verifyOtp(otp);
    }
  }, [otp, phonePhase, verifyOtp]);

  useEffect(() => {
    let dead = false;
    consumeRedirectResult()
      .then((token) => {
        if (dead || !token) return;
        exchange(token).catch((e) => {
          if (!dead) {
            setError(friendlyError(e));
            setPhase("idle");
          }
        });
      })
      .catch((e) => {
        if (!dead) setError(friendlyError(e));
      });
    return () => {
      dead = true;
      recaptchaRef.current?.clear();
    };
  }, [exchange]);

  const signIn = async () => {
    setError(null);
    setPhase("google");
    try {
      await exchange(await signInWithGoogle());
    } catch (e) {
      if (e instanceof SignInCancelled) {
        setPhase("idle");
        return;
      }
      setError(friendlyError(e));
      setPhase("idle");
    }
  };

  const manualVerify = () => {
    if (otp.length === 6) void verifyOtp(otp);
  };

  return () => {
      dead = true;
      recaptchaRef.current?.clear();
    };
  }, [exchange]);

  const signIn = async () => {
    setError(null);
    setPhase("google");
    try {
      await exchange(await signInWithGoogle());
    } catch (e) {
      if (e instanceof SignInCancelled) {
        setPhase("idle");
        return;
      }
      setError(friendlyError(e));
      setPhase("idle");
    }
  };

  const manualVerify = () => {
    if (otp.length === 6) void verifyOtp(otp);
  };

  return () => {
      dead = true;
    };
  }, [exchange]);

  const signIn = async () => {
    setError(null);
    setPhase("google");
    try {
      await exchange(await signInWithGoogle());
    } catch (e) {
      if (e instanceof SignInCancelled) {
        setPhase("idle");
        return;
      }
      setError(friendlyError(e));
      setPhase("idle");
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#FEFDF9]">
      {/* Top bar - minimal like Claude */}
      <div className="flex items-center justify-between px-6 py-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full">
            <svg viewBox="0 0 200 200" className="h-full w-full" aria-label="Quill logo">
              <circle cx="100" cy="100" r="96" fill="#1A3B32" />
              <path d="M 92 172 C 84 158 68 138 65 110 C 62 88 70 70 82 56 C 94 42 116 28 148 18 C 151 28 152 40 147 52 C 142 62 134 70 126 76 C 126 76 136 73 144 66 C 144 66 140 76 132 82 C 124 88 114 90 108 96 C 108 96 118 94 126 88 C 126 88 120 98 110 102 C 100 106 92 108 88 114 C 84 120 84 130 86 138 C 88 148 90 162 92 172 Z" fill="white" />
              <path d="M 92 172 C 94 150 100 130 108 114 C 116 98 126 84 142 68 C 130 80 120 92 112 106 C 104 120 96 138 92 172 Z" fill="#1A3B32" />
            </svg>
          </div>
          <span className="font-display text-[22px] font-semibold tracking-[-0.02em]" style={{ color: "#1A3B32", fontFamily: "var(--font-jakarta)" }}>quill</span>
        </div>
        <ThemeToggle />
      </div>

      {/* Main content - centered like Claude */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 sm:px-8">
        <div className="w-full max-w-[360px]">
          <QuillIllustration />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5, ease: EASE }}
            className="mt-2 text-center"
          >
            <h1 className="font-display text-[32px] font-[550] leading-[1.15] tracking-[-0.03em] sm:text-[36px]" style={{ color: "#1A3B32" }}>
              The journal for
              <br />
              traders who think
            </h1>
            <p className="mx-auto mt-3 max-w-[300px] text-[14px] leading-relaxed text-[#6B6B6B]">
              A calm, private workspace for trades, notes and behavioural intelligence.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5, ease: EASE }}
            className="mt-10 flex flex-col"
          >
            <div className="relative">
              <div className="flex h-[48px] w-full items-center rounded-full border border-[#E8E5E0] bg-white px-5 shadow-[0_2px_8px_rgba(0,0,0,.06)] focus-within:border-[#E8E5E0] focus-within:ring-0 focus-within:outline-none">
                <span className="shrink-0 text-[15px] font-[500] text-[#1A3B32]">+91</span>
                <span className="mx-3 h-5 w-px bg-[#E8E5E0]" aria-hidden />
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => {
                    setError(null);
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                  }}
                  placeholder="Enter mobile number"
                  aria-label="Mobile number"
                  style={{
                    outline: "none",
                    boxShadow: "none",
                    border: "0",
                    background: "transparent",
                    color: "#1A1A1A",
                    caretColor: "#1A3B32",
                    WebkitAppearance: "none",
                    WebkitBoxShadow: "none",
                    WebkitTapHighlightColor: "transparent",
                  }}
                  className="min-w-0 flex-1 !appearance-none !border-0 !bg-transparent !outline-none !ring-0 !shadow-none placeholder:text-[#A3A3A3] focus:!border-0 focus:!bg-transparent focus:!outline-none focus:!ring-0 focus:!shadow-none focus-visible:!border-0 focus-visible:!bg-transparent focus-visible:!outline-none focus-visible:!ring-0"
                />
              </div>

              {phonePhase !== "idle" && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4"
                >
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter verification code"
                    aria-label="Verification code"
                    style={{
                      outline: "none",
                      boxShadow: "none",
                      border: "0",
                      background: "transparent",
                      color: "#1A1A1A",
                      caretColor: "#1A3B32",
                      WebkitAppearance: "none",
                      WebkitBoxShadow: "none",
                      WebkitTapHighlightColor: "transparent",
                    }}
                    className="flex h-[48px] w-full rounded-full border border-[#E8E5E0] bg-white px-5 text-center text-[15px] tracking-[0.28em] !appearance-none !outline-none !ring-0 !shadow-none focus:border-[#E8E5E0] focus:outline-none focus:ring-0 focus:shadow-none focus-visible:border-[#E8E5E0] focus-visible:outline-none focus-visible:ring-0"
                  />

                  <p className="mt-2 px-2 text-center text-[11px] text-[#9A9A9A]">
                    {phonePhase === "sending"
                      ? "Sending verification code…"
                      : phonePhase === "verifying"
                      ? "Verifying code…"
                      : "Code sent to +91 ••••••••" + phone.slice(-2)}
                  </p>

                  {phonePhase === "failed" && confirmationRef.current && (
                    <button
                      type="button"
                      onClick={manualVerify}
                      disabled={otp.length !== 6}
                      className="mt-3 h-[44px] w-full rounded-full border border-[#E8E5E0] bg-white px-6 text-[14px] font-[500] text-[#1A1A1A] shadow-[0_2px_8px_rgba(0,0,0,.06)] transition-all hover:border-[#D0CCC6] hover:bg-[#FFFEFB] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Verify code
                    </button>
                  )}
                </motion.div>
              )}

              <button
                id="phone-recaptcha-trigger"
                type="button"
                tabIndex={-1}
                aria-hidden
                className="pointer-events-none absolute left-0 top-0 h-px w-px opacity-0"
              />
            </div>

            <div className="mt-6 flex flex-col gap-5">
              <div className="flex items-center gap-3" aria-hidden>
                <span className="h-px flex-1 bg-[#E8E5E0]" />
                <span className="shrink-0 px-1 text-[12px] font-[500] text-[#A3A3A3]">or</span>
                <span className="h-px flex-1 bg-[#E8E5E0]" />
              </div>

              <button
                onClick={signIn}
                disabled={busy}
                className="group flex h-[48px] w-full items-center justify-center gap-3 rounded-full border border-[#E8E5E0] bg-white px-6 text-[15px] font-[500] text-[#1A1A1A] shadow-[0_2px_8px_rgba(0,0,0,.06)] transition-all hover:border-[#D0CCC6] hover:bg-[#FFFEFB] active:scale-[0.98] disabled:opacity-60"
              >
                {busy ? (
                  <motion.span
                    className="h-[18px] w-[18px] rounded-full border-2 border-[#1A3B32]/20 border-t-[#1A3B32]"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
                  />
                ) : (
                  <GoogleMark />
                )}
                {phase === "exchange"
                  ? "Opening your workspace…"
                  : phase === "google"
                  ? "Waiting for Google…"
                  : "Continue with Google"}
              </button>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 px-2 text-center text-[13px] leading-relaxed text-[#D84C43]"
              >
                {error}
              </motion.p>
            )}

            <p className="mt-3 px-4 text-center text-[11px] leading-[1.5] text-[#9A9A9A]">
              By continuing, you agree to Quill&apos;s{" "}
              <a href="#" className="underline decoration-[#9A9A9A]/40 underline-offset-2 hover:text-[#1A1A1A] hover:decoration-[#1A1A1A]">
                Terms
              </a>{" "}
              and{" "}
              <a href="#" className="underline decoration-[#9A9A9A]/40 underline-offset-2 hover:text-[#1A1A1A] hover:decoration-[#1A1A1A]">
                Privacy Policy
              </a>
              .
            </p>
          </motion.div>
        </div>
      </div>

    </div>
  );
}
