export const API_ENDPOINTS = {
  WHATSAPP: '/api/whatsapp',
  VOICE: '/api/voice',
  GUESTS: '/api/guests',
  SERVICES: '/api/services',
  HEALTH: '/api/health',
} as const;

export const SERVICE_TYPES = {
  ROOM_SERVICE: 'room_service',
  HOUSEKEEPING: 'housekeeping',
  MAINTENANCE: 'maintenance',
  CONCIERGE: 'concierge',
  OTHER: 'other',
} as const;

export const MESSAGE_TYPES = {
  TEXT: 'text',
  AUDIO: 'audio',
  IMAGE: 'image',
  DOCUMENT: 'document',
} as const;
