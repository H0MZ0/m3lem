"use client";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useId,
} from "react";
import type { Mutation, Outcome } from "@/lib/forms";
function field(target: EventTarget) {
  return target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
    ? target
    : null;
}
export function ActionForm({
  action,
  children,
  className = "",
  keepValues = false,
}: {
  action: Mutation;
  children: React.ReactNode;
  className?: string;
  keepValues?: boolean;
}) {
  const [state, run, pending] = useActionState<Outcome, FormData>(action, {});
  const form = useRef<HTMLFormElement>(null),
    messageId = useId();
  useEffect(() => {
    if (!state.field) return;
    const input = form.current?.elements.namedItem(state.field);
    if (!(input instanceof HTMLElement)) return;
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", messageId);
    input.focus();
    return () => {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
    };
  }, [state, messageId]);
  return (
    <form
      action={run}
      ref={form}
      onSubmit={
        keepValues
          ? (e) => {
              e.preventDefault();
              const data = new FormData(
                e.currentTarget,
                (e.nativeEvent as SubmitEvent).submitter,
              );
              startTransition(() => run(data));
            }
          : undefined
      }
      className={className}
      aria-busy={pending}
      onInputCapture={(e) => field(e.target)?.setCustomValidity("")}
      onInvalidCapture={(e) => {
        const input = field(e.target);
        if (!input) return;
        input.setCustomValidity("");
        const ar = document.documentElement.dir === "rtl",
          v = input.validity;
        if (v.valid) return;
        const text = v.valueMissing
          ? ar
            ? "عمّر هاد الخانة."
            : "Renseignez ce champ."
          : v.typeMismatch
            ? ar
              ? "راجع صيغة هاد المعلومة."
              : "Vérifiez le format de cette valeur."
            : v.tooShort && "minLength" in input
              ? ar
                ? `كتب على الأقل ${input.minLength} حروف.`
                : `Saisissez au moins ${input.minLength} caractères.`
              : ar
                ? "راجع القيمة والحدود ديال هاد الخانة."
                : "Vérifiez la valeur et les limites de ce champ.";
        input.setCustomValidity(text);
      }}
    >
      <fieldset className="contents" disabled={pending}>
        {children}
      </fieldset>
      {state.message && (
        <p
          id={messageId}
          className={state.ok ? "notice" : "problem"}
          role="status"
        >
          {state.message}
        </p>
      )}
      {state.link && (
        <p>
          <a className="invite" href={state.link}>
            {state.link}
          </a>
        </p>
      )}
    </form>
  );
}
