'use client';

import { LogOutIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

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
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={logout}
      disabled={pending}
      className="min-h-11"
    >
      <LogOutIcon data-icon="inline-start" />
      Log out
    </Button>
  );
}
