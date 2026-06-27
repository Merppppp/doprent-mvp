"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type ConfirmOptions = {
  /** Modal title. Default: "ยืนยัน". */
  title?: string;
  /** Body text — the question itself. */
  message: string;
  /** Confirm button label. Default: "ยืนยัน". */
  confirmLabel?: string;
  /** Cancel button label. Default: "ยกเลิก". */
  cancelLabel?: string;
  /** Visual tone: "default" = primary blue, "danger" = red. */
  variant?: "default" | "danger";
};

type PromptOptions = {
  /** Modal title. Default: "กรอกข้อมูล". */
  title?: string;
  /** Body text — the question / instruction. */
  message: string;
  /** Placeholder for the input field. */
  placeholder?: string;
  /** Default value for the input. */
  defaultValue?: string;
  /** Confirm button label. Default: "ตกลง". */
  confirmLabel?: string;
  /** Cancel button label. Default: "ยกเลิก". */
  cancelLabel?: string;
  /** If true, the input must be non-empty to submit. */
  required?: boolean;
};

type ConfirmFn = (opts: ConfirmOptions | string) => Promise<boolean>;
type PromptFn = (opts: PromptOptions | string) => Promise<string | null>;

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

const ConfirmContext = createContext<ConfirmFn | null>(null);
const PromptContext = createContext<PromptFn | null>(null);

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return fn;
}

export function usePrompt(): PromptFn {
  const fn = useContext(PromptContext);
  if (!fn) throw new Error("usePrompt must be used inside <ConfirmProvider>");
  return fn;
}

/* ------------------------------------------------------------------ */
/*  Provider                                                          */
/* ------------------------------------------------------------------ */

type ConfirmState = ConfirmOptions & { resolve: (ok: boolean) => void };
type PromptState = PromptOptions & { resolve: (val: string | null) => void };

export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [promptState, setPromptState] = useState<PromptState | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    const normalized: ConfirmOptions =
      typeof opts === "string" ? { message: opts } : opts;
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...normalized, resolve });
    });
  }, []);

  const closeConfirm = useCallback(
    (ok: boolean) => {
      confirmState?.resolve(ok);
      setConfirmState(null);
    },
    [confirmState],
  );

  const showPrompt = useCallback<PromptFn>((opts) => {
    const normalized: PromptOptions =
      typeof opts === "string" ? { message: opts } : opts;
    return new Promise<string | null>((resolve) => {
      setPromptState({ ...normalized, resolve });
    });
  }, []);

  const closePrompt = useCallback(
    (val: string | null) => {
      promptState?.resolve(val);
      setPromptState(null);
    },
    [promptState],
  );

  return (
    <ConfirmContext.Provider value={confirm}>
      <PromptContext.Provider value={showPrompt}>
        {children}

        {confirmState && (
          <ConfirmModal
            title={confirmState.title}
            message={confirmState.message}
            confirmLabel={confirmState.confirmLabel}
            cancelLabel={confirmState.cancelLabel}
            variant={confirmState.variant}
            onConfirm={() => closeConfirm(true)}
            onCancel={() => closeConfirm(false)}
          />
        )}

        {promptState && (
          <PromptModal
            title={promptState.title}
            message={promptState.message}
            placeholder={promptState.placeholder}
            defaultValue={promptState.defaultValue}
            confirmLabel={promptState.confirmLabel}
            cancelLabel={promptState.cancelLabel}
            required={promptState.required}
            onConfirm={(val) => closePrompt(val)}
            onCancel={() => closePrompt(null)}
          />
        )}
      </PromptContext.Provider>
    </ConfirmContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Confirm Modal                                                     */
/* ------------------------------------------------------------------ */

function ConfirmModal({
  title = "ยืนยัน",
  message,
  confirmLabel = "ยืนยัน",
  cancelLabel = "ยกเลิก",
  variant = "default",
  onConfirm,
  onCancel,
}: {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  const confirmBtnCls =
    variant === "danger"
      ? "btn bg-red-600 text-white hover:bg-red-700 active:bg-red-800"
      : "btn btn-primary";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-[380px] rounded-2xl bg-[var(--bg,#fff)] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.18)]">
        <h3 className="mb-1 text-base font-bold text-[var(--ink)]">{title}</h3>
        <p className="mb-5 text-[13px] leading-relaxed text-[var(--ink-2)]">
          {message}
        </p>
        <div className="flex gap-2.5">
          <button
            type="button"
            className="btn btn-outline flex-1 py-2.5"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`${confirmBtnCls} flex-1 py-2.5 font-semibold`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Prompt Modal                                                      */
/* ------------------------------------------------------------------ */

function PromptModal({
  title = "กรอกข้อมูล",
  message,
  placeholder = "",
  defaultValue = "",
  confirmLabel = "ตกลง",
  cancelLabel = "ยกเลิก",
  required = false,
  onConfirm,
  onCancel,
}: {
  title?: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  required?: boolean;
  onConfirm: (val: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  const canSubmit = !required || value.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-[420px] rounded-2xl bg-[var(--bg,#fff)] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.18)]">
        <h3 className="mb-1 text-base font-bold text-[var(--ink)]">{title}</h3>
        <p className="mb-3 text-[13px] leading-relaxed text-[var(--ink-2)]">
          {message}
        </p>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSubmit) onConfirm(value.trim());
          }}
          className="mb-4 w-full rounded-lg border border-[var(--line)] bg-[var(--surface,#fff)] px-3 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-3)] outline-none focus:border-[var(--accent)]"
        />
        <div className="flex gap-2.5">
          <button
            type="button"
            className="btn btn-outline flex-1 py-2.5"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn btn-primary flex-1 py-2.5 font-semibold"
            disabled={!canSubmit}
            onClick={() => onConfirm(value.trim())}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
