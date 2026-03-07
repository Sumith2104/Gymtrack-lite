'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export function DashboardWarnings() {
    const { toast } = useToast();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const showUpiToast = localStorage.getItem('showUpiToast');
            if (showUpiToast === 'true') {
                toast({
                    title: "Setup Payments",
                    description: "No UPI ID is integrated. Please set it up in your profile to receive payments.",
                    duration: 9000,
                });
                localStorage.removeItem('showUpiToast');
            }

            const showInactiveSoonToast = localStorage.getItem('showInactiveSoonToast');
            if (showInactiveSoonToast === 'true') {
                toast({
                    title: "Account Warning",
                    description: "Your gym account will be inactive soon. Please contact support.",
                    duration: 9000,
                    variant: 'destructive',
                });
                localStorage.removeItem('showInactiveSoonToast');
            }
        }
    }, [toast]);

    return null;
}
