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

// WhatsApp Business Cloud API Types
export interface WhatsAppWebhookEntry {
  id: string;
  changes: WhatsAppWebhookChange[];
}

export interface WhatsAppWebhookChange {
  value: {
    messaging_product: 'whatsapp';
    metadata: {
      display_phone_number: string;
      phone_number_id: string;
    };
    contacts?: WhatsAppContact[];
    messages?: WhatsAppIncomingMessage[];
    statuses?: WhatsAppMessageStatus[];
  };
  field: 'messages';
}

export interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface WhatsAppIncomingMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'text' | 'audio' | 'image' | 'document' | 'interactive' | 'button';
  text?: {
    body: string;
  };
  audio?: {
    id: string;
    mime_type: string;
    sha256: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  document?: {
    id: string;
    mime_type: string;
    sha256: string;
    filename: string;
  };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description: string;
    };
  };
  button?: {
    text: string;
    payload: string;
  };
}

export interface WhatsAppMessageStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: {
    code: number;
    title: string;
    message: string;
  }[];
}

export interface WhatsAppOutgoingMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text' | 'template' | 'interactive';
  text?: {
    body: string;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: {
      type: 'body' | 'header' | 'button';
      parameters?: {
        type: 'text' | 'image' | 'document';
        text?: string;
        image?: {
          id: string;
        };
        document?: {
          id: string;
          filename: string;
        };
      }[];
    }[];
  };
  interactive?: {
    type: 'button' | 'list';
    body: {
      text: string;
    };
    action: {
      buttons?: {
        type: 'reply';
        reply: {
          id: string;
          title: string;
        };
      }[];
      sections?: {
        title: string;
        rows: {
          id: string;
          title: string;
          description: string;
        }[];
      }[];
    };
  };
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  status: 'approved' | 'pending' | 'rejected';
  category: 'marketing' | 'utility' | 'authentication';
  components: {
    type: 'body' | 'header' | 'footer' | 'buttons';
    text?: string;
    example?: {
      body_text?: string[][];
      header_text?: string[];
    };
  }[];
}

export interface MessageQueueJob {
  id: string;
  phoneNumber: string;
  message: WhatsAppOutgoingMessage;
  priority: 'low' | 'normal' | 'high';
  maxRetries: number;
  attempt: number;
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface RateLimitInfo {
  phoneNumber: string;
  messageCount: number;
  windowStart: string;
  windowEnd: string;
}

// NLP & Conversation Engine Types
export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface Conversation {
  id: string;
  phoneNumber: string;
  guestId?: string;
  status: 'active' | 'ended' | 'escalated';
  context: ConversationContext;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
}

export interface ConversationContext {
  hotelInfo: HotelInfo;
  guestInfo?: HotelGuest;
  currentIntent?: string;
  extractedEntities?: Record<string, any>;
  isEscalated: boolean;
  escalationReason?: string;
}

export interface HotelInfo {
  id: string;
  name: string;
  location: string;
  amenities: string[];
  policies: HotelPolicy[];
  contactInfo: {
    phone: string;
    email: string;
    address: string;
  };
  services: HotelService[];
}

export interface HotelPolicy {
  id: string;
  category: string;
  title: string;
  description: string;
  isActive: boolean;
}

export interface HotelService {
  id: string;
  name: string;
  description: string;
  category: 'room_service' | 'concierge' | 'spa' | 'restaurant' | 'other';
  isAvailable: boolean;
  hours?: string;
  contactInfo?: string;
}

export interface Intent {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  patterns: string[];
  category: 'faq' | 'service_request' | 'complaint' | 'booking' | 'general';
  handler: string;
  priority: number;
  isActive: boolean;
  examples: string[];
}

export interface IntentMatch {
  intent: Intent;
  confidence: number;
  extractedEntities: Record<string, any>;
}

export interface PromptTemplate {
  id: string;
  name: string;
  template: string;
  variables: string[];
  category: 'system' | 'user' | 'context';
  isActive: boolean;
  version: string;
}

export interface FunctionCall {
  name: string;
  arguments: Record<string, any>;
  description?: string;
}

export interface LLMResponse {
  content: string;
  intent?: string;
  confidence?: number;
  functionCalls?: FunctionCall[];
  shouldEscalate?: boolean;
  escalationReason?: string;
  metadata?: Record<string, any>;
}

export interface EscalationRule {
  id: string;
  name: string;
  description: string;
  conditions: EscalationCondition[];
  action: 'human_agent' | 'manager' | 'department';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isActive: boolean;
}

export interface EscalationCondition {
  type: 'keyword' | 'sentiment' | 'intent' | 'time' | 'attempt_count';
  operator: 'contains' | 'equals' | 'greater_than' | 'less_than';
  value: string | number;
}

// PMS Integration Types
export interface PMSGuest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  checkInDate: string;
  checkOutDate: string;
  roomNumber: string;
  guestType: 'individual' | 'group' | 'corporate';
  preferences: GuestPreference[];
  vipStatus: 'none' | 'silver' | 'gold' | 'platinum';
  loyaltyNumber?: string;
}

export interface GuestPreference {
  category: 'room' | 'dining' | 'service' | 'amenity';
  preference: string;
  value: string;
}

export interface PMSReservation {
  id: string;
  confirmationNumber: string;
  guestId: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  status: 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
  roomType: string;
  rateCode: string;
  totalAmount: number;
  currency: string;
  adults: number;
  children: number;
  specialRequests: string[];
  packageCode?: string;
}

export interface PMSRoom {
  id: string;
  number: string;
  type: string;
  floor: number;
  status: 'available' | 'occupied' | 'out_of_order' | 'maintenance';
  features: string[];
  amenities: string[];
  baseRate: number;
  currency: string;
  maxOccupancy: number;
}

export interface PMSAvailability {
  roomType: string;
  date: string;
  available: number;
  rate: number;
  currency: string;
  restrictions: AvailabilityRestriction[];
}

export interface AvailabilityRestriction {
  type: 'min_stay' | 'max_stay' | 'closed_arrival' | 'closed_departure';
  value: number | boolean;
}

export interface GuestFolio {
  id: string;
  guestId: string;
  reservationId: string;
  charges: FolioCharge[];
  payments: FolioPayment[];
  balance: number;
  currency: string;
  lastUpdated: string;
}

export interface FolioCharge {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: 'room' | 'food' | 'beverage' | 'service' | 'tax' | 'fee' | 'other';
  reference?: string;
}

export interface FolioPayment {
  id: string;
  date: string;
  amount: number;
  method: 'cash' | 'card' | 'transfer' | 'comp' | 'other';
  reference?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
}

// Room Service / Order API Types
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: 'appetizer' | 'main' | 'dessert' | 'beverage' | 'special';
  price: number;
  currency: string;
  isAvailable: boolean;
  preparationTime: number; // in minutes
  allergens: string[];
  dietary: string[]; // vegetarian, vegan, gluten-free, etc.
  image?: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  description: string;
  items: MenuItem[];
  isActive: boolean;
  availableFrom: string;
  availableTo: string;
}

export interface RoomServiceOrder {
  id: string;
  guestId: string;
  roomNumber: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  orderTime: string;
  requestedDeliveryTime?: string;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  specialInstructions?: string;
  contactPhone?: string;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  modifications: string[];
  specialRequests?: string;
}

// Payment Gateway Types
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
  guestId: string;
  reservationId?: string;
  orderId?: string;
  paymentMethodId?: string;
  description: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_transfer' | 'digital_wallet' | 'cash';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  guestId: string;
}

export interface UpsellItem {
  id: string;
  type: 'room_upgrade' | 'service' | 'amenity' | 'package';
  name: string;
  description: string;
  price: number;
  currency: string;
  isAvailable: boolean;
  validFrom: string;
  validTo: string;
  restrictions: string[];
  image?: string;
}

export interface UpsellOffer {
  id: string;
  guestId: string;
  items: UpsellItem[];
  totalDiscount: number;
  expiresAt: string;
  status: 'active' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
}

// Circuit Breaker Types
export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime?: number;
  nextAttemptTime?: number;
  successCount: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  halfOpenMaxCalls: number;
  timeout: number;
}

// Cache Types
export interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt: number;
  createdAt: number;
  hitCount: number;
  lastAccessedAt: number;
}

export interface CacheConfig {
  ttl: number; // time to live in seconds
  maxSize: number;
  enableMetrics: boolean;
}

// Integration Response Types
export interface IntegrationResponse<T> {
  success: boolean;
  data?: T;
  error?: IntegrationError;
  cached?: boolean;
  responseTime?: number;
  circuitBreakerState?: CircuitBreakerState;
}

export interface IntegrationError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  timestamp: string;
}
