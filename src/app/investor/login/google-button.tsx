"use client";

import { useFormStatus } from "react-dom";
import { AuthItem } from "@/client/components/site/auth-shell";

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.8 6C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.8A14.6 14.6 0 0 1 9.5 24c0-1.7.3-3.3.9-4.8l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}

function Button({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="auth-google" disabled={pending}>
      <GoogleG />
      {pending ? "Opening Google…" : label}
    </button>
  );
}

export function GoogleSignIn({
  action,
  next,
  hint,
}: {
  action: (formData: FormData) => Promise<void>;
  next?: string | null;
  hint?: string | null;
}) {
  return (
    <AuthItem>
      <form action={action}>
        <input type="hidden" name="next" value={next ?? ""} />
        <input type="hidden" name="hint" value={hint ?? ""} />
        <Button label="Continue with Google" />
      </form>
      {hint ? (
        <p className="auth-hint">
          Use <b>{hint}</b>, the address Sidana wrote to.
        </p>
      ) : null}
    </AuthItem>
  );
}

export function SignOutButton({ action }: { action: () => Promise<void> }) {
  return (
    <AuthItem>
      <form action={action}>
        <button type="submit" className="auth-google">
          Use a different Google account
        </button>
      </form>
    </AuthItem>
  );
}
