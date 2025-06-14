
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { PlusCircle, CalendarIcon as CalendarIconLucide, Edit } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import type { Member, MembershipStatus, MembershipPlan, MembershipType, Announcement } from '@/lib/types';
import { MOCK_MEMBERSHIP_PLANS, APP_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { addMember } from '@/app/actions/member-actions';
import { addMemberFormSchema, type AddMemberFormValues } from '@/lib/schemas/member-schemas';


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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberFormSchema),
    defaultValues: {
      name: '',
      email: '',
      memberId: '',
      phoneNumber: null,
      age: null,
      joinDate: new Date(),
      membershipType: MOCK_MEMBERSHIP_PLANS[0]?.name || undefined, // Default to first plan type
    },
  });
  
  // Effect to handle pre-filling form for editing or resetting for adding
  useEffect(() => {
    if (isOpen) {
      if (memberToEdit) {
        setIsEditing(true);
        form.reset({
          name: memberToEdit.name,
          email: memberToEdit.email || '',
          memberId: memberToEdit.memberId,
          phoneNumber: memberToEdit.phoneNumber,
          age: memberToEdit.age,
          joinDate: memberToEdit.joinDate ? parseISO(memberToEdit.joinDate) : new Date(),
          membershipType: memberToEdit.membershipType || MOCK_MEMBERSHIP_PLANS[0]?.name,
          // Plan price & expiry date are re-calculated based on type and join date
        });
        // Trigger calculation for existing member
        const initialPlan = MOCK_MEMBERSHIP_PLANS.find(p => p.name === (memberToEdit.membershipType || MOCK_MEMBERSHIP_PLANS[0]?.name));
        const initialJoinDate = memberToEdit.joinDate ? parseISO(memberToEdit.joinDate) : new Date();
        if (initialPlan && initialJoinDate) {
            updateCalculatedFields(initialPlan, initialJoinDate);
        }

      } else {
        setIsEditing(false);
        form.reset({
          name: '', email: '', memberId: '',
          phoneNumber: null, age: null, joinDate: new Date(),
          membershipType: MOCK_MEMBERSHIP_PLANS[0]?.name,
        });
        // Trigger calculation for new member default
         const defaultPlan = MOCK_MEMBERSHIP_PLANS.find(p => p.name === MOCK_MEMBERSHIP_PLANS[0]?.name);
         if (defaultPlan) {
            updateCalculatedFields(defaultPlan, new Date());
         }
         if (!form.formState.dirtyFields.memberId) {
            form.setValue('memberId', suggestMemberId('', null, MOCK_MEMBERSHIP_PLANS[0]?.name));
         }
      }
    }
  }, [memberToEdit, isOpen, form]);


  const updateCalculatedFields = (selectedPlan: MembershipPlan | undefined, joinDateValue: Date | null | undefined) => {
    const joinDate = joinDateValue instanceof Date ? joinDateValue : (form.getValues('joinDate') instanceof Date ? form.getValues('joinDate') : new Date());

    if (selectedPlan && joinDate) {
      form.setValue('planPrice' as any, selectedPlan.price, { shouldValidate: true }); // 'planPrice' is not in AddMemberFormValues, handled by server
      if (selectedPlan.durationMonths > 0) {
        const newExpiryDate = addMonths(joinDate, selectedPlan.durationMonths);
        form.setValue('expiryDate' as any, newExpiryDate, { shouldValidate: true }); // 'expiryDate' is not in AddMemberFormValues
      } else {
        form.setValue('expiryDate' as any, null, { shouldValidate: true });
      }
    } else {
      form.setValue('planPrice' as any, null, { shouldValidate: true });
      form.setValue('expiryDate' as any, null, { shouldValidate: true });
    }
  };

  const handleMembershipTypeChange = (selectedPlanName: MembershipType | null | undefined) => {
    const selectedPlan = MOCK_MEMBERSHIP_PLANS.find(p => p.name === selectedPlanName);
    form.setValue('membershipType', selectedPlanName as MembershipType); // Ensure form state is updated
    updateCalculatedFields(selectedPlan, form.getValues('joinDate'));
  };
  
  const handleJoinDateChange = (date: Date | undefined) => {
      form.setValue('joinDate', date || new Date());
      const currentMembershipTypeName = form.getValues('membershipType');
      const selectedPlan = MOCK_MEMBERSHIP_PLANS.find(p=>p.name === currentMembershipTypeName);
      updateCalculatedFields(selectedPlan, date);
  };


  const suggestMemberId = (name: string, phone: string | null | undefined, membershipType: MembershipType | null | undefined) => {
    if (!name && !phone && !membershipType) return '';
    const namePart = name.substring(0, 3).toUpperCase();
    const phonePart = phone ? phone.slice(-3) : Math.floor(100 + Math.random() * 900).toString();
    const typePart = membershipType ? membershipType.substring(0,2).toUpperCase() : 'GN';
    const randomSuffix = Math.random().toString(36).substring(2, 4).toUpperCase();
    return `${namePart}${phonePart}${typePart}${randomSuffix}`.substring(0,10);
  };

  useEffect(() => {
    const subscription = form.watch((value, { name: fieldName, type }) => {
      if ((fieldName === 'name' || fieldName === 'phoneNumber' || fieldName === 'membershipType') && type === 'change' && !isEditing && !form.formState.dirtyFields.memberId) {
         form.setValue('memberId', suggestMemberId(value.name || '', value.phoneNumber || '', value.membershipType as MembershipType | null));
      }
    });
    return () => subscription.unsubscribe();
  }, [form, isEditing]);


  async function onSubmit(data: AddMemberFormValues) {
    setIsSubmitting(true);
    const gymDatabaseId = localStorage.getItem('gymDatabaseId') || 'default_gym_db_id_mock';
    const gymName = localStorage.getItem('gymName') || APP_NAME;

    if (isEditing && memberToEdit) {
      // Simulate edit: In a real app, call an editMember server action
      console.log("SIMULATING: Edit member with data:", data);
      const updatedMember: Member = {
        ...memberToEdit,
        ...data,
        email: data.email || null,
        age: data.age || null,
        phoneNumber: data.phoneNumber || null,
        joinDate: data.joinDate ? data.joinDate.toISOString() : new Date().toISOString(),
        membershipType: data.membershipType || null,
        // Recalculate planPrice and expiryDate based on current logic if membershipType or joinDate changed
      };
      const selectedPlan = MOCK_MEMBERSHIP_PLANS.find(p => p.name === updatedMember.membershipType);
      if (selectedPlan && updatedMember.joinDate) {
          updatedMember.planPrice = selectedPlan.price;
          updatedMember.planId = selectedPlan.id;
          if (selectedPlan.durationMonths > 0) {
              updatedMember.expiryDate = addMonths(parseISO(updatedMember.joinDate), selectedPlan.durationMonths).toISOString();
          } else {
              updatedMember.expiryDate = null;
          }
      }
      onMemberSaved(updatedMember);
      toast({
        title: 'Member Updated',
        description: `${updatedMember.name} has been successfully updated. (Simulated)`,
      });
      onOpenChange(false);

    } else {
      // Adding new member
      const response = await addMember(data, gymDatabaseId, gymName);

      if (response.error) {
        toast({
          variant: "destructive",
          title: 'Error Adding Member',
          description: response.error,
        });
      } else if (response.data) {
        onMemberSaved(response.data.newMember);

        // Save welcome announcement to localStorage
        try {
          const existingAnnouncementsRaw = localStorage.getItem('gymAnnouncements');
          const existingAnnouncements: Announcement[] = existingAnnouncementsRaw ? JSON.parse(existingAnnouncementsRaw) : [];
          localStorage.setItem('gymAnnouncements', JSON.stringify([response.data.welcomeAnnouncement, ...existingAnnouncements]));
          window.dispatchEvent(new Event('storage')); // Notify other parts of app
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
    setIsSubmitting(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center">
            {isEditing ? <Edit className="mr-2 h-5 w-5 text-primary" /> : <PlusCircle className="mr-2 h-5 w-5 text-primary" />}
            {isEditing ? 'Edit Member Details' : 'Register New Member'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the member's information." : "Fill in the details to add a new member to your gym."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 py-3 max-h-[70vh] overflow-y-auto pr-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
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
                  <FormLabel>Email Address (Optional)</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john.doe@example.com" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             {/* Display only field for Member ID, as it's auto-suggested/handled */}
            <FormField
              control={form.control}
              name="memberId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Member ID * <span className="text-xs text-muted-foreground">(Auto-suggested for new members)</span></FormLabel>
                  <FormControl>
                    <Input placeholder="MBR001" {...field} readOnly={!isEditing && form.formState.dirtyFields.memberId !== true}/>
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
                  <FormLabel>Phone Number (Optional)</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+1234567890" {...field} value={field.value ?? ""} />
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
                  <FormLabel>Age (Optional)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="30" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="joinDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Join Date *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIconLucide className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => handleJoinDateChange(date)}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="membershipType" // This field in the form stores plan.name (MembershipType)
              render={({ field }) => ( 
                <FormItem>
                  <FormLabel>Membership Type *</FormLabel>
                  <Select 
                    onValueChange={(selectedPlanId) => { // onValueChange now gives plan.id
                      const selectedPlan = MOCK_MEMBERSHIP_PLANS.find(p => p.id === selectedPlanId);
                      if (selectedPlan) {
                        field.onChange(selectedPlan.name); // Update form with plan.name
                        handleMembershipTypeChange(selectedPlan.name); // Pass plan.name to handler
                      }
                    }}
                    value={MOCK_MEMBERSHIP_PLANS.find(p => p.name === field.value)?.id || undefined} // Select value should be plan.id
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select membership type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MOCK_MEMBERSHIP_PLANS.map(plan => (
                        <SelectItem key={plan.id} value={plan.id} className="capitalize">
                          {plan.name} - ${plan.price} ({plan.durationMonths ? `${plan.durationMonths}m` : 'N/A'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             {/* These are shown for info, calculated based on selections */}
            <FormItem>
                <FormLabel>Plan Price (Calculated)</FormLabel>
                <Input 
                    type="text" 
                    value={form.getValues('planPrice' as any) ? `$${Number(form.getValues('planPrice' as any)).toFixed(2)}` : 'N/A'} 
                    readOnly 
                    className="bg-muted/50" 
                />
            </FormItem>
            <FormItem>
                <FormLabel>Expiry Date (Calculated)</FormLabel>
                <Input 
                    type="text" 
                    value={form.getValues('expiryDate' as any) ? format(form.getValues('expiryDate' as any), 'PPP') : 'N/A'} 
                    readOnly 
                    className="bg-muted/50" 
                />
            </FormItem>

            {isEditing && memberToEdit && ( // Only show status field when editing
                 <FormField
                    control={form.control}
                    name="membershipStatus" // This needs to be added to AddMemberFormValues if editing can change it
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Membership Status *</FormLabel>
                        <Select 
                            onValueChange={(value) => {
                                // @ts-ignore
                                field.onChange(value as MembershipStatus);
                                // If you need to update memberToEdit directly or trigger other side effects
                                if (memberToEdit) {
                                  memberToEdit.membershipStatus = value as MembershipStatus;
                                }
                            }}
                            value={memberToEdit.membershipStatus} // Use actual member status for edit
                        >
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={memberToEdit.membershipStatus || "Select status"} />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {memberStatuses.filter(s => s !== 'expiring soon').map(status => (
                                <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save Changes' : 'Add Member')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    