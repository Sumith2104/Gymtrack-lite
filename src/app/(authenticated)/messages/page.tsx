
import { Suspense } from 'react';
import { MessagesClientPage } from './messages-client-page';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare } from 'lucide-react';

export default function MessagesPage() {
  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-var(--header-height,10rem))]">
      <div className="mb-2">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight flex items-center">
          <MessageSquare className="mr-3 h-8 w-8" /> Messages
        </h1>
        <p className="text-muted-foreground mt-1">Select a member to view or start a conversation.</p>
        <div className="mt-3 h-1 w-24 bg-primary rounded-full"></div>
      </div>

      <Suspense fallback={<MessagesPageSkeleton />}>
        <MessagesClientPage />
      </Suspense>
    </div>
  );
}

function MessagesPageSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
      <Skeleton className="md:col-span-1 h-full min-h-[500px]" />
      <Skeleton className="md:col-span-2 h-full min-h-[500px]" />
    </div>
  );
}
