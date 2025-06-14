
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { PlusCircle, Edit, UserPlus } from 'lucide-react';
import { addMonths, format, parseISO } from 'date-fns';

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
import type { Member, MembershipStatus, MembershipPlan, MembershipType, Announcement } from '@/lib/types';
import { MOCK_MEMBERSHIP_PLANS, APP_NAME } from '@/lib/constants';
import { addMember, editMember } from '@/app/actions/member-actions';
import { addMemberFormSchema, type AddMemberFormValues } from '@/lib/schemas/member-schemas';

// Updated to reflect the new plan structure
const DIALOG_MEMBERSHIP_OPTIONS: { label: MembershipType; planId: string }[] = [
  { label: 'Basic', planId: 'plan_basic_1m' },
  { label: 'Premium', planId: 'plan_premium_6m' },
  { label: 'Annual', planId: 'plan_annual_12m' },
];

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

  const form = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phoneNumber: null,
      age: null,
      membershipType: 'Basic', // Default to 'Basic' plan name
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (memberToEdit) {
        setIsEditing(true);
        // The membershipType in memberToEdit is the plan name (e.g., "Basic", "Premium")
        // We need to ensure this name corresponds to one of the new MOCK_MEMBERSHIP_PLANS
        const currentMemberPlan = MOCK_MEMBERSHIP_PLANS.find(p => p.name === memberToEdit.membershipType);
        
        form.reset({
          name: memberToEdit.name,
          email: memberToEdit.email || '',
          phoneNumber: memberToEdit.phoneNumber,
          age: memberToEdit.age,
          membershipType: currentMemberPlan?.name || 'Basic', // Fallback to 'Basic' if type is unfamiliar
        });
      } else {
        setIsEditing(false);
        form.reset({
          name: '', email: '',
          phoneNumber: null, age: null,
          membershipType: 'Basic', // Default to Basic plan name
        });
      }
    }
  }, [memberToEdit, isOpen, form]);

  async function onSubmit(data: AddMemberFormValues) {
    setIsSubmittingState(true);
    const gymDatabaseId = localStorage.getItem('gymDatabaseId') || 'default_gym_db_id_mock';
    const gymName = localStorage.getItem('gymName') || APP_NAME;

    if (isEditing && memberToEdit) {
      const editData = {
        ...memberToEdit, 
        ...data, 
        email: data.email || null, 
        age: data.age || null,
        phoneNumber: data.phoneNumber || null,
        membershipType: data.membershipType, // This is the plan name
      };
      
      const response = await editMember(editData, memberToEdit.id, memberToEdit.gymId);

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
      // Adding new member. data.membershipType is the plan name.
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
          <DialogTitle className="text-xl font-semibold text-foreground">
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
                    <Input className="bg-input text-foreground placeholder:text-muted-foreground border-border" type="email" placeholder="Enter member's email" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Age</FormLabel>
                  <FormControl>
                    <Input className="bg-input text-foreground placeholder:text-muted-foreground border-border" type="number" placeholder="Enter member's age" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}/>
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
                  <FormLabel className="text-foreground">Phone Number</FormLabel>
                  <FormControl>
                    <Input className="bg-input text-foreground placeholder:text-muted-foreground border-border" type="tel" placeholder="Enter member's phone number" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="membershipType" // This field stores the plan NAME (e.g., "Basic")
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-foreground">Membership Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(planId) => { // Value from RadioGroupItem is planId
                        const selectedPlan = MOCK_MEMBERSHIP_PLANS.find(p => p.id === planId);
                        if (selectedPlan) {
                          field.onChange(selectedPlan.name); // Update form state with plan NAME
                        }
                      }}
                      // To set the radio group's selected item, find the planId corresponding to the current plan NAME in the form
                      value={MOCK_MEMBERSHIP_PLANS.find(p => p.name === field.value)?.id}
                      className="flex flex-col space-y-1"
                    >
                      {DIALOG_MEMBERSHIP_OPTIONS.map((option) => {
                        const planDetails = MOCK_MEMBERSHIP_PLANS.find(p => p.id === option.planId);
                        return (
                          <FormItem key={option.planId} className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value={option.planId} />
                            </FormControl>
                            <FormLabel className="font-normal text-foreground">
                              {planDetails?.name || option.label} 
                              {planDetails && <span className="text-xs text-muted-foreground ml-2">(₹{planDetails.price} / {planDetails.durationMonths}m)</span>}
                            </FormLabel>
                          </FormItem>
                        );
                      })}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditing && memberToEdit && (
                 <FormField
                    control={form.control}
                    name="membershipStatus" // This needs to be added to AddMemberFormValues if editing can change it
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-foreground">Membership Status</FormLabel>
                        <RadioGroup
                            onValueChange={(value) => {
                                // @ts-ignore
                                field.onChange(value as MembershipStatus);
                                if (memberToEdit) {
                                  memberToEdit.membershipStatus = value as MembershipStatus;
                                }
                            }}
                            value={memberToEdit.membershipStatus}
                            className="flex flex-col space-y-1"
                        >
                            {memberStatuses.filter(s => s !== 'expiring soon').map(status => (
                               <FormItem key={status} className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value={status} />
                                </FormControl>
                                <FormLabel className="font-normal capitalize text-foreground">
                                  {status}
                                </FormLabel>
                              </FormItem>
                            ))}
                        </RadioGroup>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            <DialogFooter className="pt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border hover:bg-muted">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingState} className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto">
                <UserPlus className="mr-2 h-4 w-4" />
                {isSubmittingState ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save Changes' : 'Add Member')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
    
