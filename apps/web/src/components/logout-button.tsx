'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    const ok = await fetch('/api/auth/logout', { method: 'POST' }).then(
      (res) => res.ok,
      () => false,
    );
    if (ok) {
      router.replace('/login');
      router.refresh();
    } else {
      // The API couldn't revoke the session; this route deletes the cookie here and goes to /login.
      window.location.assign('/session-expired');
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      className="min-h-11 rounded-full border border-line px-5 text-sm text-text-dim transition-colors hover:border-brass hover:text-brass disabled:opacity-60"
    >
      Log out
    </button>
  );
}
