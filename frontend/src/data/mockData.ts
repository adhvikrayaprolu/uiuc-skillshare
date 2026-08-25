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
  message: string;
  urgency: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'Accepted' | 'Declined' | 'Completed' | 'Cancelled';
  createdAt: string;
}

export const mockProfiles: Profile[] = [
  {
    id: 1,
    name: 'Riya Patel',
    major: 'Computer Science',
    year: 'Junior',
    headline: 'Product-minded CS student interested in design systems and startups',
    bio: "I'm passionate about building products that users love. I have experience with frontend development, design systems, and early-stage startup work. Always happy to help fellow students with resume reviews, design tools, or career guidance in tech.",
    skills: [
      { name: 'Figma', category: 'Creative', confidence: 'Advanced', featured: true },
      { name: 'React', category: 'Technical', confidence: 'Intermediate', featured: true },
      { name: 'Startup Experience', category: 'Experience', confidence: 'Intermediate', featured: true },
      { name: 'Resume Review', category: 'Career', confidence: 'Advanced', featured: false },
    ],
    availability: [
      { day: 'Monday', timeBlock: 'Evening' },
      { day: 'Wednesday', timeBlock: 'Evening' },
      { day: 'Friday', timeBlock: 'Afternoon' },
    ],
    matchScore: 92,
    matchReasons: ['Matches Figma', 'Open to project collaboration'],
    openToConnect: true,
    location: 'Urbana, IL',
    credentials: [
      { type: 'portfolio', title: 'Personal Portfolio', url: 'https://riyapatel.com', visibility: 'public' },
      { type: 'linkedin', title: 'LinkedIn Profile', url: 'https://linkedin.com/in/riyapatel', visibility: 'public' },
    ],
    contacts: [
      { type: 'email', value: 'rpatel@illinois.edu', preferred: true, visibility: 'public' },
      { type: 'linkedin', value: 'https://linkedin.com/in/riyapatel', preferred: false, visibility: 'public' },
    ],
    interests: ['Product Management', 'Design Systems', 'Startups', 'Figma Plugins'],
    reviews: [
      { id: 1, reviewer: 'Alex Chen', rating: 5, comment: 'Super helpful with Figma tips!', date: '2026-04-15' },
      { id: 2, reviewer: 'Sarah Kim', rating: 5, comment: 'Great resume feedback, got my internship!', date: '2026-04-01' },
    ]
  },
  {
    id: 2,
    name: 'Daniel Kim',
    major: 'Statistics',
    year: 'Senior',
    headline: 'Data-focused student with research and analytics experience',
    bio: "I work at the intersection of statistics and computer science. I've done research in machine learning and currently work as a data analyst. Happy to help with Python, SQL, data analysis, or research opportunities.",
    skills: [
      { name: 'Python', category: 'Technical', confidence: 'Expert', featured: true },
      { name: 'SQL', category: 'Technical', confidence: 'Advanced', featured: true },
      { name: 'Data Analysis', category: 'Technical', confidence: 'Advanced', featured: true },
      { name: 'Research Experience', category: 'Experience', confidence: 'Advanced', featured: false },
    ],
    availability: [
      { day: 'Saturday', timeBlock: 'Morning' },
      { day: 'Sunday', timeBlock: 'Afternoon' },
    ],
    matchScore: 88,
    matchReasons: ['Matches Python', 'Available weekends'],
    openToConnect: true,
    location: 'Champaign, IL',
    credentials: [
      { type: 'github', title: 'GitHub', url: 'https://github.com/danielkim', visibility: 'public' },
      { type: 'resume', title: 'Resume', url: '#', visibility: 'public' },
    ],
    contacts: [
      { type: 'email', value: 'dkim@illinois.edu', preferred: true, visibility: 'public' },
      { type: 'github', value: 'https://github.com/danielkim', preferred: false, visibility: 'public' },
    ],
    interests: ['Machine Learning', 'Data Science', 'Research', 'Statistics'],
  },
  {
    id: 3,
    name: 'Maya Johnson',
    major: 'Information Sciences',
    year: 'Sophomore',
    headline: 'Peer mentor interested in career prep and student organizations',
    bio: "I love helping other students navigate their career journeys. I'm involved in several RSOs and have learned a lot about resume building, networking, and leadership. Let's connect!",
    skills: [
      { name: 'Resume Review', category: 'Career', confidence: 'Advanced', featured: true },
      { name: 'LinkedIn Feedback', category: 'Career', confidence: 'Intermediate', featured: true },
      { name: 'RSO Leadership', category: 'Experience', confidence: 'Advanced', featured: true },
      { name: 'Public Speaking', category: 'Creative', confidence: 'Intermediate', featured: false },
    ],
    availability: [
      { day: 'Tuesday', timeBlock: 'Afternoon' },
      { day: 'Thursday', timeBlock: 'Afternoon' },
    ],
    matchScore: 85,
    matchReasons: ['Career guidance expert', 'Active in student orgs'],
    openToConnect: true,
    location: 'Urbana, IL',
    credentials: [
      { type: 'linkedin', title: 'LinkedIn', url: 'https://linkedin.com/in/mayajohnson', visibility: 'public' },
    ],
    contacts: [
      { type: 'email', value: 'mjohnson@illinois.edu', preferred: true, visibility: 'public' },
      { type: 'linkedin', value: 'https://linkedin.com/in/mayajohnson', preferred: false, visibility: 'public' },
    ],
    interests: ['Career Development', 'Student Leadership', 'Networking', 'Mentorship'],
  },
  {
    id: 4,
    name: 'Arjun Mehta',
    major: 'Math + CS',
    year: 'Junior',
    headline: 'Builder interested in backend tools, GitHub workflows, and project collaboration',
    bio: "I build things and enjoy collaborating on projects. Strong backend skills, love working with APIs and databases. Always looking for hackathon teammates or project collaborators.",
    skills: [
      { name: 'Python', category: 'Technical', confidence: 'Advanced', featured: true },
      { name: 'GitHub', category: 'Technical', confidence: 'Expert', featured: true },
      { name: 'SQL', category: 'Technical', confidence: 'Intermediate', featured: false },
      { name: 'Project Collaboration', category: 'Experience', confidence: 'Advanced', featured: true },
    ],
    availability: [
      { day: 'Monday', timeBlock: 'Evening' },
      { day: 'Wednesday', timeBlock: 'Evening' },
      { day: 'Friday', timeBlock: 'Evening' },
    ],
    matchScore: 90,
    matchReasons: ['Technical collaboration', 'GitHub expert'],
    openToConnect: true,
    location: 'Champaign, IL',
    credentials: [
      { type: 'github', title: 'GitHub', url: 'https://github.com/arjunmehta', visibility: 'public' },
      { type: 'portfolio', title: 'Portfolio', url: 'https://arjunmehta.dev', visibility: 'public' },
    ],
    contacts: [
      { type: 'email', value: 'amehta@illinois.edu', preferred: true, visibility: 'public' },
      { type: 'github', value: 'https://github.com/arjunmehta', preferred: false, visibility: 'public' },
    ],
    interests: ['Backend Development', 'APIs', 'Hackathons', 'Open Source'],
  },
  {
    id: 5,
    name: 'Sofia Garcia',
    major: 'Industrial Design',
    year: 'Senior',
    headline: 'Designer helping students with portfolios, Figma, and visual storytelling',
    bio: "Design is my passion. I specialize in visual design, branding, and helping students build portfolios that stand out. If you need design help or portfolio reviews, reach out!",
    skills: [
      { name: 'Figma', category: 'Creative', confidence: 'Expert', featured: true },
      { name: 'Graphic Design', category: 'Creative', confidence: 'Expert', featured: true },
      { name: 'Portfolio Review', category: 'Career', confidence: 'Advanced', featured: true },
      { name: 'Public Speaking', category: 'Creative', confidence: 'Intermediate', featured: false },
    ],
    availability: [
      { day: 'Monday', timeBlock: 'Morning' },
      { day: 'Wednesday', timeBlock: 'Morning' },
      { day: 'Friday', timeBlock: 'Morning' },
    ],
    matchScore: 87,
    matchReasons: ['Design expert', 'Portfolio guidance'],
    openToConnect: true,
    location: 'Urbana, IL',
    credentials: [
      { type: 'portfolio', title: 'Design Portfolio', url: 'https://sofiagarcia.design', visibility: 'public' },
      { type: 'linkedin', title: 'LinkedIn', url: 'https://linkedin.com/in/sofiagarcia', visibility: 'public' },
    ],
    contacts: [
      { type: 'email', value: 'sgarcia@illinois.edu', preferred: true, visibility: 'public' },
      { type: 'portfolio', value: 'https://sofiagarcia.design', preferred: false, visibility: 'public' },
    ],
    interests: ['Visual Design', 'Branding', 'Typography', 'Portfolio Building'],
  },
  {
    id: 6,
    name: 'Emily Chen',
    major: 'Business',
    year: 'Junior',
    headline: 'Interested in consulting prep, interview strategy, and networking',
    bio: "Business major with experience in consulting case prep and professional networking. I've helped dozens of students prepare for consulting interviews. Happy to do mock interviews and networking advice.",
    skills: [
      { name: 'Consulting Prep', category: 'Career', confidence: 'Advanced', featured: true },
      { name: 'Interview Prep', category: 'Career', confidence: 'Advanced', featured: true },
      { name: 'Networking Advice', category: 'Career', confidence: 'Intermediate', featured: true },
      { name: 'Resume Review', category: 'Career', confidence: 'Intermediate', featured: false },
    ],
    availability: [
      { day: 'Saturday', timeBlock: 'Afternoon' },
      { day: 'Sunday', timeBlock: 'Morning' },
    ],
    matchScore: 83,
    matchReasons: ['Career prep focus', 'Interview coaching'],
    openToConnect: true,
    location: 'Champaign, IL',
    credentials: [
      { type: 'linkedin', title: 'LinkedIn', url: 'https://linkedin.com/in/emilychen', visibility: 'public' },
      { type: 'resume', title: 'Resume', url: '#', visibility: 'public' },
    ],
    contacts: [
      { type: 'email', value: 'echen@illinois.edu', preferred: true, visibility: 'public' },
      { type: 'linkedin', value: 'https://linkedin.com/in/emilychen', preferred: false, visibility: 'public' },
    ],
    interests: ['Consulting', 'Case Interviews', 'Professional Networking', 'Career Strategy'],
  },
];

export const mockHelpRequests: HelpRequest[] = [
  {
    id: 1,
    requester: mockProfiles[1],
    helper: mockProfiles[0],
    topic: 'Figma design review',
    relatedSkill: 'Figma',
    message: "Hi! I'm working on a project and would love some feedback on my Figma designs.",
    urgency: 'Medium',
    status: 'Pending',
    createdAt: '2026-05-03',
  },
  {
    id: 2,
    requester: mockProfiles[2],
    helper: mockProfiles[0],
    topic: 'Resume review for internship',
    relatedSkill: 'Resume Review',
    message: "Could you take a look at my resume? I'm applying for summer internships.",
    urgency: 'High',
    status: 'Accepted',
    createdAt: '2026-05-01',
  },
];

export const skillCategories = [
  'Technical',
  'Career',
  'Creative',
  'Experience',
  'Campus Life',
];

export const allSkills = [
  'Python',
  'React',
  'Figma',
  'GitHub',
  'SQL',
  'Data Analysis',
  'Resume Review',
  'Interview Prep',
  'LinkedIn Feedback',
  'Graphic Design',
  'Portfolio Review',
  'Public Speaking',
  'Startup Experience',
  'Research Experience',
  'RSO Leadership',
  'Project Collaboration',
  'Campus Advice',
  'Java',
  'C++',
  'JavaScript',
  'TypeScript',
  'Excel',
  'Consulting Prep',
  'Networking Advice',
];
