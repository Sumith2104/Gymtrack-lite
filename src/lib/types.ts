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
}

export interface Gym {
  id: string; // uuid
  name: string;
  ownerEmail: string;
  ownerUserId?: string | null; // FK to auth.users.id (Supabase Auth)
  formattedGymId: string; // User-friendly gym identifier (e.g., GYM123)
  createdAt: string; // timestamptz
  status: string; // e.g., 'active', 'inactive', 'pending_setup'
}

export interface Plan {
  id: string; // uuid
  planName: string;
  price: number; // numeric
  durationMonths?: number | null;
  isActive: boolean;
  planId?: string | null; // User-defined plan identifier/SKU (e.g., GOLD_MONTHLY)
  gymId?: string | null; // uuid, FK to gyms.id - if plans are gym-specific
}

export interface CheckIn {
  id: string; // uuid
  gymId: string; // uuid, FK to gyms.id
  memberTableId: string; // uuid, FK to members.id
  checkInTime: string; // timestamptz
  checkOutTime?: string | null; // timestamptz
  createdAt: string; // timestamptz
}

export interface SuperAdmin {
  id: string; // uuid
  email: string;
  passwordHash: string;
  createdAt: string; // timestamptz
  updatedAt?: string | null; // timestamptz
}


// For chart data (can remain as is or be updated if data sources change)
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
