
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HardHat, RotateCw, Trash2, Wallet, Save, Edit, Clock, Building, AtSign } from 'lucide-react';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { getGymSettings, updateGymSettings } from '@/app/actions/profile-actions';


// --- SessionTimeForm Component ---
const sessionTimeSchema = z.object({
  sessionTimeHours: z.coerce.number().int().min(1, 'Must be at least 1 hour.').max(24, 'Cannot exceed 24 hours.'),
});
type SessionTimeValues = z.infer<typeof sessionTimeSchema>;

function SessionTimeForm() {
    const { toast } = useToast();
    const [gymDatabaseId, setGymDatabaseId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState<number>(2);

    const form = useForm<SessionTimeValues>({
        resolver: zodResolver(sessionTimeSchema),
        defaultValues: { sessionTimeHours: 2 },
    });

    useEffect(() => {
        const dbId = localStorage.getItem('gymDatabaseId');
        setGymDatabaseId(dbId);
        if (dbId) {
            setIsLoading(true);
            getGymSettings(dbId).then(res => {
                if (res.data?.sessionTimeHours) {
                    const hours = res.data.sessionTimeHours;
                    setCurrentValue(hours);
                    form.setValue('sessionTimeHours', hours);
                }
                setIsLoading(false);
            });
        } else {
            setIsLoading(false);
        }
    }, [form]);

    async function onSubmit(data: SessionTimeValues) {
        if (!gymDatabaseId) return;
        const response = await updateGymSettings(gymDatabaseId, { sessionTimeHours: data.sessionTimeHours });
        if (response.success) {
            toast({ title: 'Success', description: 'Default session time updated.' });
            setCurrentValue(data.sessionTimeHours);
            localStorage.setItem('gymSessionTimeHours', String(data.sessionTimeHours));
            setIsEditing(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: response.error });
        }
    }

    return (
        <div>
            <h4 className="font-medium text-foreground flex items-center mb-2"><Clock className="mr-2 h-4 w-4 text-primary" /> Default Session Time</h4>
            <p className="text-sm text-muted-foreground mb-4">Set the automatic check-out duration (in hours) for member check-ins.</p>
            {isLoading ? <Skeleton className="h-10 w-full" /> : isEditing ? (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start gap-2">
                        <FormField control={form.control} name="sessionTimeHours" render={({ field }) => (
                            <FormItem className="flex-grow">
                                <FormControl><Input type="number" placeholder="e.g., 2" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <Button type="submit" disabled={form.formState.isSubmitting}><Save className="mr-2 h-4 w-4" /> Save</Button>
                        <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    </form>
                </Form>
            ) : (
                <div className="flex items-center justify-between gap-4 p-2 rounded-md bg-muted/30">
                    <p className="text-sm text-foreground font-mono">{currentValue} hour(s)</p>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                </div>
            )}
        </div>
    );
}

// --- GymCapacityForm Component ---
const capacitySchema = z.object({
  maxCapacity: z.coerce.number().int().min(1, 'Must be at least 1.').max(10000, 'Capacity seems too high.'),
});
type CapacityValues = z.infer<typeof capacitySchema>;

function GymCapacityForm() {
    const { toast } = useToast();
    const [gymDatabaseId, setGymDatabaseId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState<number>(100);

    const form = useForm<CapacityValues>({
        resolver: zodResolver(capacitySchema),
        defaultValues: { maxCapacity: 100 },
    });

     useEffect(() => {
        const dbId = localStorage.getItem('gymDatabaseId');
        setGymDatabaseId(dbId);
        if (dbId) {
            setIsLoading(true);
            getGymSettings(dbId).then(res => {
                if (res.data?.maxCapacity) {
                    const capacity = res.data.maxCapacity;
                    setCurrentValue(capacity);
                    form.setValue('maxCapacity', capacity);
                }
                setIsLoading(false);
            });
        } else {
            setIsLoading(false);
        }
    }, [form]);

    async function onSubmit(data: CapacityValues) {
        if (!gymDatabaseId) return;
        const response = await updateGymSettings(gymDatabaseId, { maxCapacity: data.maxCapacity });
        if (response.success) {
            toast({ title: 'Success', description: 'Gym capacity updated.' });
            setCurrentValue(data.maxCapacity);
            localStorage.setItem('gymMaxCapacity', String(data.maxCapacity));
            setIsEditing(false);
            // Dispatch event to refetch occupancy data if needed elsewhere
            window.dispatchEvent(new Event('clear-cache-and-refetch'));
        } else {
            toast({ variant: 'destructive', title: 'Error', description: response.error });
        }
    }

    return (
        <div>
            <h4 className="font-medium text-foreground flex items-center mb-2"><Building className="mr-2 h-4 w-4 text-primary" /> Gym Capacity</h4>
            <p className="text-sm text-muted-foreground mb-4">Set the maximum number of members allowed in the gym at one time for the occupancy tracker.</p>
            {isLoading ? <Skeleton className="h-10 w-full" /> : isEditing ? (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start gap-2">
                        <FormField control={form.control} name="maxCapacity" render={({ field }) => (
                            <FormItem className="flex-grow">
                                <FormControl><Input type="number" placeholder="e.g., 150" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <Button type="submit" disabled={form.formState.isSubmitting}><Save className="mr-2 h-4 w-4" /> Save</Button>
                        <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    </form>
                </Form>
            ) : (
                <div className="flex items-center justify-between gap-4 p-2 rounded-md bg-muted/30">
                    <p className="text-sm text-foreground font-mono">{currentValue} people</p>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                </div>
            )}
        </div>
    );
}


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
                            
                            <SessionTimeForm />

                            <Separator />

                            <GymCapacityForm />
                            
                            <Separator />

                            <div className="flex items-center justify-between p-3 rounded-md bg-muted/30">
                                <div>
                                    <h4 className="font-medium">Clear Application Cache</h4>
                                    <p className="text-sm text-muted-foreground">Forces a refresh of all cached application data.</p>
                                </div>
                                <Button variant="outline" onClick={handleCacheClear}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Clear Cache
                                </Button>
                            </div>
                             <div className="flex items-center justify-between p-3 rounded-md bg-muted/30">
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
