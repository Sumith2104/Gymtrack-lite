
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';
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
  DialogTrigger,
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
import { MOCK_MEMBERSHIP_PLANS, AVAILABLE_MEMBERSHIP_TYPES, APP_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';

const memberStatuses: MembershipStatus[] = ['active', 'inactive', 'expired', 'pending'];

const memberSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }).max(100),
  email: z.string().email({ message: 'Invalid email address.' }).optional().or(z.literal('')),
  memberId: z.string().min(3, { message: 'Member ID must be at least 3 characters.' }).max(20),
  membershipStatus: z.enum(memberStatuses as [MembershipStatus, ...MembershipStatus[]]),
  phoneNumber: z.string().optional().nullable(),
  age: z.coerce.number().int().positive().optional().nullable(),
  joinDate: z.date().nullable(),
  expiryDate: z.date().nullable().optional(),
  membershipType: z.custom<MembershipType>((val) => AVAILABLE_MEMBERSHIP_TYPES.includes(val as MembershipType), {
    message: "Invalid membership type",
  }).nullable(),
  planPrice: z.coerce.number().nonnegative().optional().nullable(),
});

type MemberFormValues = z.infer<typeof memberSchema>;

interface AddMemberDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onMemberSaved: (member: Member) => void;
  memberToEdit?: Member | null;
}

export function AddMemberDialog({ isOpen, onOpenChange, onMemberSaved, memberToEdit }: AddMemberDialogProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      name: '',
      email: '',
      memberId: '',
      membershipStatus: 'active',
      phoneNumber: null,
      age: null,
      joinDate: new Date(),
      expiryDate: null,
      membershipType: null,
      planPrice: null,
    },
  });

  useEffect(() => {
    if (memberToEdit && isOpen) {
      setIsEditing(true);
      form.reset({
        name: memberToEdit.name,
        email: memberToEdit.email || '',
        memberId: memberToEdit.memberId,
        membershipStatus: memberToEdit.membershipStatus,
        phoneNumber: memberToEdit.phoneNumber,
        age: memberToEdit.age,
        joinDate: memberToEdit.joinDate ? parseISO(memberToEdit.joinDate) : new Date(),
        expiryDate: memberToEdit.expiryDate ? parseISO(memberToEdit.expiryDate) : null,
        membershipType: memberToEdit.membershipType,
        planPrice: memberToEdit.planPrice,
      });
    } else {
      setIsEditing(false);
      form.reset({ // Reset to defaults for adding new member
        name: '', email: '', memberId: '', membershipStatus: 'active',
        phoneNumber: null, age: null, joinDate: new Date(),
        expiryDate: null, membershipType: null, planPrice: null,
      });
    }
  }, [memberToEdit, isOpen, form]);


  const handleMembershipTypeChange = (selectedTypeName: MembershipType | null, joinDateValue?: Date | null) => {
    const selectedPlan = MOCK_MEMBERSHIP_PLANS.find(p => p.name === selectedTypeName);
    const joinDate = joinDateValue instanceof Date ? joinDateValue : (form.getValues('joinDate') instanceof Date ? form.getValues('joinDate') : new Date());

    if (selectedPlan && joinDate) {
      form.setValue('planPrice', selectedPlan.price);
      if (selectedPlan.durationMonths > 0) {
        const newExpiryDate = addMonths(joinDate, selectedPlan.durationMonths);
        form.setValue('expiryDate', newExpiryDate);
      } else {
        form.setValue('expiryDate', null); // For plans with no fixed duration like 'Other' or certain Class Passes
      }
    } else {
      form.setValue('planPrice', null);
      form.setValue('expiryDate', null);
    }
  };

  const suggestMemberId = (name: string, phone: string | null | undefined, membershipType: MembershipType | null | undefined) => {
    if (!name && !phone) return '';
    const namePart = name.substring(0, 3).toUpperCase();
    const phonePart = phone ? phone.slice(-3) : Math.floor(100 + Math.random() * 900).toString();
    const typePart = membershipType ? membershipType.substring(0,2).toUpperCase() : 'GN';
    const randomSuffix = Math.random().toString(36).substring(2, 4).toUpperCase();
    return `${namePart}${phonePart}${typePart}${randomSuffix}`.substring(0,10);
  };

  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name === 'membershipType' && type === 'change') {
        // This is handled by the Select's onValueChange directly now for selectedPlan.name
      }
      if (name === 'joinDate' && type === 'change') {
        handleMembershipTypeChange(value.membershipType as MembershipType | null, value.joinDate);
      }
      if ((name === 'name' || name === 'phoneNumber' || name === 'membershipType') && type === 'change' && !isEditing && !form.formState.dirtyFields.memberId) {
         form.setValue('memberId', suggestMemberId(value.name || '', value.phoneNumber || '', value.membershipType as MembershipType | null));
      }
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, isEditing]);


  async function onSubmit(data: MemberFormValues) {
    const gymDatabaseId = localStorage.getItem('gymDatabaseId') || 'default_gym_db_id_mock'; 
    const gymName = localStorage.getItem('gymName') || APP_NAME;

    const savedMember: Member = {
      id: isEditing && memberToEdit ? memberToEdit.id : `member_${Date.now()}`,
      gymId: gymDatabaseId, 
      ...data,
      age: data.age || null,
      phoneNumber: data.phoneNumber || null,
      joinDate: data.joinDate ? data.joinDate.toISOString() : new Date().toISOString(),
      expiryDate: data.expiryDate ? data.expiryDate.toISOString() : null,
      membershipType: data.membershipType || null,
      planPrice: data.planPrice || null,
      createdAt: isEditing && memberToEdit ? memberToEdit.createdAt : new Date().toISOString(),
    };

    onMemberSaved(savedMember);

    toast({
      title: isEditing ? 'Member Updated' : 'Member Added',
      description: `${data.name} has been successfully ${isEditing ? 'updated' : 'registered'}.`,
    });

    if (!isEditing && savedMember.email) {
      console.log(`SIMULATING Welcome Email to: ${savedMember.email}`);
      console.log(`Membership Details: ID ${savedMember.memberId}, Type: ${savedMember.membershipType || 'N/A'}, Expires: ${savedMember.expiryDate ? format(parseISO(savedMember.expiryDate), 'PP') : 'N/A'}`);
      console.log(`QR Code for check-in: [Simulated QR Code for ${savedMember.memberId}]`);
    }

    if (!isEditing) {
      const welcomeAnnouncement: Announcement = {
        id: `announcement_welcome_${savedMember.id}`,
        gymId: gymDatabaseId, 
        title: `Welcome New Member: ${savedMember.name}!`,
        content: `Let's all give a warm welcome to ${savedMember.name} (ID: ${savedMember.memberId}), who joined us on ${format(parseISO(savedMember.joinDate!), 'PP')} with a ${savedMember.membershipType || 'new'} membership! We're excited to have them in the ${gymName} community.`,
        createdAt: new Date().toISOString(),
      };
      try {
        const existingAnnouncementsRaw = localStorage.getItem('gymAnnouncements');
        const existingAnnouncements: Announcement[] = existingAnnouncementsRaw ? JSON.parse(existingAnnouncementsRaw) : [];
        localStorage.setItem('gymAnnouncements', JSON.stringify([welcomeAnnouncement, ...existingAnnouncements]));
        window.dispatchEvent(new Event('storage'));
         toast({ title: "Welcome Announcement Created", description: `An announcement for ${savedMember.name} is posted.`});
      } catch (e) {
        console.error("Failed to save welcome announcement to localStorage:", e);
      }
    }
    
    onOpenChange(false); 
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
            <FormField
              control={form.control}
              name="memberId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Member ID * <span className="text-xs text-muted-foreground">(Auto-suggested for new members)</span></FormLabel>
                  <FormControl>
                    <Input placeholder="MBR001" {...field} />
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
                        onSelect={field.onChange}
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
              name="membershipType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Membership Type *</FormLabel>
                  <Select 
                    onValueChange={(selectedPlanId) => {
                      const selectedPlan = MOCK_MEMBERSHIP_PLANS.find(p => p.id === selectedPlanId);
                      if (selectedPlan) {
                        field.onChange(selectedPlan.name as MembershipType); 
                        handleMembershipTypeChange(selectedPlan.name as MembershipType | null, form.getValues('joinDate'));
                      } else {
                        field.onChange(null);
                        handleMembershipTypeChange(null, form.getValues('joinDate'));
                      }
                    }} 
                    value={MOCK_MEMBERSHIP_PLANS.find(p => p.name === field.value)?.id || undefined}
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
            <FormField
              control={form.control}
              name="planPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan Price</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 49.99" {...field} value={field.value ?? ""} readOnly className="bg-muted/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expiryDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Expiry Date</FormLabel>
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
                            <span>Pick expiry date or auto-calculated</span>
                          )}
                          <CalendarIconLucide className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
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
              name="membershipStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Membership Status *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
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
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save Changes' : 'Add Member')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
