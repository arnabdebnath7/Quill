"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ConfirmationResult } from "firebase/auth";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";
import { QuillLogoMark } from "@/components/quill-logo";
import { confirmPhoneCode, isFirebaseError, sendPhoneCode, signInWithGoogle, SignInCancelled } from "@/lib/firebase";
import { QuillIllustration } from "./illustration";

const EASE = [0.22, 1, 0.36, 1] as const;
const COUNTRY_CODE = "+91";
const RESEND_SECONDS = 30;

type Step = "phone" | "otp";
type Status = "idle" | "google" | "sending" | "verifying" | "exchanging";

class ExchangeError extends Error {}

/**
 * Normalises whatever lands in the phone field (typing, paste, browser autofill)
 * into the 10 national digits of an Indian mobile number.
 *   "+91 98765 43210" → "9876543210", "09876543210" → "9876543210"
 */
function normaliseIndianMobile(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

function isValidIndianMobile(digits: string) {
  return /^[6-9]\d{9}$/.test(digits);
}

function describeError(error: unknown, context: "phone" | "otp" | "google"): string {
  if (error instanceof ExchangeError) return error.message;
  if (isFirebaseError(error)) {
    switch (error.code) {
      case "auth/invalid-phone-number":
      case "auth/missing-phone-number":
        return "That doesn't look like a valid Indian mobile number.";
      case "auth/invalid-verification-code":
      case "auth/missing-verification-code":
        return "That code isn't right. Check the SMS and try again.";
      case "auth/code-expired":
        return "That code has expired. Tap “Resend code” to get a fresh one.";
      case "auth/too-many-requests":
        return "Too many attempts from this device. Wait a few minutes and try again, or continue with Google.";
      case "auth/quota-exceeded":
        return "The SMS limit has been reached for now. Please try again later or continue with Google.";
      case "auth/billing-not-enabled":
      case "auth/operation-not-allowed":
        return "Phone sign-in isn't switched on for this app yet. Please continue with Google for now.";
      case "auth/unauthorized-domain":
        return "Sign-in isn't authorised on this web address yet. Please use the official Quill link.";
      case "auth/captcha-check-failed":
      case "auth/invalid-app-credential":
      case "auth/missing-app-credential":
        return "The security check didn't go through. Please try again.";
      case "auth/network-request-failed":
        return "Couldn't reach the sign-in service. Check your connection and try again.";
      case "auth/popup-blocked":
        return "Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.";
      case "auth/account-exists-with-different-credential":
        return "This email is already linked to a different sign-in method.";
      case "auth/user-disabled":
        return "This account has been disabled.";
      default:
        return `${context === "google" ? "Google sign-in" : "Phone sign-in"} failed (${error.code.replace("auth/", "")}). Please try again.`;
    }
  }
  if (error instanceof TypeError) return "Couldn't reach Quill. Check your connection and try again.";
  return "Something went wrong. Please try again.";
}

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

function Spinner() {
  return (
    <motion.span
      className="h-[18px] w-[18px] shrink-0 rounded-full border-2 border-brand/20 border-t-brand"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
    />
  );
}

const pillButton =
  "flex h-12 w-full items-center justify-center gap-3 rounded-full border border-line bg-card px-6 text-[15px] font-medium text-ink shadow-[0_2px_8px_rgba(0,0,0,.06)] transition-all hover:border-line-strong hover:bg-paper-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 cursor-pointer";
const pillField = "flex h-12 w-full items-center rounded-full border border-line bg-card px-5 shadow-[0_2px_8px_rgba(0,0,0,.06)] transition-colors focus-within:border-brand/50";
const bareInput = "min-w-0 flex-1 border-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint focus:outline-none focus:ring-0";

export function LoginClient() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("phone");
  const [status, setStatus] = useState<Status>("idle");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaHostRef = useRef<HTMLDivElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const autoSubmittedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const busy = status !== "idle";
  const phoneValid = isValidIndianMobile(phone);
  const maskedPhone = `${COUNTRY_CODE} ••••• •${phone.slice(-4)}`;

  const exchange = useCallback(
    async (idToken: string) => {
      const res = await fetch("/api/auth/firebase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ExchangeError(body?.error || "Quill couldn't finish signing you in. Please try again.");
      }
      router.replace("/today");
      router.refresh();
    },
    [router],
  );

  const requestCode = useCallback(
    async (digits: string) => {
      if (busy) return;
      if (!isValidIndianMobile(digits)) {
        setError("Enter the 10-digit mobile number linked to your account.");
        return;
      }
      const host = recaptchaHostRef.current;
      if (!host) return;
      setError(null);
      setStatus("sending");
      try {
        confirmationRef.current = await sendPhoneCode(host, `${COUNTRY_CODE}${digits}`);
        if (!mountedRef.current) return;
        autoSubmittedRef.current = false;
        setOtp("");
        setStep("otp");
        setCooldown(RESEND_SECONDS);
        window.setTimeout(() => otpInputRef.current?.focus(), 350);
      } catch (err) {
        console.error("[login] sending OTP failed", err);
        if (!mountedRef.current) return;
        setError(describeError(err, "phone"));
      } finally {
        if (mountedRef.current) setStatus("idle");
      }
    },
    [busy],
  );

  const verifyCode = useCallback(
    async (code: string) => {
      const confirmation = confirmationRef.current;
      if (busy || code.length !== 6 || !confirmation) return;
      setError(null);
      setStatus("verifying");
      try {
        const idToken = await confirmPhoneCode(confirmation, code);
        if (!mountedRef.current) return;
        setStatus("exchanging");
        await exchange(idToken);
        // Navigation is in flight — keep the button in its "opening" state.
      } catch (err) {
        console.error("[login] verifying OTP failed", err);
        if (!mountedRef.current) return;
        setError(describeError(err, "otp"));
        setStatus("idle");
        if (isFirebaseError(err) && err.code === "auth/invalid-verification-code") {
          setOtp("");
          autoSubmittedRef.current = false;
          window.setTimeout(() => otpInputRef.current?.focus(), 50);
        }
      }
    },
    [busy, exchange],
  );

  const onOtpChange = (raw: string) => {
    const code = raw.replace(/\D/g, "").slice(0, 6);
    setError(null);
    setOtp(code);
    if (code.length < 6) {
      autoSubmittedRef.current = false;
    } else if (!autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      void verifyCode(code);
    }
  };

  const changeNumber = () => {
    if (busy) return;
    confirmationRef.current = null;
    setOtp("");
    setError(null);
    setStep("phone");
  };

  const continueWithGoogle = async () => {
    if (busy) return;
    setError(null);
    setStatus("google");
    try {
      const idToken = await signInWithGoogle();
      if (!mountedRef.current) return;
      setStatus("exchanging");
      await exchange(idToken);
    } catch (err) {
      if (!mountedRef.current) return;
      if (!(err instanceof SignInCancelled)) {
        console.error("[login] Google sign-in failed", err);
        setError(describeError(err, "google"));
      }
      setStatus("idle");
    }
  };

  const googleLabel = status === "exchanging" ? "Opening your workspace…" : status === "google" ? "Waiting for Google…" : "Continue with Google";
  const otpHint =
    status === "verifying" ? "Verifying code…" : status === "exchanging" ? "Opening your workspace…" : status === "sending" ? "Sending a new code…" : `Code sent to ${maskedPhone}`;

  return (
    <div className="themed relative flex min-h-dvh flex-col bg-paper text-ink">
      <div className="flex items-center justify-between px-6 py-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <QuillLogoMark size={32} className="shrink-0 overflow-hidden rounded-full" />
          <span className="font-display text-[22px] font-semibold tracking-[-0.02em] text-brand">quill</span>
        </div>
        <ThemeToggle />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 sm:px-8">
        <div className="w-full max-w-[360px]">
          <QuillIllustration />

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5, ease: EASE }} className="mt-2 text-center">
            <h1 className="font-display text-[32px] font-[550] leading-[1.15] tracking-[-0.03em] text-brand sm:text-[36px]">
              The journal for
              <br />
              traders who think
            </h1>
            <p className="mx-auto mt-3 max-w-[300px] text-[14px] leading-relaxed text-sub">A calm, private workspace for trades, notes and behavioural intelligence.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: EASE }} className="mt-10 flex flex-col">
            <AnimatePresence initial={false} mode="wait">
              {step === "phone" ? (
                <motion.form
                  key="phone"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -18 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="flex flex-col"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void requestCode(phone);
                  }}
                >
                  <label className={pillField}>
                    <span className="shrink-0 text-[15px] font-medium text-brand">{COUNTRY_CODE}</span>
                    <span className="mx-3 h-5 w-px bg-line-strong" aria-hidden />
                    <input
                      type="tel"
                      name="phone"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      value={phone}
                      disabled={busy}
                      onChange={(e) => {
                        setError(null);
                        setPhone(normaliseIndianMobile(e.target.value));
                      }}
                      placeholder="Enter mobile number"
                      aria-label="Mobile number"
                      className={bareInput}
                    />
                  </label>

                  <button type="submit" disabled={!phoneValid || busy} className={`${pillButton} mt-5`}>
                    {status === "sending" ? (
                      <>
                        <Spinner /> Sending code…
                      </>
                    ) : (
                      "Continue with phone"
                    )}
                  </button>

                  <div className="mt-5 flex items-center gap-3" aria-hidden>
                    <span className="h-px flex-1 bg-line-strong" />
                    <span className="shrink-0 px-1 text-[12px] font-medium text-faint">or</span>
                    <span className="h-px flex-1 bg-line-strong" />
                  </div>

                  <button type="button" onClick={continueWithGoogle} disabled={busy} className={`${pillButton} mt-5`}>
                    {status === "google" || status === "exchanging" ? <Spinner /> : <GoogleMark />}
                    {googleLabel}
                  </button>
                </motion.form>
              ) : (
                <motion.form
                  key="otp"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="flex flex-col"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void verifyCode(otp);
                  }}
                >
                  <div className="flex items-center justify-between px-1">
                    <button type="button" onClick={changeNumber} disabled={busy} className="cursor-pointer text-[12px] font-medium text-sub transition-colors hover:text-brand disabled:opacity-60">
                      Change number
                    </button>
                    <span className="text-[12px] tabular text-faint">{maskedPhone}</span>
                  </div>

                  <label className={`${pillField} mt-4`}>
                    <input
                      ref={otpInputRef}
                      type="text"
                      name="otp"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={otp}
                      disabled={busy}
                      onChange={(e) => onOtpChange(e.target.value)}
                      placeholder="6-digit code"
                      aria-label="Verification code"
                      className={`${bareInput} text-center tracking-[0.3em] placeholder:tracking-normal`}
                    />
                  </label>

                  <p className="mt-2 px-2 text-center text-[11px] text-faint" aria-live="polite">
                    {otpHint}
                  </p>

                  <button type="submit" disabled={otp.length !== 6 || busy} className={`${pillButton} mt-4`}>
                    {status === "verifying" || status === "exchanging" ? (
                      <>
                        <Spinner /> {status === "exchanging" ? "Opening your workspace…" : "Verifying…"}
                      </>
                    ) : (
                      "Verify code"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => void requestCode(phone)}
                    disabled={busy || cooldown > 0}
                    className="mt-4 cursor-pointer self-center text-[12.5px] font-medium text-sub transition-colors hover:text-brand disabled:cursor-default disabled:opacity-60 disabled:hover:text-sub"
                  >
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : "Didn't get it? Resend code"}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.p
                key={error}
                role="alert"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 px-2 text-center text-[13px] leading-relaxed text-down"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Host for Firebase's invisible reCAPTCHA. A fresh child element is created for every attempt. */}
          <div ref={recaptchaHostRef} aria-hidden />

          <p className="mt-6 px-4 text-center text-[11px] leading-[1.6] text-faint">
            Protected by reCAPTCHA. The Google{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="underline decoration-faint/40 underline-offset-2 hover:text-ink">
              Privacy Policy
            </a>{" "}
            and{" "}
            <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" className="underline decoration-faint/40 underline-offset-2 hover:text-ink">
              Terms of Service
            </a>{" "}
            apply.
          </p>
        </div>
      </div>
    </div>
  );
}
