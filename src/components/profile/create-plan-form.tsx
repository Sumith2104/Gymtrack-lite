
'use client';

import { useState, useEffect, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { addPlanFormSchema, type AddPlanFormValues } from '@/lib/schemas/plan-schemas';
import { addPlanAction, getActiveMembershipPlans } from '@/app/actions/plan-actions';
import type { FetchedMembershipPlan } from '@/lib/lib/types'; // Adjusted path if types.ts is in src/lib
import { ScrollArea } from '@/components/ui/scroll-area';
import { List, PlusCircle, Tag, PackagePlus, AlertCircle, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '../ui/separator';


export function CreatePlanForm() {
  const { toast } = useToast();
  const [existingPlans, setExistingPlans] = useState<FetchedMembershipPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchPlansError, setFetchPlansError] = useState<string | null>(null);

  const form = useForm<AddPlanFormValues>({
    resolver: zodResolver(addPlanFormSchema),
    defaultValues: {
      planIdText: '',
      name: '',
      price: undefined,
      durationMonths: undefined,
    },
  });

  const fetchExistingPlans = useCallback(async () => {
    setIsLoadingPlans(true);
    setFetchPlansError(null);
    const response = await getActiveMembershipPlans();
    if (response.error || !response.data) {
      setFetchPlansError(response.error || "Could not load existing plans.");
      setExistingPlans([]);
    } else {
      setExistingPlans(response.data);
    }
    setIsLoadingPlans(false);
  }, []);

  useEffect(() => {
    fetchExistingPlans();
  }, [fetchExistingPlans]);

  async function onSubmit(data: AddPlanFormValues) {
    setIsSubmitting(true);
    form.clearErrors();
    
    const response = await addPlanAction(data);

    if (response.error) {
      if (response.fieldErrors) {
        for (const [field, errors] of Object.entries(response.fieldErrors)) {
          if (errors && errors.length > 0) {
            form.setError(field as keyof AddPlanFormValues, { message: errors.join(', ') });
          }
        }
        toast({ variant: "destructive", title: 'Validation Error', description: "Please check the form fields for errors." });
      } else {
        toast({ variant: "destructive", title: 'Error Creating Plan', description: response.error });
      }
    } else if (response.data) {
      toast({ title: 'Plan Created!', description: `Plan "${response.data.name}" added successfully.` });
      form.reset();
      fetchExistingPlans(); // Refresh the list of plans
    }
    setIsSubmitting(false);
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold flex items-center">
            <PackagePlus className="mr-2 h-5 w-5 text-primary" /> Manage Membership Plans
          </CardTitle>
           <Button variant="ghost" size="sm" onClick={fetchExistingPlans} disabled={isLoadingPlans}>
                <RefreshCw className={`h-4 w-4 ${isLoadingPlans ? 'animate-spin' : ''}`}/>
            </Button>
        </div>
        <CardDescription>Define new membership plans or view existing active ones.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-md font-semibold mb-3 text-foreground flex items-center">
            <PlusCircle className="mr-2 h-4 w-4 text-primary" /> Create New Plan
          </h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4 border rounded-md bg-muted/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="planIdText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan ID (Unique)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., GOLD01, YEARLY24" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Gold Monthly, Annual Premium" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 599" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="durationMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (Months)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 1, 3, 12" {...field} onChange={e => field.onChange(parseInt(e.target.value,10))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" disabled={isSubmitting || isLoadingPlans} className="w-full sm:w-auto">
                {isSubmitting ? 'Saving Plan...' : <><PlusCircle className="mr-2 h-4 w-4" /> Add Plan</>}
              </Button>
            </form>
          </Form>
        </div>
        
        <Separator />

        <div>
          <h3 className="text-md font-semibold mb-3 text-foreground flex items-center">
            <List className="mr-2 h-4 w-4 text-primary" /> Existing Active Plans ({existingPlans.length})
          </h3>
          {isLoadingPlans ? (
             <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-2/3" />
            </div>
          ) : fetchPlansError ? (
             <div className="text-destructive flex items-center p-3 border border-destructive/50 bg-destructive/10 rounded-md">
                <AlertCircle className="h-5 w-5 mr-2"/> 
                <p>{fetchPlansError}</p>
            </div>
          ) : existingPlans.length === 0 ? (
            <p className="text-muted-foreground text-sm p-3 border rounded-md bg-muted/20">No active plans found. Create one above to get started.</p>
          ) : (
            <ScrollArea className="h-[200px] w-full rounded-md border p-1">
              <ul className="space-y-1 p-3">
                {existingPlans.map((plan) => (
                  <li key={plan.uuid} className="flex justify-between items-center p-2 rounded-md hover:bg-muted/30 text-sm">
                    <div>
                      <span className="font-medium text-foreground">{plan.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">(ID: {plan.planIdText || 'N/A'})</span>
                    </div>
                    <div className="text-right">
                      <span className="text-foreground font-semibold">₹{plan.price.toFixed(2)}</span>
                      <span className="text-muted-foreground text-xs"> / {plan.durationMonths} {plan.durationMonths === 1 ? 'month' : 'months'}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
