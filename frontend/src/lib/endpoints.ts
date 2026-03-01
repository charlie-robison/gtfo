const BASE_URL =
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL ??
  "https://amiable-viper-68.convex.site";

// ── Helpers ──────────────────────────────────────────────────────

async function post<T>(path: string, body?: object): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

// ── Request / Response types ─────────────────────────────────────

export interface SearchRentalsRequest {
  budget: number;
  city: string;
  state: string;
  zipcode?: string;
  full_name: string;
  phone: string;
  move_in_date: string;
  min_bedrooms?: number;
  min_bathrooms?: number;
  initial_address?: string;
}

export interface MovingPipelineRequest {
  destination_address: string;
  date: string;
  pickup_time?: string;
}

export interface UpdateAmazonAddressRequest {
  full_name: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  phone?: string;
}

export interface AddressUpdateRequest {
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
}

export interface CancelLeaseRequest {
  landlord_email: string;
  tenant_name: string;
  current_address: string;
  lease_end_date: string;
  move_out_date: string;
  reason?: string;
}

export interface DetermineAddressesRequest {
  old_street?: string;
  old_city?: string;
  old_state?: string;
  old_zip_code?: string;
}

export interface UploadScreenshotRequest {
  jobId: string;
  screenshotBase64: string;
  jobType?: string;
  stepNumber?: number;
  pageUrl?: string;
  pageTitle?: string;
}

export interface JobResponse {
  job_id: string;
}

export interface Job {
  _id: string;
  type: string;
  status: string;
  params: Record<string, unknown>;
  result?: unknown;
  errorMessage?: string;
}

export interface Step {
  _id: string;
  stepNum: number;
  stepName: string;
  currentCost: number;
}

export interface SearchConstraint {
  _id: string;
  budget: number;
  city: string;
  state: string;
  fullName: string;
  phone: string;
  moveInDate: string;
  minBedrooms: number;
  minBathrooms: number;
  maxResults: number;
  initialAddress: string;
}

export interface HouseInformation {
  _id: string;
  description: string;
  estimatedBedrooms: number;
  estimatedSquareFootage: number;
  stuffVolumeEstimate: string;
  recommendedTruckSize: string;
  reasoning: string;
  recommendedWorkers: number;
  laborReasoning: string;
}

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
  applicationStatus: string;
  applyJobId?: string;
}

export interface UhaulInformation {
  _id: string;
  vehicle: string;
  pickupLocation: string;
  pickupTime: string;
  dropOffLocation: string;
  movingHelpProvider: string;
  numWorkers: number;
  numHours: number;
  totalCost: number;
}

export interface RecommendedFurniture {
  _id: string;
  itemName: string;
  room: string;
  amazonSearchQuery: string;
  priority: string;
}

export interface AmazonOrderSummary {
  _id: string;
  summary: string;
}

export interface DetectedService {
  _id: string;
  serviceName: string;
  category: string;
  priority: string;
  detectedFrom: string[];
  emailCount: number;
  settingsUrl?: string;
  needsAddressUpdate: boolean;
  sampleSender: string;
}

export interface Screenshot {
  _id: string;
  jobId: string;
  jobType: string;
  stepNumber: number;
  pageUrl: string;
  pageTitle: string;
  storageId: string;
  url: string | null;
}

export interface MovingPipelineResponse {
  analysis: Record<string, unknown>;
  furniture: Record<string, unknown>[];
  uhaulJobId: string;
}

// ── POST endpoints ───────────────────────────────────────────────

export function searchRentals(data: SearchRentalsRequest) {
  return post<JobResponse>("/search-rentals", data);
}

export function movingPipeline(data: MovingPipelineRequest) {
  return post<MovingPipelineResponse>("/moving-pipeline", data);
}

export function updateAmazonAddress(data: UpdateAmazonAddressRequest) {
  return post<JobResponse>("/update-amazon-address", data);
}

export function orderFurniture() {
  return post<JobResponse>("/order-furniture");
}

export function updateCashappAddress(data: AddressUpdateRequest) {
  return post<JobResponse>("/update-cashapp-address", data);
}

export function updateSouthwestAddress(data: AddressUpdateRequest) {
  return post<JobResponse>("/update-southwest-address", data);
}

export function updateDoordashAddress(data: AddressUpdateRequest) {
  return post<JobResponse>("/update-doordash-address", data);
}

export function applyToListings(data: { full_name: string; phone: string; move_in_date: string }) {
  return post<JobResponse>("/apply-to-listings", data);
}

export function cancelCurrentLease(data: CancelLeaseRequest) {
  return post<JobResponse>("/cancel-current-lease", data);
}

export function determineAddresses(data: DetermineAddressesRequest) {
  return post<JobResponse>("/determine-addresses", data);
}

export function cancelJob(jobId: string) {
  return post<{ ok: boolean }>("/cancel-job", { job_id: jobId });
}

export function setupUtilities() {
  return post<null>("/setup-utilities");
}

export function uploadScreenshot(data: UploadScreenshotRequest) {
  return post<{ ok: boolean; storageId: string }>("/screenshots/upload", data);
}

// ── GET endpoints ────────────────────────────────────────────────

export function getJobs() {
  return get<Job[]>("/jobs");
}

export function getJob(jobId: string) {
  return get<Job>("/jobs", { job_id: jobId });
}

export function getSteps() {
  return get<Step[]>("/steps");
}

export function getSearchConstraints() {
  return get<SearchConstraint[]>("/search-constraints");
}

export function getHouseInformation() {
  return get<HouseInformation[]>("/house-information");
}

export function getDetectedServices() {
  return get<DetectedService[]>("/detected-services");
}

export function getRedfinApplications() {
  return get<RedfinApplication[]>("/redfin-applications");
}

export function getUhaulInformation() {
  return get<UhaulInformation[]>("/uhaul-information");
}

export function getRecommendedFurniture() {
  return get<RecommendedFurniture[]>("/recommended-furniture");
}

export function getAmazonOrderSummary() {
  return get<AmazonOrderSummary[]>("/amazon-order-summary");
}

export function getScreenshotsByJobType(jobType: string) {
  return get<Screenshot[]>("/screenshots", { job_type: jobType });
}

export function getScreenshotsByJobId(jobId: string) {
  return get<Screenshot[]>("/screenshots", { job_id: jobId });
}
