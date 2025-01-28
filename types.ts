// types.ts

export interface NormalizedEvent {
  id: string; // external_event_id
  provider: "google" | "microsoft";
  name: string;
  date: string; // ISO string
  attendees: string[];
  location: string;
  link: string;
  message: string;
  status: string;
}

export interface Meeting {
  id: string;
  user_id: string;
  linked_account_id: string;
  external_event_id: string;
  provider: "google" | "microsoft";
  name: string;
  date: string; // ISO string
  attendees: string; // JSON string
  location: string;
  link: string;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
}
