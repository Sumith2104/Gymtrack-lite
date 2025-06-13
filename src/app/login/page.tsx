import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-gray-900">
      {/* AppHeader will be rendered by RootLayout */}
      <LoginForm />
    </div>
  );
}
