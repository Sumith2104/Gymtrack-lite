
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

// Mock Membership Plans for UI selection
export const MOCK_MEMBERSHIP_PLANS: MembershipPlan[] = [
  { id: 'plan_monthly_basic', name: 'Monthly', price: 30, durationMonths: 1, description: 'Basic access, billed monthly.' },
  { id: 'plan_annual_basic', name: 'Annual', price: 300, durationMonths: 12, description: 'Full year basic access, best value.' },
  { id: 'plan_premium_monthly', name: 'Premium', price: 50, durationMonths: 1, description: 'Premium access with all perks, billed monthly.' },
  { id: 'plan_premium_annual', name: 'Premium', price: 500, durationMonths: 12, description: 'Full year premium access.' },
  { id: 'plan_6_month', name: '6-Month', price: 150, durationMonths: 6, description: '6 months of access.' },
  { id: 'plan_class_pass_10', name: 'Class Pass', price: 100, durationMonths: 3, description: '10 class pack, expires in 3 months.' }, // Assuming class passes might also have an expiry concept for duration
  { id: 'plan_other', name: 'Other', price: 0, durationMonths: 0, description: 'Custom or other plan type.' }, // For custom scenarios
];

// Available membership types for selection in forms, derived from MOCK_MEMBERSHIP_PLANS for consistency
export const AVAILABLE_MEMBERSHIP_TYPES: MembershipType[] = Array.from(new Set(MOCK_MEMBERSHIP_PLANS.map(p => p.name)));
