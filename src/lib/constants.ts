
import type { NavItem } from '@/components/layout/app-header';
import { LayoutDashboard, Users, BarChart3, ScanLine, Megaphone, Settings, Dumbbell, LogOut } from 'lucide-react';
import type { MembershipPlan, MembershipType } from './types';

export const APP_NAME = "GymTrack Lite";
export const APP_LOGO = Dumbbell;

export const NAV_LINKS_HEADER: NavItem[] = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
  },
  {
    href: '/kiosk',
    icon: ScanLine,
    label: 'Check-in',
  },
  {
    href: '/members',
    icon: Users,
    label: 'Members',
  },
  {
    href: '/new-announcement',
    icon: Megaphone,
    label: 'New Announce',
  },
  {
    href: '/analytics',
    icon: BarChart3,
    label: 'Analytics',
  },
];

export const USER_NAV_LINKS = [
  {
    href: '/profile', // Mock
    icon: Settings,
    label: 'Profile',
  },
   {
    href: '/login',
    icon: LogOut,
    label: 'Logout',
    action: 'logout'
  }
];

// Updated Mock Membership Plans
export const MOCK_MEMBERSHIP_PLANS: MembershipPlan[] = [
  { id: 'plan_basic_1m', name: 'Basic', price: 599, durationMonths: 1, description: 'Basic access for 1 month.' },
  { id: 'plan_premium_6m', name: 'Premium', price: 2999, durationMonths: 6, description: 'Premium access for 6 months.' },
  { id: 'plan_annual_12m', name: 'Annual', price: 5999, durationMonths: 12, description: 'Full year access, best value.' },
];

// Available membership types for selection in forms, derived from MOCK_MEMBERSHIP_PLANS for consistency
export const AVAILABLE_MEMBERSHIP_TYPES: MembershipType[] = Array.from(new Set(MOCK_MEMBERSHIP_PLANS.map(p => p.name)));

