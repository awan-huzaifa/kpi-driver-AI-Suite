export type AccessRole = "super_admin" | "admin" | "user";
export type AgentType  = "fus" | "acq" | "tc" | "cc" | "dispo" | "dispo_fus" | "tca" | "none";

export interface Company {
  id:                 string;
  name:               string;
  ghl_sub_account_id: string | null;
  credits_balance:    number;
  created_at:         string;
}

export interface CompanyWithCount extends Company {
  user_count: number;
}

export interface UserRow {
  id:                 string;
  full_name:          string | null;
  email:              string | null;
  phone:              string | null;
  access_role:        AccessRole;
  agent_type:         AgentType;
  company_id:         string | null;
  is_active:          boolean;
  created_at:         string;
  app_underwriting:   boolean;
  app_sales_coach:    boolean;
  app_training_coach: boolean;
  companies?:         { name: string } | null;
}
