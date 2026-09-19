export type AppLocale = 'uz' | 'ru';

export type UserRole = 'candidate' | 'employer' | 'runner' | 'admin';

export type JobType = 'permanent' | 'temporary' | 'contract';

export type ExperienceLevel = 'none' | 'junior' | 'mid' | 'senior';

export type VacancyStatus = 'draft' | 'published' | 'closed' | 'archived';

export type ApplicationStatus =
  | 'submitted'
  | 'reviewed'
  | 'interview'
  | 'offered'
  | 'hired'
  | 'rejected'
  | 'withdrawn';

export type TaskStatus =
  | 'open'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'verified'
  | 'cancelled'
  | 'disputed';

export type TaskUrgency = 'normal' | 'urgent' | 'asap';

export type EscrowStatus = 'pending' | 'held' | 'released' | 'refunded' | 'disputed';

export type VerificationType = 'phone' | 'identity' | 'business';

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export type MessageType = 'text' | 'image' | 'system';

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  phone_verified: boolean;
  avatar_url: string | null;
  bio: string | null;
  roles: UserRole[];
  locale: AppLocale;
  region_id: string | null;
  rating_avg: number;
  rating_count: number;
  is_active: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface CandidateProfile {
  user_id: string;
  headline: string | null;
  experience_years: number;
  experience_level: ExperienceLevel;
  skills: string[];
  education: Record<string, unknown>[];
  work_history: Record<string, unknown>[];
  resume_url: string | null;
  is_public: boolean;
  updated_at: string;
}

export interface EmployerProfile {
  user_id: string;
  company_name: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  is_verified: boolean;
  updated_at: string;
}

export interface RunnerProfile {
  user_id: string;
  is_available: boolean;
  completed_tasks: number;
  updated_at: string;
}

export interface OnboardingData {
  fullName: string;
  bio?: string;
  headline?: string;
  companyName?: string;
  companyDescription?: string;
}

export interface Region {
  id: string;
  name_uz: string;
  name_ru: string;
  sort_order: number;
}

export interface Industry {
  id: string;
  name_uz: string;
  name_ru: string;
  sort_order: number;
}

export interface VacancyImage {
  id: string;
  vacancy_id: string;
  storage_path: string;
  sort_order: number;
  created_at: string;
}

export interface Vacancy {
  id: string;
  employer_id: string;
  industry_id: string | null;
  region_id: string | null;
  title: string;
  description: string;
  job_type: JobType;
  experience_level: ExperienceLevel;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  is_salary_visible: boolean;
  status: VacancyStatus;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  location?: { lat: number; lng: number } | null;
  address_text?: string | null;
}

export interface VacancyDetail extends Vacancy {
  region?: Region | null;
  industry?: Industry | null;
  vacancy_images?: VacancyImage[];
  employer?: { company_name: string } | null;
}

export interface CreateVacancyInput {
  title: string;
  description: string;
  industry_id?: string | null;
  region_id?: string | null;
  job_type: JobType;
  experience_level: ExperienceLevel;
  salary_min?: number | null;
  salary_max?: number | null;
  is_salary_visible?: boolean;
  location?: { lat: number; lng: number } | null;
  address_text?: string | null;
}

export interface MicroTask {
  id: string;
  employer_id: string;
  category_id: string | null;
  title: string;
  description: string;
  location: { lat: number; lng: number };
  address_text: string | null;
  region_id: string | null;
  price_amount: number;
  price_currency: string;
  urgency: TaskUrgency;
  status: TaskStatus;
  radius_meters: number;
  scheduled_at: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  vacancy_id: string;
  candidate_id: string;
  cover_letter: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
}

export interface ApplicationWithCandidate extends Application {
  candidate?: {
    id: string;
    full_name: string;
    phone: string | null;
    avatar_url: string | null;
    candidate_profiles?: {
      headline: string | null;
      experience_level: ExperienceLevel;
      skills: string[];
    } | null;
  } | null;
}

export interface Conversation {
  id: string;
  vacancy_application_id: string | null;
  micro_task_id: string | null;
  created_at: string;
}

export interface ConversationListItem extends Conversation {
  other_user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  last_message?: {
    body: string | null;
    created_at: string;
    sender_id: string;
  } | null;
  task_title?: string | null;
  unread?: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: MessageType;
  body: string | null;
  image_path: string | null;
  created_at: string;
}

export interface MessageWithSender extends Message {
  sender?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export interface Review {
  id: string;
  reviewer_id: string;
  reviewee_id: string;
  micro_task_id: string | null;
  vacancy_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface ReviewWithReviewer extends Review {
  reviewer?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export interface Verification {
  id: string;
  user_id: string;
  type: VerificationType;
  status: VerificationStatus;
  document_url: string | null;
  metadata: Record<string, unknown>;
  reviewed_at: string | null;
  created_at: string;
}

export interface VacancyFilters {
  regionId?: string;
  industryId?: string;
  jobType?: JobType;
  experienceLevel?: ExperienceLevel;
  salaryMin?: number;
  salaryMax?: number;
  query?: string;
}

export interface TaskMapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface TaskCategory {
  id: string;
  slug: string;
  name_uz: string;
  name_ru: string;
  sort_order: number;
}

export interface CreateMicroTaskInput {
  title: string;
  description: string;
  lat: number;
  lng: number;
  price_amount: number;
  category_id?: string | null;
  address_text?: string | null;
  region_id?: string | null;
  urgency?: TaskUrgency;
  radius_meters?: number;
}

export interface MicroTaskDetail extends MicroTask {
  category?: TaskCategory | null;
  region?: Region | null;
  task_images?: { id: string; storage_path: string }[];
  assignment?: { runner_id: string; accepted_at: string } | null;
  employer?: { company_name: string } | null;
  escrow?: EscrowTransaction | null;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  updated_at: string;
}

export interface EscrowTransaction {
  id: string;
  micro_task_id: string | null;
  payer_id: string;
  payee_id: string | null;
  amount: number;
  platform_fee: number;
  currency: string;
  status: EscrowStatus;
  external_ref: string | null;
  idempotency_key: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WalletLedgerEntry {
  id: string;
  wallet_id: string;
  amount: number;
  balance_after: number;
  description: string | null;
  escrow_transaction_id: string | null;
  created_at: string;
}
