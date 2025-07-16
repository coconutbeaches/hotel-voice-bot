export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  messageType: 'text' | 'audio' | 'image' | 'document';
}

export interface HotelGuest {
  id: string;
  name: string;
  phoneNumber: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  preferences?: string[];
}

export interface ServiceRequest {
  id: string;
  guestId: string;
  type: 'room_service' | 'housekeeping' | 'maintenance' | 'concierge' | 'other';
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
}
