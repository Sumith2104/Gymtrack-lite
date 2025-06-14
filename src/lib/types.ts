
export type MembershipStatus = 'active' | 'inactive' | 'expired' | 'pending';

export interface Member {
  id: string; // uuid
  gymId: string; // uuid, FK to gyms.id
  planId?: string | null; // uuid, FK to plans.id
  memberId: string; // User-defined member identifier (e.g., MBR001)
  name: string;
  email: string;
  membershipStatus: MembershipStatus;
  createdAt: string; // timestamptz
  age?: number | null;
  phoneNumber?: string | null;
  joinDate?: string | null; // timestamptz
  expiryDate?: string | null; // timestamptz
  membershipType?: string | null; // e.g., 'monthly', 'annual', 'class_pass'
}

export interface Announcement {
  id: string; // uuid
  gymId: string; // uuid, FK to gyms.id
  title: string;
  content: string;
  createdAt: string; // timestamptz
  updatedAt?: string | null; 
}

export interface Gym {
  id: string; // uuid
  name: string;
  ownerEmail: string;
  ownerUserId?: string | null; 
  formattedGymId: string; 
  createdAt: string; // timestamptz
  status: string; 
}

export interface Plan {
  id: string; // uuid
  planName: string;
  price: number; // numeric
  durationMonths?: number | null;
  isActive: boolean;
  planId?: string | null; 
}

export interface CheckIn { // This is the raw DB record type
  id: string; // uuid
  gymId: string; // uuid, FK to gyms.id
  memberTableId: string; // uuid, FK to members.id
  checkInTime: string; // timestamptz
  checkOutTime?: string | null; // timestamptz
  createdAt: string; // timestamptz
}

// Type for displaying formatted check-in information in the UI
export interface FormattedCheckIn {
  memberTableId: string; // The actual UUID of the member from members table
  memberName: string;
  memberId: string; // The user-facing MBR001 style ID
  checkInTime: Date; // Use Date object for easier manipulation client-side
  gymName: string; // Name of the gym where check-in occurred
}


export interface SuperAdmin {
  id: string; // uuid
  email: string;
  passwordHash: string; 
  createdAt: string; // timestamptz
  updatedAt?: string | null; // timestamptz
}


// For chart data
export interface DailyCheckIns {
  date: string;
  count: number;
}

export interface OccupancyData {
  time: string;
  count: number;
}

export interface MembershipDistribution {
  status: string;
  count: number;
}
