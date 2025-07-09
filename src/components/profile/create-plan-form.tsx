
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
import { addPlanAction, getActiveMembershipPlans, updatePlanAction, softDeletePlanAction } from '@/app/actions/plan-actions';
import type { FetchedMembershipPlan } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { List, PlusCircle, Edit, Trash2, PackagePlus, AlertCircle, RefreshCw, XCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '../ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function CreatePlanForm() {
  const { toast } = useToast();
  const [existingPlans, setExistingPlans] = useState<FetchedMembershipPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchPlansError, setFetchPlansError] = useState<string | null>(null);
  const [currentGymDbId, setCurrentGymDbId] = useState<string | null>(null);

  const [editingPlan, setEditingPlan] = useState<FetchedMembershipPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<FetchedMembershipPlan | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const gymId = localStorage.getItem('gymDatabaseId');
      setCurrentGymDbId(gymId);
    }
  }, []);

  const fetchExistingPlans = useCallback(async () => {
    if (!currentGymDbId) {
      setFetchPlansError("Gym ID not available. Cannot load plans.");
      setExistingPlans([]);
      setIsLoadingPlans(false);
      return;
    }
    setIsLoadingPlans(true);
    setFetchPlansError(null);
    const response = await getActiveMembershipPlans(currentGymDbId);
    if (response.error || !response.data) {
      setFetchPlansError(response.error || "Could not load existing plans.");
      setExistingPlans([]);
    } else {
      setExistingPlans(response.data);
    }
    setIsLoadingPlans(false);
  }, [currentGymDbId]);

  useEffect(() => {
    if (currentGymDbId) {
      fetchExistingPlans();
    }
  }, [currentGymDbId, fetchExistingPlans]);

  useEffect(() => {
    const handleRefetch = () => {
      fetchExistingPlans();
    };
    window.addEventListener('clear-cache-and-refetch', handleRefetch);
    return () => {
      window.removeEventListener('clear-cache-and-refetch', handleRefetch);
    };
  }, [fetchExistingPlans]);

  const form = useForm<AddPlanFormValues>({
    resolver: zodResolver(addPlanFormSchema),
    defaultValues: {
      planIdText: '',
      name: '',
      price: undefined,
      durationMonths: undefined,
    },
  });

  useEffect(() => {
    if (editingPlan) {
      form.reset({
        planIdText: editingPlan.planIdText || '',
        name: editingPlan.name,
        price: editingPlan.price,
        durationMonths: editingPlan.durationMonths || undefined,
      });
    } else {
      form.reset({ planIdText: '', name: '', price: undefined, durationMonths: undefined });
    }
  }, [editingPlan, form]);

  const handleEditClick = (plan: FetchedMembershipPlan) => {
    setEditingPlan(plan);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to form
  };

  const handleCancelEdit = () => {
    setEditingPlan(null);
    // form.reset() is handled by useEffect for editingPlan
  };

  const handleDeleteClick = (plan: FetchedMembershipPlan) => {
    setPlanToDelete(plan);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeletePlan = async () => {
    if (!planToDelete || !currentGymDbId) return;
    setIsSubmitting(true);
    const response = await softDeletePlanAction(planToDelete.uuid, currentGymDbId);
    if (response.success) {
      toast({ title: 'Plan Deactivated', description: `Plan "${planToDelete.name}" has been marked as inactive.` });
      fetchExistingPlans();
    } else {
      toast({ variant: "destructive", title: 'Error Deactivating Plan', description: response.error });
    }
    setIsSubmitting(false);
    setIsDeleteConfirmOpen(false);
    setPlanToDelete(null);
  };

  async function onSubmit(data: AddPlanFormValues) {
    setIsSubmitting(true);
    form.clearErrors();

    if (!currentGymDbId) {
      toast({ variant: "destructive", title: 'Error', description: 'Gym ID not found. Please log in again.' });
      setIsSubmitting(false);
      return;
    }
    
    let response;
    if (editingPlan) {
      response = await updatePlanAction(editingPlan.uuid, data, currentGymDbId);
      if (response.data) {
        toast({ title: 'Plan Updated!', description: `Plan "${response.data.name}" updated successfully.` });
        setEditingPlan(null);
      }
    } else {
      response = await addPlanAction(data, currentGymDbId);
      if (response.data) {
        toast({ title: 'Plan Created!', description: `Plan "${response.data.name}" added successfully.` });
      }
    }

    if (response.error) {
      if (response.fieldErrors) {
        for (const [field, errors] of Object.entries(response.fieldErrors)) {
          if (errors && errors.length > 0) {
            form.setError(field as keyof AddPlanFormValues, { message: errors.join(', ') });
          }
        }
        toast({ variant: "destructive", title: 'Validation Error', description: "Please check the form fields for errors." });
      } else {
        toast({ variant: "destructive", title: editingPlan ? 'Error Updating Plan' : 'Error Creating Plan', description: response.error });
      }
    } else {
      form.reset(); // Reset form on success only if not editing or successfully edited
      fetchExistingPlans(); 
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
           <Button variant="ghost" size="icon" onClick={fetchExistingPlans} disabled={isLoadingPlans || !currentGymDbId} className="h-8 w-8">
                <RefreshCw className={`h-4 w-4 ${isLoadingPlans ? 'animate-spin' : ''}`}/>
            </Button>
        </div>
        <CardDescription>Define new membership plans or view existing active ones for your gym.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-md font-semibold mb-3 text-foreground flex items-center">
            {editingPlan ? <Edit className="mr-2 h-4 w-4 text-primary" /> : <PlusCircle className="mr-2 h-4 w-4 text-primary" />}
            {editingPlan ? `Editing Plan: ${editingPlan.name}` : 'Create New Plan'}
          </h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4 rounded-md bg-muted/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="planIdText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan ID (Unique per Gym)</FormLabel>
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
                        <Input type="number" step="0.01" placeholder="e.g., 599" {...field} 
                               value={field.value ?? ''}
                               onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
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
                        <Input type="number" placeholder="e.g., 1, 3, 12" {...field} 
                               value={field.value ?? ''}
                               onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value,10))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="submit" disabled={isSubmitting || isLoadingPlans || !currentGymDbId} className="w-full sm:w-auto">
                  {isSubmitting ? (editingPlan ? 'Updating...' : 'Adding...') : (
                    editingPlan ? <><Edit className="mr-2 h-4 w-4" /> Update Plan</> : <><PlusCircle className="mr-2 h-4 w-4" /> Add Plan</>
                  )}
                </Button>
                {editingPlan && (
                  <Button type="button" variant="outline" onClick={handleCancelEdit} className="w-full sm:w-auto">
                    <XCircle className="mr-2 h-4 w-4" /> Cancel Edit
                  </Button>
                )}
              </div>
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
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-2/3 rounded-md" />
            </div>
          ) : fetchPlansError ? (
             <div className="text-destructive flex items-center p-3 border-destructive/50 bg-destructive/10 rounded-md">
                <AlertCircle className="h-5 w-5 mr-2"/> 
                <p>{fetchPlansError}</p>
            </div>
          ) : existingPlans.length === 0 ? (
            <p className="text-muted-foreground text-sm p-3 rounded-md bg-muted/20">
              {!currentGymDbId ? "Gym not identified." : "No active plans found for this gym. Create one above."}
            </p>
          ) : (
            <ScrollArea className="h-[200px] w-full rounded-md p-1">
              <ul className="space-y-1 p-3">
                {existingPlans.map((plan) => (
                  <li key={plan.uuid} className="flex justify-between items-center p-2 rounded-md hover:bg-muted/30 text-sm">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground truncate block">{plan.name}</span>
                      <span className="text-xs text-muted-foreground truncate block">ID: {plan.planIdText || 'N/A'} | ₹{plan.price.toFixed(2)} / {plan.durationMonths} {plan.durationMonths === 1 ? 'mo' : 'mos'}</span>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditClick(plan)} aria-label={`Edit ${plan.name}`}>
                        <Edit className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteClick(plan)} aria-label={`Delete ${plan.name}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </div>
      </CardContent>
      {planToDelete && (
        <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate Plan: {planToDelete.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to mark this plan as inactive? It will no longer be available for new memberships.
                This action does not affect existing members on this plan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPlanToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeletePlan}
                disabled={isSubmitting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isSubmitting ? 'Deactivating...' : 'Deactivate Plan'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
}
