import { PMSGuest, PMSReservation, PMSAvailability, GuestFolio, IntegrationResponse, CircuitBreakerConfig } from '@hotel-voice-bot/shared';

import { CacheManager } from '../core/cache-manager.js';
export interface PMSConfig {
    baseUrl: string;
    apiKey: string;
    timeout: number;
    retryAttempts: number;
    circuitBreaker: CircuitBreakerConfig;
}
export declare class PMSService {
    private client;
    private circuitBreakerManager;
    private cacheManager;
    private config;
    constructor(config: PMSConfig, cacheManager: CacheManager);
    private setupInterceptors;
    private isRetryable;
    getAvailability(roomType: string, startDate: string, endDate: string, useCache?: boolean): Promise<IntegrationResponse<PMSAvailability[]>>;
    createReservation(guestData: Partial<PMSGuest>, reservationData: Omit<PMSReservation, 'id' | 'confirmationNumber'>): Promise<IntegrationResponse<PMSReservation>>;
    getReservation(reservationId: string): Promise<IntegrationResponse<PMSReservation>>;
    updateReservation(reservationId: string, updates: Partial<PMSReservation>): Promise<IntegrationResponse<PMSReservation>>;
    getGuestFolio(guestId: string): Promise<IntegrationResponse<GuestFolio>>;
    addChargeToFolio(guestId: string, charge: {
        description: string;
        amount: number;
        category: string;
        reference?: string;
    }): Promise<IntegrationResponse<GuestFolio>>;
    getGuest(guestId: string): Promise<IntegrationResponse<PMSGuest>>;
    findGuestByPhone(phoneNumber: string): Promise<IntegrationResponse<PMSGuest[]>>;
    private invalidateAvailabilityCache;
    healthCheck(): Promise<IntegrationResponse<{
        status: string;
        timestamp: string;
    }>>;
    getServiceStatus(): {
        circuitBreakers: Record<string, any>;
        cache: {
            itemCount: any;
            hits: any;
            misses: any;
            maxSize: any;
        };
    };
}
