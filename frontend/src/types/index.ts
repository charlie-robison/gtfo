// Types mirroring the Convex schema from architecture.md

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface UserPreferences {
  budget: { min: number; max: number };
  bedrooms: number;
  petFriendly: boolean;
  moveDate: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  oldAddress: Address;
  newAddress: Address;
  preferences: UserPreferences;
}

// Phase 1 — Apartment Search
export type ListingSource = "redfin" | "zillow" | "apartments.com";
export type ApplicationStatus = "found" | "applying" | "applied" | "failed";

export interface RedfinApplication {
  _id: string;
  _creationTime: number;
  name: string;
  address: string;
  city: string;
  description: string;
  imageUrl: string;
  monthlyRentPrice: number;
  numBedrooms: number;
  numBathrooms: number;
  squareFootage: number;
  moveInCost: number;
  url: string;
  applicationStatus: ApplicationStatus;
  applyJobId?: string;
}

export interface Listing {
  id: string;
  source: ListingSource;
  address: string;
  city: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  imageUrl: string;
  aiScore: number;
  applicationStatus: ApplicationStatus;
  features: string[];
  url: string;
}

// Phase 2 — Address Updates
export type ServiceCategory =
  | "banking"
  | "shopping"
  | "utilities"
  | "insurance"
  | "government"
  | "medical"
  | "investments"
  | "subscriptions"
  | "travel"
  | "food"
  | "other";

export type ServicePriority = "critical" | "high" | "medium" | "low";

export type UpdateStatus =
  | "detected"
  | "queued"
  | "in_progress"
  | "needs_review"
  | "completed"
  | "failed";

export interface AddressAccount {
  id: string;
  serviceName: string;
  category: ServiceCategory;
  priority: ServicePriority;
  status: UpdateStatus;
  emailsFound: number;
  lastEmailDate: string;
  domain: string;
  notes?: string;
}

// Phase 3 — Movers
export interface MoverQuote {
  id: string;
  company: string;
  price: number;
  rating: number;
  reviewCount: number;
  truckSize: string;
  workers: number;
  insurance: boolean;
  estimatedHours: number;
  availableDate: string;
  isBestValue: boolean;
  logoUrl?: string;
}

// Live Agents
export type AgentStatus =
  | "initializing"
  | "running"
  | "waiting_approval"
  | "completed"
  | "failed";

export interface AgentLogEntry {
  timestamp: string;
  message: string;
  type: "info" | "action" | "success" | "error" | "waiting";
}

export interface AgentSession {
  id: string;
  targetSite: string;
  status: AgentStatus;
  currentStep: string;
  startedAt: string;
  elapsedSeconds: number;
  logs: AgentLogEntry[];
  screenshotUrl?: string;
}

// Pipeline State
export interface PhaseProgress {
  phase: 1 | 2 | 3;
  name: string;
  progress: number;
  status: "completed" | "active" | "pending";
}

export interface PipelineState {
  phases: PhaseProgress[];
  totalServicesDetected: number;
  totalEmailsScanned: number;
  apartmentsFound: number;
  moverQuotes: number;
  activeAgents: number;
}

// Activity Feed
export interface ActivityEvent {
  id: string;
  message: string;
  timestamp: string;
  type: "success" | "info" | "warning" | "error";
  icon?: string;
}
