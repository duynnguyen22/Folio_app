import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth-card';
import { AuthForm } from '@/components/auth-form';

export const metadata: Metadata = { title: 'Create account · Folio' };

export default function SignupPage() {
  return (
    <AuthCard
      title="Open your room"
      footer={{ text: 'Already have an account?', linkText: 'Sign in', href: '/login' }}
    >
      <AuthForm mode="signup" />
    </AuthCard>
  );
}
