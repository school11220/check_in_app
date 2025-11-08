export interface TicketFormData {
  name: string;
  email?: string;
  phone?: string;
  eventId: string;
}

export interface TicketData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  eventId: string;
  status: string;
  token: string | null;
  checkedIn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CheckInRequest {
  ticketId: string;
  token: string;
}

export interface CheckInResponse {
  success: boolean;
  message: string;
  ticket?: {
    id: string;
    name: string;
    email: string | null;
    eventId: string;
    checkedIn: boolean;
  };
}
