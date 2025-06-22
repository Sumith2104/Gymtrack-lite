
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HardHat, RotateCw, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UpiForm } from './upi-form';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SmtpForm } from './smtp-form';
import { ChangeEmailForm } from './change-email-form';

export function MaintenanceSection() {
    const { toast } = useToast();

    const handleCacheClear = () => {
        window.dispatchEvent(new Event('clear-cache-and-refetch'));
        toast({
            title: "Cache Cleared",
            description: "Requesting fresh data from the server...",
        });
    };

    const handleResync = () => {
        toast({
            title: "Re-syncing Data",
            description: "Refreshing all data on the page...",
        });
        // Use a small delay to allow the toast to appear before the page reloads
        setTimeout(() => {
            window.location.reload();
        }, 500);
    };

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center">
                    <HardHat className="mr-2 h-5 w-5 text-primary" /> Maintenance & Settings
                </CardTitle>
                <CardDescription>
                    Manage system settings and perform maintenance actions. Use with caution.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1" className="border-b-0">
                        <AccordionTrigger className="hover:no-underline rounded-md px-4 py-2 bg-muted/50 hover:bg-muted">
                            <span className="font-medium text-foreground">Click to Show/Hide Maintenance Options</span>
                        </AccordionTrigger>
                        <AccordionContent className="pt-6 space-y-6">
                            <ChangeEmailForm />

                            <Separator />

                            <UpiForm />
                            
                            <Separator />

                            <SmtpForm />
                            
                            <Separator />
                            
                            <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                                <div>
                                    <h4 className="font-medium">Clear Application Cache</h4>
                                    <p className="text-sm text-muted-foreground">Forces a refresh of all cached application data.</p>
                                </div>
                                <Button variant="outline" onClick={handleCacheClear}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Clear Cache
                                </Button>
                            </div>
                             <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                                <div>
                                    <h4 className="font-medium">Re-sync All Data</h4>
                                    <p className="text-sm text-muted-foreground">Fetches the latest data from the server for all modules.</p>
                                </div>
                                <Button variant="outline" onClick={handleResync}>
                                    <RotateCw className="mr-2 h-4 w-4" /> Re-sync
                                </Button>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    );
}
