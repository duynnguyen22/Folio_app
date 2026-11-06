import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth-card';
import { AuthForm } from '@/components/auth-form';

export const metadata: Metadata = { title: 'Sign in · Folio' };

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      footer={{ text: 'New to Folio?', linkText: 'Create an account', href: '/signup' }}
    >
      <AuthForm mode="login" />
    </AuthCard>
  );
}
