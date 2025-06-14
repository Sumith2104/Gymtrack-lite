import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 bg-background">
      {/* AppHeader will be rendered by RootLayout if not on /login (logic in RootLayout) */}
      <LoginForm />
    </div>
  );
}
