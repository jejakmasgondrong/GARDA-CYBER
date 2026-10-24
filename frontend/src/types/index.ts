export type AssetType = "domain" | "ip" | "application" | "device" | "other";
export type AssetStatus = "active" | "inactive" | "pending_review";

export interface Asset {
  id: string;
  name: string;
  asset_type: AssetType;
  identifier: string;
  owner: string | null;
  scope_notes: string | null;
  status: AssetStatus;
  created_at: string;
  updated_at: string;
}

export interface IntegrationStatus {
  tool_id: string;
  display_name: string;
  configured: boolean;
  implemented: boolean;
  required_env_vars: string[];
  official_repo: string;
  capability_summary: string;
}

export interface HealthResponse {
  status: string;
  app_name: string;
  app_env: string;
}

export type IpClassification =
  | "public" | "private" | "loopback" | "link_local"
  | "multicast" | "reserved" | "unspecified";

export type ProviderResultStatus =
  | "ok" | "not_configured" | "timeout" | "rate_limited" | "provider_error";

export interface IpLookupResult {
  id: string;
  ip_address: string;
  classification: IpClassification;
  eligible_for_external_lookup: boolean;
  provider_id: string | null;
  provider_status: ProviderResultStatus;
  result_summary: string | null;
  created_at: string;
}

export interface IpLookupListResponse {
  items: IpLookupResult[];
  total: number;
  skip: number;
  limit: number;
}

export type FindingCategory = "ip_reputation" | "osint" | "secret_exposure" | "other";
export type FindingStatus = "open" | "triaged" | "remediated" | "false_positive";

export interface Finding {
  id: string;
  case_id: string | null;
  category: FindingCategory;
  title: string;
  description: string | null;
  source: string;
  source_url: string | null;
  confidence: "low" | "medium" | "high";
  status: FindingStatus;
  dedupe_key: string;
  collected_at: string;
  created_at: string;
  updated_at: string;
}

export interface FindingListResponse {
  items: Finding[];
  total: number;
  skip: number;
  limit: number;
}

export type IncidentStatus = "open" | "in_progress" | "contained" | "closed";

export interface Incident {
  id: string;
  title: string;
  summary: string | null;
  status: IncidentStatus;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentListResponse {
  items: Incident[];
  total: number;
  skip: number;
  limit: number;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  target: string | null;
  outcome: string;
  detail: string | null;
  created_at: string;
}

export type OsintLookupStatus = "ok" | "partial" | "blocked" | "dns_error" | "invalid_input";

export interface OsintLookupResult {
  id: string;
  domain: string;
  status: OsintLookupStatus;
  dns_records_json: string | null;
  tls_info_json: string | null;
  error_message: string | null;
  created_at: string;
}

export interface OsintLookupListResponse {
  items: OsintLookupResult[];
  total: number;
  skip: number;
  limit: number;
}

export type GithubScanStatus = "not_configured" | "rejected_scope" | "error" | "completed";

export interface GithubScanResult {
  id: string;
  repo: string;
  status: GithubScanStatus;
  files_scanned: number;
  findings_created: number;
  error_message: string | null;
  created_at: string;
}

export interface GithubExposureStatus {
  status: "ready" | "not_configured";
  allowed_repos: string[];
}


export type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface JobResult {
  id: string;
  tool_id: string;
  scenario: string | null;
  asset_id: string;
  status: JobStatus;
  output_summary: string | null;
  failure_reason: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface JobListResponse {
  items: JobResult[];
  total: number;
  skip: number;
  limit: number;
}

export interface IntegrationStatusV2 extends IntegrationStatus {
  implemented?: boolean;
  installed?: boolean;
  executable?: boolean;
}
