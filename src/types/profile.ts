import type { Timestamp } from "firebase/firestore";

export interface EncryptedCredentials {
  store_hash_encrypted: string;
  client_id_encrypted: string;
  access_token_encrypted: string;
  iv: string;
  authTag: string;
}

export interface Profile {
  uid: string;
  email: string;
  full_name: string;
  store_name: string;
  role: "admin" | "user";
  created_at: Timestamp;
  updated_at: Timestamp;

  bigcommerce_credentials: EncryptedCredentials | null;

  anthropic_api_key_encrypted: string | null;
  anthropic_iv: string | null;
  anthropic_auth_tag: string | null;

  claude_system_prompt: string | null;

  csv_preferences: {
    last_selected_fields: string[];
    last_field_order: string[];
    include_variants: boolean;
    include_unavailable: boolean;
    include_hidden: boolean;
    custom_domain: string;
  } | null;
}

export interface DecryptedCredentials {
  store_hash: string;
  client_id: string;
  access_token: string;
}

export interface SiteSettings {
  default_claude_model: string;
  updated_at: Timestamp;
  updated_by: string;
}
