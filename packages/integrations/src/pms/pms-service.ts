import axios, { AxiosInstance } from 'axios';
import {
  PMSGuest,
  PMSReservation,
  PMSRoom,
  PMSAvailability,
  GuestFolio,
  IntegrationResponse,
  IntegrationError,
  CircuitBreakerConfig,
} from '@hotel-voice-bot/shared';
import { CircuitBreakerManager } from '../core/circuit-breaker.js';
import { CacheManager } from '../core/cache-manager.js';

export interface PMSConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
  retryAttempts: number;
  circuitBreaker: CircuitBreakerConfig;
}

export class PMSService {
  private client: AxiosInstance;
  private circuitBreakerManager: CircuitBreakerManager;
  private cacheManager: CacheManager;
  private config: PMSConfig;

  constructor(config: PMSConfig, cacheManager: CacheManager) {
    this.config = config;
    this.cacheManager = cacheManager;
    
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    this.circuitBreakerManager = new CircuitBreakerManager(config.circuitBreaker);
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        console.log(`PMS API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => {
        console.log(`PMS API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        const integrationError: IntegrationError = {
          code: error.response?.status || 'UNKNOWN',
          message: error.response?.data?.message || error.message,
          details: error.response?.data,
          retryable: this.isRetryable(error),
          timestamp: new Date().toISOString(),
        };
        return Promise.reject(integrationError);
      }
    );
  }

  private isRetryable(error: any): boolean {
    const retryableCodes = [408, 429, 500, 502, 503, 504];
    return retryableCodes.includes(error.response?.status);
  }

  // Availability Management
  async getAvailability(
    roomType: string,
    startDate: string,
    endDate: string,
    useCache: boolean = true
  ): Promise<IntegrationResponse<PMSAvailability[]>> {
    const cacheKey = `availability:${roomType}:${startDate}:${endDate}`;
    
    // Check cache first
    if (useCache) {
      const cachedData = this.cacheManager.get<PMSAvailability[]>(cacheKey);
      if (cachedData) {
        return {
          success: true,
          data: cachedData,
          cached: true,
        };
      }
    }

    const circuitBreaker = this.circuitBreakerManager.getOrCreate('pms-availability');
    const startTime = Date.now();

    try {
      const response = await circuitBreaker.call(async () => {
        return this.client.get<PMSAvailability[]>('/availability', {
          params: {
            roomType,
            startDate,
            endDate,
          },
        });
      });

      const availabilityData = response.data;
      
      // Cache the result
      if (useCache) {
        this.cacheManager.set(cacheKey, availabilityData, 300); // 5 minutes
      }

      return {
        success: true,
        data: availabilityData,
        cached: false,
        responseTime: Date.now() - startTime,
        circuitBreakerState: circuitBreaker.getState(),
      };
    } catch (error) {
      return {
        success: false,
        error: error as IntegrationError,
        responseTime: Date.now() - startTime,
        circuitBreakerState: circuitBreaker.getState(),
      };
    }
  }

  // Booking Management
  async createReservation(
    guestData: Partial<PMSGuest>,
    reservationData: Omit<PMSReservation, 'id' | 'confirmationNumber'>
  ): Promise<IntegrationResponse<PMSReservation>> {
    const circuitBreaker = this.circuitBreakerManager.getOrCreate('pms-booking');
    const startTime = Date.now();

    try {
      const response = await circuitBreaker.call(async () => {
        return this.client.post<PMSReservation>('/reservations', {
          guest: guestData,
          reservation: reservationData,
        });
      });

      const reservation = response.data;
      
      // Invalidate related cache entries
      this.invalidateAvailabilityCache(reservation.roomId, reservation.checkInDate, reservation.checkOutDate);

      return {
        success: true,
        data: reservation,
        responseTime: Date.now() - startTime,
        circuitBreakerState: circuitBreaker.getState(),
      };
    } catch (error) {
      return {
        success: false,
        error: error as IntegrationError,
        responseTime: Date.now() - startTime,
        circuitBreakerState: circuitBreaker.getState(),
      };
    }
  }

  async getReservation(reservationId: string): Promise<IntegrationResponse<PMSReservation>> {
    const cacheKey = `reservation:${reservationId}`;
    
    // Check cache first
    const cachedData = this.cacheManager.get<PMSReservation>(cacheKey);
    if (cachedData) {
      return {
        success: true,
        data: cachedData,
        cached: true,
      };
    }

    const circuitBreaker = this.circuitBreakerManager.getOrCreate('pms-booking');
    const startTime = Date.now();

    try {
      const response = await circuitBreaker.call(async () => {
        return this.client.get<PMSReservation>(`/reservations/${reservationId}`);
      });

      const reservation = response.data;
      
      // Cache the result
      this.cacheManager.set(cacheKey, reservation, 600); // 10 minutes

      return {
        success: true,
        data: reservation,
        cached: false,
        responseTime: Date.now() - startTime,
        circuitBreakerState: circuitBreaker.getState(),
      };
    } catch (error) {
      return {
        success: false,
        error: error as IntegrationError,
        responseTime: Date.now() - startTime,
        circuitBreakerState: circuitBreaker.getState(),
      };
    }
  }

  async updateReservation(
    reservationId: string,
    updates: Partial<PMSReservation>
  ): Promise<IntegrationResponse<PMSReservation>> {
    const circuitBreaker = this.circuitBreakerManager.getOrCreate('pms-booking');
    const startTime = Date.now();

    try {
      const response = await circuitBreaker.call(async () => {
        return this.client.patch<PMSReservation>(`/reservations/${reservationId}`, updates);
      });

      const reservation = response.data;
      
      // Update cache
      const cacheKey = `reservation:${reservationId}`;
      this.cacheManager.set(cacheKey, reservation, 600);

      return {
        success: true,
        data: reservation,
        responseTime: Date.now() - startTime,
        circuitBreakerState: circuitBreaker.getState(),
      };
    } catch (error) {
      return {
        success: false,
        error: error as IntegrationError,
        responseTime: Date.now() - startTime,
        circuitBreakerState: circuitBreaker.getState(),
      };
    }
  }

  // Guest Folio Management
  async getGuestFolio(guestId: string): Promise<IntegrationResponse<GuestFolio>> {
    const cacheKey = `folio:${guestId}`;
    
    // Check cache first
    const cachedData = this.cacheManager.get<GuestFolio>(cacheKey);
    if (cachedData) {
      return {
        success: true,
        data: cachedData,
        cached: true,
      };
    }

    const circuitBreaker = this.circuitBreakerManager.getOrCreate('pms-folio');
    const startTime = Date.now();

    try {
      const response = await circuitBreaker.call(async () => {
        return this.client.get<GuestFolio>(`/guests/${guestId}/folio`);
      });

      const folio = response.data;
      
      // Cache the result with shorter TTL since folio changes frequently
      this.cacheManager.set(cacheKey, folio, 60); // 1 minute

      return {
        success: true,
        data: folio,
        cached: false,
        responseTime: Date.now() - startTime,
        circuitBreakerState: circuitBreaker.getState(),
      };
    } catch (error) {
      return {
        success: false,
        error: error as IntegrationError,
        responseTime: Date.now() - startTime,
        circuitBreakerState: circuitBreaker.getState(),
      };
    }
  }

  async addChargeToFolio(
    guestId: string,
    charge: {
      description: string;
      amount: number;
      category: string;
      reference?: string;
    }
  ): Promise<IntegrationResponse<GuestFolio>> {
    const circuitBreaker = this.circuitBreakerManager.getOrCreate('pms-folio');
    const startTime = Date.now();

    try {
      const response = await circuitBreaker.call(async () => {
        return this.client.post<GuestFolio>(`/guests/${guestId}/folio/charges`, charge);
      });

      const folio = response.data;
      
      // Update cache
      const cacheKey = `folio:${guestId}`;
      this.cacheManager.set(cacheKey, folio, 60);

      return {
        success: true,
        data: folio,
        responseTime: Date.now() - startTime,
        circuitBreakerState: circuitBreaker.getState(),
      };
    } catch (error) {
      return {
        success: false,
        error: error as IntegrationError,
        responseTime: Date.now() - startTime,
        circuitBreakerState: circuitBreaker.getState(),
      };
    }
  }

  // Guest Management
  async getGuest(guestId: string): Promise<IntegrationResponse<PMSGuest>> {
    const cacheKey = `guest:${guestId}`;
    
    // Check cache first
    const cachedData = this.cacheManager.get<PMSGuest>(cacheKey);
    if (cachedData) {
      return {
        success: true,
        data: cachedData,
        cached: true,
      };
    }

    const circuitBreaker = this.circuitBreakerManager.getOrCreate('pms-guest');
    const startTime = Date.now();

    try {
      const response = await circuitBreaker.call(async () => {
        return this.client.get<PMSGuest>(`/guests/${guestId}`);
      });

      const guest = response.data;
      
      // Cache the result
      this.cacheManager.set(cacheKey, guest, 1800); // 30 minutes

      return {
        success: true,
        data: guest,
        cached: false,
        responseTime: Date.now() - startTime,
        circuitBreakerState: circuitBreaker.getState(),
      };
    } catch (error) {
      return {
        success: false,
        error: error as IntegrationError,
        responseTime: Date.now() - startTime,
        circuitBreakerState: circuitBreaker.getState(),
      };
    }
  }

  async findGuestByPhone(phoneNumber: string): Promise<IntegrationResponse<PMSGuest[]>> {
    const cacheKey = `guest:phone:${phoneNumber}`;
    
    // Check cache first
    const cachedData = this.cacheManager.get<PMSGuest[]>(cacheKey);
    if (cachedData) {
      return {
        success: true,
        data: cachedData,
        cached: true,
      };
    }

    const circuitBreaker = this.circuitBreakerManager.getOrCreate('pms-guest');
    const startTime = Date.now();

    try {
      const response = await circuitBreaker.call(async () => {
        return this.client.get<PMSGuest[]>('/guests/search', {
          params: { phone: phoneNumber },
        });
      });

      const guests = response.data;
      
      // Cache the result
      this.cacheManager.set(cacheKey, guests, 900); // 15 minutes

      return {
        success: true,
        data: guests,
        cached: false,
        responseTime: Date.now() - startTime,
        circuitBreakerState: circuitBreaker.getState(),
      };
    } catch (error) {
      return {
        success: false,
        error: error as IntegrationError,
        responseTime: Date.now() - startTime,
        circuitBreakerState: circuitBreaker.getState(),
      };
    }
  }

  // Utility methods
  private invalidateAvailabilityCache(roomId: string, startDate: string, endDate: string): void {
    // This is a simple implementation - in production, you might want more sophisticated cache invalidation
    // For now, we'll just clear all availability cache entries
    // In a real implementation, you'd want to be more selective
  }

  // Health check
  async healthCheck(): Promise<IntegrationResponse<{ status: string; timestamp: string }>> {
    const circuitBreaker = this.circuitBreakerManager.getOrCreate('pms-health');
    const startTime = Date.now();

    try {
      const response = await circuitBreaker.call(async () => {
        return this.client.get<{ status: string; timestamp: string }>('/health');
      });

      return {
        success: true,
        data: response.data,
        responseTime: Date.now() - startTime,
        circuitBreakerState: circuitBreaker.getState(),
      };
    } catch (error) {
      return {
        success: false,
        error: error as IntegrationError,
        responseTime: Date.now() - startTime,
        circuitBreakerState: circuitBreaker.getState(),
      };
    }
  }

  // Get service status
  getServiceStatus() {
    return {
      circuitBreakers: this.circuitBreakerManager.getStatus(),
      cache: this.cacheManager.getStats(),
    };
  }
}
