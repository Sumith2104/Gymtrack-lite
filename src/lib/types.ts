export interface Member {
  id: string;
  memberId: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'expired';
  lastCheckIn: string | null;
  gymId: string;
  qrCodeUrl?: string; // Optional: URL to the QR code image
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  gymId: string;
}

export interface Gym {
  id: string;
  name: string;
  ownerEmail: string;
}

export interface CheckInRecord {
  id: string;
  memberId: string;
  timestamp: string;
  gymId: string;
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
