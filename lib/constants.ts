import type { WorkType, RemoteType, ExperienceLevel, PayType } from '@/lib/types';

export const WORK_TYPES: { value: WorkType; label: string }[] = [
  { value: 'full-time', label: 'Full-Time' },
  { value: 'part-time', label: 'Part-Time' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'internship', label: 'Internship' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'gig', label: 'Gig' },
];

export const REMOTE_TYPES: { value: RemoteType; label: string }[] = [
  { value: 'remote', label: 'Remote' },
  { value: 'on-site', label: 'On-Site' },
  { value: 'hybrid', label: 'Hybrid' },
];

export const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'executive', label: 'Executive' },
];

export const PAY_TYPES: { value: PayType; label: string }[] = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'project-based', label: 'Project-Based' },
  { value: 'negotiable', label: 'Negotiable' },
];

export const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const REPORT_REASONS: { value: string; label: string }[] = [
  { value: 'scam', label: 'Scam' },
  { value: 'fake_job', label: 'Fake Job' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'incorrect_info', label: 'Incorrect Information' },
  { value: 'unsafe_request', label: 'Unsafe Request' },
  { value: 'fraud_payment', label: 'Fraud / Payment Issue' },
  { value: 'other', label: 'Other' },
];

export const APPLICATION_STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'submitted', label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
  { value: 'viewed', label: 'Viewed', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'shortlisted', label: 'Shortlisted', color: 'bg-purple-100 text-purple-700' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-700' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
  { value: 'withdrawn', label: 'Withdrawn', color: 'bg-gray-100 text-gray-700' },
];

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function formatPay(amount: number | null, max: number | null, type: string, negotiable: boolean): string {
  if (negotiable && !amount) return 'Negotiable';
  if (!amount) return 'Not specified';
  const prefix = '$';
  const suffix = type === 'hourly' ? '/hr' : type === 'daily' ? '/day' : type === 'weekly' ? '/wk' : type === 'monthly' ? '/mo' : '';
  if (max && max > amount) return `${prefix}${amount}-${max}${suffix}`;
  return `${prefix}${amount}${suffix}`;
}

export function getWorkTypeLabel(value: string): string {
  return WORK_TYPES.find(w => w.value === value)?.label ?? value;
}

export function getRemoteTypeLabel(value: string): string {
  return REMOTE_TYPES.find(r => r.value === value)?.label ?? value;
}

export function getExperienceLabel(value: string): string {
  return EXPERIENCE_LEVELS.find(e => e.value === value)?.label ?? value;
}

export function getPayTypeLabel(value: string): string {
  return PAY_TYPES.find(p => p.value === value)?.label ?? value;
}

export function getApplicationStatusLabel(value: string): string {
  return APPLICATION_STATUSES.find(a => a.value === value)?.label ?? value;
}

export function getApplicationStatusColor(value: string): string {
  return APPLICATION_STATUSES.find(a => a.value === value)?.color ?? 'bg-gray-100 text-gray-700';
}
