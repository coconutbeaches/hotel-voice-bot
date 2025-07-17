import type { HotelGuest, ServiceRequest } from '@hotel-voice-bot/shared';
export declare class SupabaseClient {
    getGuest(phoneNumber: string): Promise<HotelGuest | null>;
    createServiceRequest(request: Omit<ServiceRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceRequest | null>;
    updateServiceRequest(id: string, updates: Partial<ServiceRequest>): Promise<ServiceRequest | null>;
}
