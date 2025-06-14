
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
import type { Member, MembershipStatus, FetchedMembershipPlan, Announcement } from '@/lib/types';
import { APP_NAME } from '@/lib/constants';
import { addMember, editMember } from '@/app/actions/member-actions';
import { getActiveMembershipPlans } from '@/app/actions/plan-actions';
import { addMemberFormSchema, type AddMemberFormValues } from '@/lib/schemas/member-schemas';
import { Skeleton } from '@/components/ui/skeleton';

const memberStatuses: MembershipStatus[] = ['active', 'inactive', 'expired', 'pending'];

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

  const form = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phoneNumber: null,
      age: null,
      selectedPlanUuid: '', // Will be set after plans load
    },
  });

  useEffect(() => {
    async function fetchPlans() {
      if (isOpen) {
        setIsLoadingPlans(true);
        const response = await getActiveMembershipPlans();
        if (response.error || !response.data) {
          toast({
            variant: "destructive",
            title: 'Error Fetching Plans',
            description: response.error || "Could not load membership plans.",
          });
          setAvailablePlans([]);
        } else {
          setAvailablePlans(response.data);
          // Set default plan if not editing and plans are available
          if (!memberToEdit && response.data.length > 0) {
            // Default to the first plan (often 'Basic' if sorted by price/order)
            form.setValue('selectedPlanUuid', response.data[0].uuid);
          }
        }
        setIsLoadingPlans(false);
      }
    }
    fetchPlans();
  }, [isOpen, toast, form, memberToEdit]);


  useEffect(() => {
    if (isOpen && availablePlans.length > 0) {
      if (memberToEdit) {
        setIsEditing(true);
        form.reset({
          name: memberToEdit.name,
          email: memberToEdit.email || '',
          phoneNumber: memberToEdit.phoneNumber,
          age: memberToEdit.age,
          selectedPlanUuid: memberToEdit.planId || (availablePlans.length > 0 ? availablePlans[0].uuid : ''),
          // membershipStatus field if it becomes part of AddMemberFormValues for editing
          // membershipStatus: memberToEdit.membershipStatus 
        });
      } else {
        setIsEditing(false);
        form.reset({
          name: '', email: '',
          phoneNumber: null, age: null,
          selectedPlanUuid: availablePlans.length > 0 ? availablePlans[0].uuid : '',
        });
      }
    } else if (isOpen && !isLoadingPlans && availablePlans.length === 0) {
        // Handle case where no plans are loaded but dialog is open (e.g. for adding)
        setIsEditing(false);
        form.reset({
            name: '', email: '',
            phoneNumber: null, age: null,
            selectedPlanUuid: '', // No plans to select
        });
    }
  }, [memberToEdit, isOpen, form, availablePlans, isLoadingPlans]);

  async function onSubmit(data: AddMemberFormValues) {
    setIsSubmittingState(true);
    const gymDatabaseId = localStorage.getItem('gymDatabaseId') || 'default_gym_db_id_mock';
    const gymName = localStorage.getItem('gymName') || APP_NAME;

    if (!data.selectedPlanUuid && availablePlans.length > 0) {
        toast({ variant: "destructive", title: "Validation Error", description: "Please select a membership plan." });
        setIsSubmittingState(false);
        return;
    }
     if (availablePlans.length === 0 && !isLoadingPlans) {
        toast({ variant: "destructive", title: "No Plans Available", description: "Cannot add member without active membership plans. Please configure plans first." });
        setIsSubmittingState(false);
        return;
    }


    if (isEditing && memberToEdit) {
      // Construct payload for editMember, potentially including membershipStatus if it's part of the form
      const editDataPayload = { ...data };
      // if (form.getValues('membershipStatus')) { // Check if membershipStatus is a field in your form for editing
      //   editDataPayload.membershipStatus = form.getValues('membershipStatus');
      // }

      const response = await editMember(editDataPayload, memberToEdit.id, memberToEdit.gymId);

      if (response.error) {
         toast({
          variant: "destructive",
          title: 'Error Updating Member',
          description: response.error,
        });
      } else if (response.data) {
        onMemberSaved(response.data.updatedMember);
        toast({
          title: 'Member Updated',
          description: `${response.data.updatedMember.name} has been successfully updated.`,
        });
        onOpenChange(false);
      }
    } else {
      const response = await addMember(data, gymDatabaseId, gymName);

      if (response.error) {
        toast({
          variant: "destructive",
          title: 'Error Adding Member',
          description: response.error,
        });
      } else if (response.data) {
        onMemberSaved(response.data.newMember);
        try {
          const existingAnnouncementsRaw = localStorage.getItem('gymAnnouncements');
          const existingAnnouncements: Announcement[] = existingAnnouncementsRaw ? JSON.parse(existingAnnouncementsRaw) : [];
          localStorage.setItem('gymAnnouncements', JSON.stringify([response.data.welcomeAnnouncement, ...existingAnnouncements]));
          window.dispatchEvent(new Event('storage'));
        } catch (e) {
          console.error("Failed to save welcome announcement to localStorage:", e);
        }
        toast({
          title: 'Member Added Successfully!',
          description: `${response.data.newMember.name} registered. ${response.data.emailStatus} Announcement posted.`,
        });
        onOpenChange(false);
      }
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
            {isEditing ? "Update the member's information." : "Fill in the details below to register a new gym member."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Full Name</FormLabel>
                  <FormControl>
                    <Input className="bg-input text-foreground placeholder:text-muted-foreground border-border" placeholder="Enter member's full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Email</FormLabel>
                  <FormControl>
                    <Input className="bg-input text-foreground placeholder:text-muted-foreground border-border" type="email" placeholder="Enter member's email (optional)" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="text-foreground">Age</FormLabel>
                    <FormControl>
                        <Input className="bg-input text-foreground placeholder:text-muted-foreground border-border" type="number" placeholder="e.g., 25 (optional)" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="text-foreground">Phone</FormLabel>
                    <FormControl>
                        <Input className="bg-input text-foreground placeholder:text-muted-foreground border-border" type="tel" placeholder="(optional)" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            
            <FormField
              control={form.control}
              name="selectedPlanUuid"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-foreground">Membership Plan</FormLabel>
                  {isLoadingPlans ? (
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-5 w-2/3" />
                    </div>
                  ) : availablePlans.length === 0 ? (
                    <p className="text-sm text-destructive">No active membership plans found. Please add plans in the system.</p>
                  ) : (
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col space-y-1"
                      >
                        {availablePlans.map((plan) => (
                          <FormItem key={plan.uuid} className="flex items-center space-x-3 space-y-0 p-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border cursor-pointer has-[input:checked]:bg-primary/10 has-[input:checked]:border-primary">
                            <FormControl>
                              <RadioGroupItem value={plan.uuid} />
                            </FormControl>
                            <FormLabel className="font-normal text-foreground cursor-pointer w-full">
                              {plan.name} 
                              <span className="text-xs text-muted-foreground ml-2">
                                (₹{plan.price.toFixed(2)} / {plan.durationMonths} {plan.durationMonths === 1 ? 'month' : 'months'})
                              </span>
                            </FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditing && memberToEdit && (
                 <FormField
                    control={form.control}
                    // name="membershipStatus" // This needs to be added to AddMemberFormValues if editing can change it
                    name={"membershipStatus" as any} // Quick fix for type, ideally add to form schema
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-foreground">Membership Status</FormLabel>
                         <FormControl>
                            <RadioGroup
                                onValueChange={(value) => {
                                    // @ts-ignore
                                    field.onChange(value as MembershipStatus);
                                    if (memberToEdit) {
                                    memberToEdit.membershipStatus = value as MembershipStatus;
                                    }
                                }}
                                defaultValue={memberToEdit.membershipStatus} // Use defaultValue for uncontrolled or value for controlled
                                className="flex flex-col space-y-1"
                            >
                                {memberStatuses.filter(s => s !== 'expiring soon').map(status => (
                                <FormItem key={status} className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value={status} id={`status-${status}`}/>
                                    </FormControl>
                                    <FormLabel htmlFor={`status-${status}`} className="font-normal capitalize text-foreground">
                                    {status}
                                    </FormLabel>
                                </FormItem>
                                ))}
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            <DialogFooter className="pt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border hover:bg-muted">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmittingState || isLoadingPlans || (availablePlans.length === 0 && !isEditing)} 
                className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto"
              >
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
    
