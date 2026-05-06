import { useState, useEffect, useCallback, useRef } from "react";

export interface UseRecaptchaOptions {
  siteKey?: string;
  theme?: string;
}

export interface UseRecaptchaReturn {
  recaptchaRef: React.RefObject<HTMLDivElement>;
  recaptchaToken: string;
  isRecaptchaLoaded: boolean;
  resetRecaptcha: () => void;
}

export function useRecaptcha(
  options: UseRecaptchaOptions = {}
): UseRecaptchaReturn {
  const {
    siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
    theme = "dark",
  } = options;

  const recaptchaRef = useRef<HTMLDivElement>(null);

  const [recaptchaWidgetId, setRecaptchaWidgetId] = useState<number | null>(null);
  const [isRecaptchaLoaded, setIsRecaptchaLoaded] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState("");

  // Load reCAPTCHA script
  useEffect(() => {
    if (!siteKey || !recaptchaRef.current) {
      setIsRecaptchaLoaded(true);
      return;
    }

    // Check if already loaded
    if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).grecaptcha) {
      initializeWidget();
      return;
    }

    // Load script
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=explicit&onload=reCAPTCHALoaded`;
    script.async = true;
    script.defer = true;
    script.onerror = () => console.error("Failed to load reCAPTCHA");
    document.head.appendChild(script);

    (window as unknown as Record<string, () => void>).reCAPTCHALoaded = () => {
      initializeWidget();
    };

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [siteKey]);

  const initializeWidget = useCallback(() => {
    if (!recaptchaRef.current) return;

    const grecaptcha = (window as unknown as Record<string, unknown>)
      .grecaptcha as {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          theme: string;
        }
      ) => number;
      reset: (id: number) => void;
    };

    if (grecaptcha && recaptchaRef.current && siteKey) {
      const widgetId = grecaptcha.render(recaptchaRef.current, {
        sitekey: siteKey,
        callback: (token: string) => {
          setRecaptchaToken(token);
        },
        "expired-callback": () => {
          setRecaptchaToken("");
        },
        theme,
      });
      setRecaptchaWidgetId(widgetId);
      setIsRecaptchaLoaded(true);
    }
  }, [siteKey, theme]);

  const resetRecaptcha = useCallback(() => {
    const grecaptcha = (window as unknown as Record<string, unknown>)
      .grecaptcha as { reset?: (id: number) => void } | undefined;
    if (grecaptcha?.reset && recaptchaWidgetId !== null) {
      grecaptcha.reset(recaptchaWidgetId);
      setRecaptchaToken("");
    }
  }, [recaptchaWidgetId]);

  return {
    recaptchaRef,
    recaptchaToken,
    isRecaptchaLoaded,
    resetRecaptcha,
  };
}
