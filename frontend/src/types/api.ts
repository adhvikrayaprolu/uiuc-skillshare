export type StudentYear = 'freshman' | 'sophomore' | 'junior' | 'senior' | 'graduate' | 'alumni' | 'other';
export type ContactMethodType = 'email' | 'phone' | 'instagram' | 'linkedin' | 'github' | 'portfolio' | 'website' | 'other';
export type CredentialType = 'resume' | 'transcript' | 'linkedin' | 'github' | 'portfolio' | 'website' | 'certification' | 'project' | 'other';
export type HelpRequestStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
export type Urgency = 'low' | 'medium' | 'high';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_student_verified: boolean;
  has_completed_onboarding: boolean;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface SkillCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

export interface SkillTag {
  id: number;
  category: number | SkillCategory;
  category_detail?: SkillCategory;
  name: string;
  slug: string;
  description?: string;
  is_approved?: boolean;
}

export interface ProfileSkill {
  id: number;
  skill: number;
  skill_detail?: SkillTag;
  confidence_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  description?: string;
  is_featured: boolean;
}

export interface Availability {
  id: number;
  day_of_week: string;
  time_block: string;
  notes?: string;
}

export interface ContactMethod {
  id: number;
  type: ContactMethodType;
  label?: string;
  value: string;
  is_public: boolean;
}

export interface Credential {
  id: number;
  credential_type: CredentialType;
  title: string;
  url?: string;
  file?: string | null;
  visibility: 'public' | 'private' | 'hidden';
}

export interface Review {
  id: number;
  reviewer: number;
  reviewer_name?: string;
  reviewer_profile_id?: number | null;
  profile: number;
  rating: number;
  comment: string;
  related_skill?: number | null;
  created_at: string;
  updated_at?: string;
}

export interface Endorsement {
  id: number;
  endorser: number;
  endorser_name?: string;
  endorser_profile_id?: number | null;
  profile: number;
  skill?: number | null;
  skill_name?: string;
  note?: string;
  created_at: string;
}

export interface ProfileListItem {
  id: number;
  display_name: string;
  major: string;
  year: StudentYear | string;
  headline: string;
  bio?: string;
  location?: string;
  top_skills?: string[];
  top_categories?: string[];
  open_to_connect: boolean;
  preferred_contact_method: ContactMethodType;
  visibility?: 'public' | 'private';
  profile_completeness: number;
  average_rating?: number | null;
  review_count?: number;
  endorsement_count?: number;
  match_score?: number;
  match_reasons?: string[];
  semantic_reasons?: string[];
  has_resume?: boolean;
  availability_summary?: string;
}

export interface ProfileDetail extends ProfileListItem {
  interests?: string;
  availability_notes?: string;
  profile_skills: ProfileSkill[];
  availability: Availability[];
  contact_methods: ContactMethod[];
  credentials: Credential[];
  reviews_summary?: { average_rating: number | null; review_count: number };
  reviews_preview?: Review[];
  top_endorsed_skills?: Array<{ id: number; name: string; count: number }>;
}

export interface SavedProfile {
  id: number;
  saved_profile: number;
  saved_profile_detail: ProfileListItem;
  note?: string;
  created_at: string;
}

export interface HelpRequest {
  id: number;
  seeker: number;
  seeker_email?: string;
  seeker_display_name?: string;
  seeker_profile_id?: number | null;
  seeker_profile_detail?: ProfileListItem | null;
  helper_profile: number;
  helper_display_name?: string;
  helper_profile_detail?: ProfileListItem;
  topic: string;
  message: string;
  related_skill?: number | null;
  related_skill_name?: string | null;
  urgency: Urgency;
  preferred_contact_method?: ContactMethodType;
  status: HelpRequestStatus;
  response_message?: string;
  helper_contact_methods?: ContactMethod[];
  seeker_contact_methods?: ContactMethod[];
  next_step?: string;
  accepted_at?: string | null;
  declined_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface DashboardResponse {
  user: User;
  profile: ProfileDetail | null;
  profile_completeness: number;
  skill_count: number;
  saved_profile_count: number;
  incoming_help_request_count: number;
  outgoing_help_request_count?: number;
  connections_count?: number;
  review_count: number;
  next_actions: string[];
  recommended_profiles?: ProfileListItem[];
}

export interface BootstrapResponse {
  user: User;
  has_profile: boolean;
  profile: ProfileDetail | null;
  skill_categories: SkillCategory[];
  popular_skills: SkillTag[];
  dashboard: DashboardResponse;
}

export interface DiscoverySearchParams {
  q?: string;
  mode?: 'semantic' | string;
  skill?: string;
  skills?: string;
  category?: string;
  categories?: string;
  major?: string;
  year?: string;
  availability_day?: string;
  availability_time?: string;
  contact_method?: ContactMethodType;
  has_credentials?: boolean;
  open_to_connect?: boolean;
  ordering?: 'best_match' | 'recently_active' | 'highest_rated' | 'most_endorsed' | 'newest_profiles' | 'most_available' | string;
  page?: number;
}

export interface DiscoveryAiMeta {
  enabled: boolean;
  mode: string;
  model: string;
  query: string;
}

export type DiscoverySearchResponse = PaginatedResponse<ProfileListItem> & { ai?: DiscoveryAiMeta };

export interface AnalyticsSummaryResponse {
  user_summary: {
    saved_profiles_count: number;
    active_help_requests_count: number;
    connections_count: number;
    profile_skills_count: number;
    public_credentials_count: number;
    profile_completeness: number;
  };
  network_summary: {
    total_users: number;
    total_profiles: number;
    total_skills: number;
    saved_profiles_count: number;
    total_help_requests: number;
    connections_count: number;
    top_skills: Array<{ skill: string; count: number }>;
    request_status_counts: Record<string, number>;
  };
}

export interface HelpRequestPayload {
  helper_profile: number;
  topic: string;
  message: string;
  related_skill?: number;
  urgency: Urgency;
  preferred_contact_method?: ContactMethodType;
}
