// View models the pages render, mapped from API responses in lib/mappers.ts.

export interface Profile {
  id: number;
  name: string;
  major: string;
  year: string;
  headline: string;
  bio: string;
  skills: Skill[];
  availability: Availability[];
  matchScore?: number;
  matchReasons?: string[];
  openToConnect: boolean;
  location?: string;
  credentials: Credential[];
  contacts: Contact[];
  interests: string[];
  reviews?: Review[];
  swap?: import('../types/api').SwapSummary | null;
}

export interface Skill {
  name: string;
  category: string;
  confidence?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  featured?: boolean;
  description?: string;
}

export interface Availability {
  day: string;
  timeBlock: string;
  notes?: string;
}

export interface Credential {
  type: 'linkedin' | 'github' | 'portfolio' | 'resume' | 'transcript' | 'website' | 'certification' | 'project' | 'other';
  title: string;
  url: string;
  visibility: 'public' | 'private';
}

export interface Contact {
  id?: number;
  type: 'email' | 'phone' | 'linkedin' | 'github' | 'instagram' | 'portfolio' | 'website' | 'other';
  value: string;
  preferred: boolean;
  visibility: 'public' | 'private';
}

export interface Review {
  id: number;
  reviewer: string;
  rating: number;
  comment: string;
  date: string;
}

export interface HelpRequest {
  id: number;
  requester: Profile;
  helper: Profile;
  topic: string;
  relatedSkill: string;
  kind?: 'help' | 'swap';
  offeredSkill?: string | null;
  message: string;
  urgency: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'Accepted' | 'Declined' | 'Completed' | 'Cancelled';
  createdAt: string;
}
