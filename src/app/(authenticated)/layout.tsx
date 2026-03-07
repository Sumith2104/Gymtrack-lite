import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth-service';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session.isAuthenticated) {
    redirect('/login');
  }

  return (
    <div className="flex-1 w-full max-w-screen-2xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}
