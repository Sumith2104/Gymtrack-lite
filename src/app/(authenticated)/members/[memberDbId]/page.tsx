
import { getMemberById } from '@/app/actions/member-actions';
import { notFound } from 'next/navigation';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, Calendar, Shield, IndianRupee, Hash, BarChartHorizontal, MessageSquare } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import type { EffectiveMembershipStatus } from '@/lib/types';
import { MemberCheckinHistoryChart } from '@/components/members/member-checkin-history-chart';
import { BackButton } from '@/components/layout/back-button';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function getEffectiveDisplayStatus(status: string, expiryDateStr: string | null): EffectiveMembershipStatus {
  if (status === 'expired' || status === 'expiring soon') {
    return status as EffectiveMembershipStatus;
  }
  if (expiryDateStr) {
    const expiry = parseISO(expiryDateStr);
    if (isValid(expiry)) {
      const days = differenceInDays(expiry, new Date());
      if (days < 0) return 'expired';
      if (days <= 14) return 'expiring soon';
      return 'active';
    }
  }
  return 'active';
}

function StatusBadge({ status, expiryDate }: { status: string, expiryDate: string | null }) {
    const effectiveStatus = getEffectiveDisplayStatus(status, expiryDate);
    let badgeClass = '';
    if (effectiveStatus === 'active') badgeClass = 'bg-green-500/20 text-green-700 border-green-500/30 hover:bg-green-500/30 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20 dark:hover:bg-green-500/20';
    else if (effectiveStatus === 'expired') badgeClass = 'bg-red-500/20 text-red-700 border-red-500/30 hover:bg-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 dark:hover:bg-red-500/20'; 
    else if (effectiveStatus === 'expiring soon') badgeClass = 'bg-orange-500/20 text-orange-700 border-orange-500/30 hover:bg-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20 dark:hover:bg-orange-500/20';
    return <Badge variant="outline" className={`capitalize text-base ${badgeClass}`}>{effectiveStatus}</Badge>;
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number | null | undefined }) {
  return (
    <div className="flex items-start">
      <Icon className="h-5 w-5 text-primary mt-1 mr-3" />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-semibold text-foreground">{value || 'N/A'}</p>
      </div>
    </div>
  )
}

const getInitials = (name: string): string => {
  if (!name) return '??';
  const names = name.trim().split(/\s+/).filter(Boolean);
  if (names.length === 0) return '??';

  if (names.length > 1) {
    const firstInitial = names[0][0];
    const lastInitial = names[names.length - 1][0];
    return (firstInitial + lastInitial).toUpperCase();
  }
  
  if (names[0].length > 1) {
    return names[0].substring(0, 2).toUpperCase();
  }
  
  return names[0][0].toUpperCase();
};


export default async function MemberProfilePage({ params }: { params: { memberDbId: string } }) {
  const { data: member, error } = await getMemberById(params.memberDbId);

  if (error || !member) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <BackButton />
      </div>
      <Card className="w-full shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
                <Avatar className="h-32 w-32 border-4 border-primary/50">
                    <AvatarImage src={member.profileUrl || ''} alt={`${member.name}'s profile picture`} data-ai-hint="profile picture" />
                    <AvatarFallback className="text-4xl font-bold bg-muted text-muted-foreground">
                        {getInitials(member.name)}
                    </AvatarFallback>
                </Avatar>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl font-bold text-foreground">{member.name}</h1>
              <p className="text-lg text-muted-foreground">Member ID: {member.memberId}</p>
              <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-4">
                <StatusBadge status={member.membershipStatus} expiryDate={member.expiryDate} />
                <Link href={`/messages?memberId=${member.id}`}>
                  <Button variant="outline">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Start a Chat
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><User className="mr-2 text-primary" /> Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <InfoItem icon={Mail} label="Email Address" value={member.email} />
             <InfoItem icon={Phone} label="Phone Number" value={member.phoneNumber} />
             <InfoItem icon={Calendar} label="Age" value={member.age} />
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><Shield className="mr-2 text-primary" /> Membership Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoItem icon={Hash} label="Plan Type" value={member.membershipType} />
            <InfoItem icon={IndianRupee} label="Plan Price" value={member.planPrice?.toFixed(2)} />
            <InfoItem icon={Calendar} label="Join Date" value={member.joinDate ? format(parseISO(member.joinDate), 'PPP') : 'N/A'} />
            <InfoItem icon={Calendar} label="Expiry Date" value={member.expiryDate ? format(parseISO(member.expiryDate), 'PPP') : 'N/A'} />
          </CardContent>
        </Card>
      </div>

       <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><BarChartHorizontal className="mr-2 text-primary" /> Check-in History</CardTitle>
            <CardDescription>Monthly check-ins over the last year.</CardDescription>
          </CardHeader>
          <CardContent>
            <MemberCheckinHistoryChart memberDbId={member.id} />
          </CardContent>
        </Card>
    </div>
  );
}
