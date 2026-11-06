export type WorkPostType = 'looking_for_work' | 'looking_for_people';

export type WorkType = 'full-time' | 'part-time' | 'freelance' | 'internship' | 'temporary' | 'gig';

export type RemoteType = 'remote' | 'on-site' | 'hybrid';

export type ExperienceLevel = 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'executive';

export type PayType = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'project-based' | 'negotiable';

export type ApplicationStatus = 'submitted' | 'viewed' | 'shortlisted' | 'accepted' | 'rejected' | 'withdrawn';

export type ReportReason = 'scam' | 'fake_job' | 'harassment' | 'incorrect_info' | 'unsafe_request' | 'fraud_payment' | 'other';

export type NotificationType =
  | 'new_application'
  | 'application_status'
  | 'new_message'
  | 'new_match'
  | 'interest_expressed'
  | 'saved_post'
  | 'post_expiration'
  | 'verification'
  | 'moderation';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  date_of_birth: string | null;
  is_minor: boolean;
  skills: string[];
  education: string | null;
  experience: string | null;
  experience_level: string;
  portfolio_url: string | null;
  resume_url: string | null;
  is_verified: boolean;
  is_admin: boolean;
  is_founder: boolean;
  is_business: boolean;
  profile_views: number;
  privacy_settings: Record<string, boolean>;
  onboarding_completed: boolean;
  interested_in: string[];
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  work_types: string[];
  remote_preference: string;
  preferred_locations: string[];
  availability: DayAvailability[];
  expected_pay: number | null;
  pay_type: string;
  created_at: string;
  updated_at: string;
}

export interface DayAvailability {
  day: string;
  start: string;
  end: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  created_at: string;
}

export interface WorkPost {
  id: string;
  user_id: string;
  type: WorkPostType;
  title: string;
  description: string;
  category_id: string | null;
  work_type: string;
  remote_type: string;
  location: string | null;
  preferred_locations: string[];
  experience_level: string;
  education: string | null;
  number_of_openings: number;
  working_days: string[];
  start_time: string | null;
  end_time: string | null;
  availability: DayAvailability[];
  pay_amount: number | null;
  pay_max: number | null;
  pay_type: string;
  pay_frequency: string | null;
  is_negotiable: boolean;
  resume_required: boolean;
  portfolio_required: boolean;
  portfolio_url: string | null;
  resume_url: string | null;
  application_deadline: string | null;
  additional_questions: { id: string; question: string; type: string }[];
  age_min: number | null;
  age_max: number | null;
  status: string;
  is_featured: boolean;
  is_demo: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  profile?: Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'is_verified' | 'location'> | null;
  skills?: string[];
}

export interface Application {
  id: string;
  post_id: string;
  applicant_id: string;
  cover_message: string;
  resume_url: string | null;
  portfolio_url: string | null;
  answers: { question: string; answer: string }[];
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
  post?: WorkPost | null;
  applicant?: Profile | null;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  other_user?: Profile | null;
  last_message?: Message | null;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  attachment_url: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  reviewer_id: string;
  reviewee_id: string;
  post_id: string | null;
  rating: number;
  body: string;
  created_at: string;
  reviewer?: Profile | null;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_post_id: string | null;
  reason: ReportReason;
  details: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  logo_url: string | null;
  description: string | null;
  location: string | null;
  website: string | null;
  industry: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  type: string;
  document_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface SavedPost {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
  post?: WorkPost | null;
}

export interface SavedProfile {
  id: string;
  user_id: string;
  profile_id: string;
  created_at: string;
  profile?: Profile | null;
}

export interface MatchResult {
  score: number;
  level: 'strong' | 'good' | 'weak';
  reasons: string[];
}

export type SubscriptionStatus =
  | 'created'
  | 'authenticated'
  | 'active'
  | 'pending'
  | 'halted'
  | 'cancelled'
  | 'completed'
  | 'expired'
  | 'paused';

export interface Subscription {
  id: string;
  user_id: string;
  razorpay_subscription_id: string;
  razorpay_plan_id: string;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}