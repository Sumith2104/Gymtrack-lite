
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { UserPlus, Edit } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import type { Member, MembershipStatus, FetchedMembershipPlan } from '@/lib/types';
import { APP_NAME } from '@/lib/constants';
import { addMember, editMember } from '@/app/actions/member-actions';
import { getActiveMembershipPlans } from '@/app/actions/plan-actions';
import { addMemberFormSchema, type AddMemberFormValues } from '@/lib/schemas/member-schemas';
import { Skeleton } from '@/components/ui/skeleton';


const memberStatuses: MembershipStatus[] = ['active', 'expired'];

interface AddMemberDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onMemberSaved: (member: Member) => void;
  memberToEdit?: Member | null;
}

export function AddMemberDialog({ isOpen, onOpenChange, onMemberSaved, memberToEdit }: AddMemberDialogProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmittingState, setIsSubmittingState] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<FetchedMembershipPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [currentGymDbId, setCurrentGymDbId] = useState<string | null>(null);
  const [currentFormattedGymId, setCurrentFormattedGymId] = useState<string | null>(null);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const gymDbUUID = localStorage.getItem('gymDatabaseId');
      const formattedGymId = localStorage.getItem('gymId');
      setCurrentGymDbId(gymDbUUID);
      setCurrentFormattedGymId(formattedGymId);
    }
  }, []);

  const formMethods = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phoneNumber: '',
      age: undefined,
      selectedPlanUuid: '',
    },
  });

  const { control, handleSubmit, setValue, reset, formState } = formMethods;

  useEffect(() => {
    async function fetchPlans() {
      if (isOpen && currentGymDbId) {
        setIsLoadingPlans(true);
        const response = await getActiveMembershipPlans(currentGymDbId);
        if (response.error || !response.data) {
          toast({ variant: "destructive", title: 'Error Fetching Plans', description: response.error || "Could not load membership plans for this gym." });
          setAvailablePlans([]);
        } else {
          setAvailablePlans(response.data);
          if (!memberToEdit && response.data.length > 0) {
            setValue('selectedPlanUuid', response.data[0].uuid);
          }
        }
        setIsLoadingPlans(false);
      } else if (isOpen && !currentGymDbId) {
        toast({ variant: "destructive", title: 'Configuration Error', description: "Gym ID not found. Cannot load plans." });
        setAvailablePlans([]);
        setIsLoadingPlans(false);
      }
    }
    fetchPlans();
  }, [isOpen, currentGymDbId, toast, setValue, memberToEdit]);


  useEffect(() => {
    if (isOpen && availablePlans.length > 0) {
      if (memberToEdit) {
        setIsEditing(true);
        reset({
          name: memberToEdit.name,
          email: memberToEdit.email || '',
          phoneNumber: memberToEdit.phoneNumber || '',
          age: memberToEdit.age || undefined,
          selectedPlanUuid: memberToEdit.planId || (availablePlans.length > 0 ? availablePlans[0].uuid : ''),
        });
      } else {
        setIsEditing(false);
        reset({
          name: '', email: '',
          phoneNumber: '', age: undefined,
          selectedPlanUuid: availablePlans.length > 0 ? availablePlans[0].uuid : '',
        });
      }
    } else if (isOpen && !isLoadingPlans && availablePlans.length === 0) {
        setIsEditing(false);
        reset({ name: '', email: '', phoneNumber: '', age: undefined, selectedPlanUuid: '' });
    }
  }, [memberToEdit, isOpen, reset, availablePlans, isLoadingPlans]);

  async function onSubmit(data: AddMemberFormValues) {
    setIsSubmittingState(true);
    const gymName = localStorage.getItem('gymName') || APP_NAME;

    if (!currentGymDbId || !currentFormattedGymId) {
        toast({ variant: "destructive", title: "Configuration Error", description: "Gym ID (UUID or Formatted) not found. Please log in again."});
        setIsSubmittingState(false);
        return;
    }
    if (!data.selectedPlanUuid && availablePlans.length > 0) {
        toast({ variant: "destructive", title: "Validation Error", description: "Please select a membership plan." });
        setIsSubmittingState(false);
        return;
    }
     if (availablePlans.length === 0 && !isLoadingPlans) {
        toast({ variant: "destructive", title: "No Plans Available", description: "Cannot add member without active membership plans for this gym." });
        setIsSubmittingState(false);
        return;
    }

    let response;
    if (isEditing && memberToEdit) {
      response = await editMember(data, memberToEdit.id, currentGymDbId);
       if (response.data?.updatedMember) {
        onMemberSaved(response.data.updatedMember);
        toast({ title: 'Member Updated', description: `${response.data.updatedMember.name} has been successfully updated.` });
        onOpenChange(false);
      }
    } else {
      response = await addMember(data, currentGymDbId, currentFormattedGymId, gymName);
      if (response.data?.newMember) {
        onMemberSaved(response.data.newMember);
        toast({ title: 'Member Added!', description: `${response.data.newMember.name} registered. ${response.data.emailStatus}` });
        // The addAnnouncementAction within addMember will dispatch 'reloadAnnouncements'
        onOpenChange(false);
      }
    }

    if (response.error) {
       toast({ variant: "destructive", title: isEditing ? 'Error Updating Member' : 'Error Adding Member', description: response.error });
    }
    setIsSubmittingState(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground p-6 rounded-lg shadow-xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-semibold text-foreground flex items-center">
            {isEditing ? <Edit className="mr-2 h-5 w-5" /> : <UserPlus className="mr-2 h-5 w-5" />}
            {isEditing ? 'Edit Member' : 'Add New Member'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isEditing ? "Update the member's information." : "Fill in the details to register a new gym member."}
          </DialogDescription>
        </DialogHeader>
        <Form {...formMethods}>
          <form onSubmit={formMethods.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={formMethods.control} name="name" render={({ field }) => (
                <FormItem><FormLabel className="text-foreground">Full Name</FormLabel><FormControl><Input className="bg-input text-foreground placeholder:text-muted-foreground border-border" placeholder="Enter member's full name" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={formMethods.control} name="email" render={({ field }) => (
                <FormItem><FormLabel className="text-foreground">Email</FormLabel><FormControl><Input className="bg-input text-foreground placeholder:text-muted-foreground border-border" type="email" placeholder="Enter member's email" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
             <div className="grid grid-cols-2 gap-4">
                <FormField control={formMethods.control} name="age" render={({ field }) => (
                    <FormItem><FormLabel className="text-foreground">Age</FormLabel><FormControl><Input className="bg-input text-foreground placeholder:text-muted-foreground border-border" type="number" placeholder="e.g., 25" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}/></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={formMethods.control} name="phoneNumber" render={({ field }) => (
                    <FormItem><FormLabel className="text-foreground">Phone</FormLabel><FormControl><Input className="bg-input text-foreground placeholder:text-muted-foreground border-border" type="tel" placeholder="Enter phone number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )}/>
            </div>
            <FormField control={formMethods.control} name="selectedPlanUuid" render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-foreground">Membership Plan</FormLabel>
                  {isLoadingPlans ? (<div className="space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-5 w-1/2" /><Skeleton className="h-5 w-2/3" /></div>
                  ) : availablePlans.length === 0 ? (<p className="text-sm text-destructive">No active membership plans found for this gym. Please add plans first.</p>
                  ) : (
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                        {availablePlans.map((plan) => (
                          <FormItem key={plan.uuid} className="flex items-center space-x-3 space-y-0 p-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border cursor-pointer has-[input:checked]:bg-primary/10 has-[input:checked]:border-primary">
                            <FormControl><RadioGroupItem value={plan.uuid} /></FormControl>
                            <FormLabel className="font-normal text-foreground cursor-pointer w-full"> {plan.name} <span className="text-xs text-muted-foreground ml-2">(₹{plan.price.toFixed(2)} / {plan.durationMonths} {plan.durationMonths === 1 ? 'month' : 'months'})</span></FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                  )}<FormMessage />
                </FormItem>
            )}/>
            <DialogFooter className="pt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border hover:bg-muted">Cancel</Button>
              <Button type="submit" disabled={isSubmittingState || isLoadingPlans || (availablePlans.length === 0 && !isEditing) || !currentGymDbId} className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto">
                {isEditing ? <Edit className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                {isSubmittingState ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save Changes' : 'Add Member')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    