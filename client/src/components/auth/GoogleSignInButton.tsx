import { useEffect, useRef, useState } from "react";

interface GoogleSignInButtonProps {
  onSuccess: (credential: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  text?: "signin_with" | "signup_with" | "continue_with";
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with";
              shape?: "rectangular" | "pill" | "circle" | "square";
              logo_alignment?: "left" | "center";
              width?: number | string;
            }
          ) => void;
          prompt?: (notification?: unknown) => void;
        };
      };
    };
    __freelancrGoogleInitialized?: boolean;
    __freelancrGoogleClientId?: string;
    __freelancrGoogleActiveCallback?: (response: { credential?: string }) => void;
  }
}

export default function GoogleSignInButton({
  onSuccess,
  onError,
  disabled = false,
  text = "continue_with",
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const hasConfig = Boolean(googleClientId);

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Keep the latest callback active without re-triggering initialize
  useEffect(() => {
    window.__freelancrGoogleActiveCallback = (response: { credential?: string }) => {
      if (response.credential) {
        onSuccess(response.credential);
      } else {
        const err = "No credential received from Google Identity Services.";
        setRenderError(err);
        if (onError) onError(err);
      }
    };
  }, [onSuccess, onError]);

  // Load GIS Script
  useEffect(() => {
    if (!hasConfig) return;

    let isMounted = true;

    if (window.google?.accounts?.id) {
      queueMicrotask(() => {
        if (isMounted) setScriptLoaded(true);
      });
      return;
    }

    let script = document.getElementById("google-identity-services") as HTMLScriptElement | null;

    const onScriptLoad = () => {
      if (isMounted) {
        if (window.google?.accounts?.id) {
          setScriptLoaded(true);
          setLoadError(null);
        } else {
          const msg = "Google Identity Services script loaded but library not available on window.";
          setLoadError(msg);
          if (onError) onError(msg);
        }
      }
    };

    const onScriptError = () => {
      if (isMounted) {
        const msg = "Failed to load Google Identity Services SDK from accounts.google.com/gsi/client.";
        setLoadError(msg);
        if (onError) onError(msg);
      }
    };

    if (!script) {
      script = document.createElement("script");
      script.id = "google-identity-services";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = onScriptLoad;
      script.onerror = onScriptError;
      document.head.appendChild(script);
    } else {
      script.addEventListener("load", onScriptLoad);
      script.addEventListener("error", onScriptError);
    }

    return () => {
      isMounted = false;
      if (script) {
        script.removeEventListener("load", onScriptLoad);
        script.removeEventListener("error", onScriptError);
      }
    };
  }, [hasConfig, retryCount, onError]);

  // Initialize once and Render Button into Container
  useEffect(() => {
    if (!scriptLoaded || !hasConfig || !googleClientId || !containerRef.current) {
      return;
    }

    try {
      if (window.google?.accounts?.id) {
        // Enforce single initialization across page lifetime
        if (!window.__freelancrGoogleInitialized || window.__freelancrGoogleClientId !== googleClientId) {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: (response) => {
              if (window.__freelancrGoogleActiveCallback) {
                window.__freelancrGoogleActiveCallback(response);
              }
            },
            cancel_on_tap_outside: true,
          });
          window.__freelancrGoogleInitialized = true;
          window.__freelancrGoogleClientId = googleClientId;
        }

        containerRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          text,
          shape: "rectangular",
          width: containerRef.current.offsetWidth || 340,
          logo_alignment: "left",
        });
      }
    } catch (err: unknown) {
      console.warn("Failed to render Google Identity Services button:", err);
      const msg = err instanceof Error ? err.message : "Error rendering Google button";
      queueMicrotask(() => {
        setRenderError(msg);
      });
      if (onError) onError(msg);
    }
  }, [scriptLoaded, hasConfig, googleClientId, text, onError]);

  // Fallback 1: Configuration Missing in client/.env
  if (!hasConfig) {
    return (
      <div className="w-full">
        <button
          type="button"
          disabled={true}
          title="Google Client ID missing in client/.env (VITE_GOOGLE_CLIENT_ID)"
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-sm font-medium cursor-not-allowed"
        >
          <svg className="w-4 h-4 opacity-50" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.67v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.16z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>
        <div className="mt-2 text-center p-2.5 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-[11px] font-semibold text-amber-900">
            Google Client ID not configured
          </p>
          <p className="text-[10px] text-amber-700 mt-0.5 leading-relaxed">
            Set <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded font-bold">VITE_GOOGLE_CLIENT_ID</code> in <code className="font-mono">client/.env</code> and restart Vite dev server.
          </p>
        </div>
      </div>
    );
  }

  // Fallback 2: Script or Render Error with Actionable Retry
  if (loadError || renderError) {
    const errorText = loadError || renderError;
    return (
      <div className="w-full space-y-2">
        <button
          type="button"
          onClick={() => {
            setLoadError(null);
            setRenderError(null);
            setRetryCount((prev) => prev + 1);
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Retry loading Google Sign-In</span>
        </button>
        {errorText && (
          <p className="text-[11px] text-center text-red-600">
            {errorText}
          </p>
        )}
      </div>
    );
  }

  // Fallback 3: Loading Google Identity Script
  if (!scriptLoaded) {
    return (
      <div className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-xs font-medium animate-pulse">
        <svg className="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span>Loading Google Identity Services...</span>
      </div>
    );
  }

  // Ready State: Google GIS Button Container
  return (
    <div className={`w-full flex justify-center ${disabled ? "opacity-60 pointer-events-none" : ""}`}>
      <div ref={containerRef} className="w-full flex justify-center min-h-[44px]" />
    </div>
  );
}
