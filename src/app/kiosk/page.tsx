import { CheckinForm } from '@/components/kiosk/checkin-form';
import { APP_NAME, APP_LOGO as AppLogoIcon } from '@/lib/constants';

export default function KioskPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-gray-900 selection:bg-primary selection:text-primary-foreground">
      <div className="absolute top-8 left-8 flex items-center gap-2 text-foreground/80">
        <AppLogoIcon className="h-8 w-8 text-primary" />
        <span className="text-xl font-headline">{APP_NAME}</span>
      </div>
      <CheckinForm />
      <footer className="absolute bottom-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} {APP_NAME}. For assistance, please see reception.</p>
      </footer>
    </div>
  );
}
