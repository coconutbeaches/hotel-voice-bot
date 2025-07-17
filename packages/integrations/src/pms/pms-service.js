import axios from 'axios';
import { CircuitBreakerManager } from '../core/circuit-breaker.js';
export class PMSService {
    client;
    circuitBreakerManager;
    cacheManager;
    config;
    constructor(config, cacheManager) {
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
    setupInterceptors() {
        this.client.interceptors.request.use((config) => {
            console.log(`PMS API Request: ${config.method?.toUpperCase()} ${config.url}`);
            return config;
        }, (error) => Promise.reject(error));
        this.client.interceptors.response.use((response) => {
            console.log(`PMS API Response: ${response.status} ${response.config.url}`);
            return response;
        }, (error) => {
            const integrationError = {
                code: error.response?.status || 'UNKNOWN',
                message: error.response?.data?.message || error.message,
                details: error.response?.data,
                retryable: this.isRetryable(error),
                timestamp: new Date().toISOString(),
            };
            return Promise.reject(integrationError);
        });
    }
    isRetryable(error) {
        const retryableCodes = [408, 429, 500, 502, 503, 504];
        return retryableCodes.includes(error.response?.status);
    }
    async getAvailability(roomType, startDate, endDate, useCache = true) {
        const cacheKey = `availability:${roomType}:${startDate}:${endDate}`;
        if (useCache) {
            const cachedData = this.cacheManager.get(cacheKey);
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
                return this.client.get('/availability', {
                    params: {
                        roomType,
                        startDate,
                        endDate,
                    },
                });
            });
            const availabilityData = response.data;
            if (useCache) {
                this.cacheManager.set(cacheKey, availabilityData, 300);
            }
            return {
                success: true,
                data: availabilityData,
                cached: false,
                responseTime: Date.now() - startTime,
                circuitBreakerState: circuitBreaker.getState(),
            };
        }
        catch (error) {
            return {
                success: false,
                error: error,
                responseTime: Date.now() - startTime,
                circuitBreakerState: circuitBreaker.getState(),
            };
        }
    }
    async createReservation(guestData, reservationData) {
        const circuitBreaker = this.circuitBreakerManager.getOrCreate('pms-booking');
        const startTime = Date.now();
        try {
            const response = await circuitBreaker.call(async () => {
                return this.client.post('/reservations', {
                    guest: guestData,
                    reservation: reservationData,
                });
            });
            const reservation = response.data;
            this.invalidateAvailabilityCache(reservation.roomId, reservation.checkInDate, reservation.checkOutDate);
            return {
                success: true,
                data: reservation,
                responseTime: Date.now() - startTime,
                circuitBreakerState: circuitBreaker.getState(),
            };
        }
        catch (error) {
            return {
                success: false,
                error: error,
                responseTime: Date.now() - startTime,
                circuitBreakerState: circuitBreaker.getState(),
            };
        }
    }
    async getReservation(reservationId) {
        const cacheKey = `reservation:${reservationId}`;
        const cachedData = this.cacheManager.get(cacheKey);
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
                return this.client.get(`/reservations/${reservationId}`);
            });
            const reservation = response.data;
            this.cacheManager.set(cacheKey, reservation, 600);
            return {
                success: true,
                data: reservation,
                cached: false,
                responseTime: Date.now() - startTime,
                circuitBreakerState: circuitBreaker.getState(),
            };
        }
        catch (error) {
            return {
                success: false,
                error: error,
                responseTime: Date.now() - startTime,
                circuitBreakerState: circuitBreaker.getState(),
            };
        }
    }
    async updateReservation(reservationId, updates) {
        const circuitBreaker = this.circuitBreakerManager.getOrCreate('pms-booking');
        const startTime = Date.now();
        try {
            const response = await circuitBreaker.call(async () => {
                return this.client.patch(`/reservations/${reservationId}`, updates);
            });
            const reservation = response.data;
            const cacheKey = `reservation:${reservationId}`;
            this.cacheManager.set(cacheKey, reservation, 600);
            return {
                success: true,
                data: reservation,
                responseTime: Date.now() - startTime,
                circuitBreakerState: circuitBreaker.getState(),
            };
        }
        catch (error) {
            return {
                success: false,
                error: error,
                responseTime: Date.now() - startTime,
                circuitBreakerState: circuitBreaker.getState(),
            };
        }
    }
    async getGuestFolio(guestId) {
        const cacheKey = `folio:${guestId}`;
        const cachedData = this.cacheManager.get(cacheKey);
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
                return this.client.get(`/guests/${guestId}/folio`);
            });
            const folio = response.data;
            this.cacheManager.set(cacheKey, folio, 60);
            return {
                success: true,
                data: folio,
                cached: false,
                responseTime: Date.now() - startTime,
                circuitBreakerState: circuitBreaker.getState(),
            };
        }
        catch (error) {
            return {
                success: false,
                error: error,
                responseTime: Date.now() - startTime,
                circuitBreakerState: circuitBreaker.getState(),
            };
        }
    }
    async addChargeToFolio(guestId, charge) {
        const circuitBreaker = this.circuitBreakerManager.getOrCreate('pms-folio');
        const startTime = Date.now();
        try {
            const response = await circuitBreaker.call(async () => {
                return this.client.post(`/guests/${guestId}/folio/charges`, charge);
            });
            const folio = response.data;
            const cacheKey = `folio:${guestId}`;
            this.cacheManager.set(cacheKey, folio, 60);
            return {
                success: true,
                data: folio,
                responseTime: Date.now() - startTime,
                circuitBreakerState: circuitBreaker.getState(),
            };
        }
        catch (error) {
            return {
                success: false,
                error: error,
                responseTime: Date.now() - startTime,
                circuitBreakerState: circuitBreaker.getState(),
            };
        }
    }
    async getGuest(guestId) {
        const cacheKey = `guest:${guestId}`;
        const cachedData = this.cacheManager.get(cacheKey);
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
                return this.client.get(`/guests/${guestId}`);
            });
            const guest = response.data;
            this.cacheManager.set(cacheKey, guest, 1800);
            return {
                success: true,
                data: guest,
                cached: false,
                responseTime: Date.now() - startTime,
                circuitBreakerState: circuitBreaker.getState(),
            };
        }
        catch (error) {
            return {
                success: false,
                error: error,
                responseTime: Date.now() - startTime,
                circuitBreakerState: circuitBreaker.getState(),
            };
        }
    }
    async findGuestByPhone(phoneNumber) {
        const cacheKey = `guest:phone:${phoneNumber}`;
        const cachedData = this.cacheManager.get(cacheKey);
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
                return this.client.get('/guests/search', {
                    params: { phone: phoneNumber },
                });
            });
            const guests = response.data;
            this.cacheManager.set(cacheKey, guests, 900);
            return {
                success: true,
                data: guests,
                cached: false,
                responseTime: Date.now() - startTime,
                circuitBreakerState: circuitBreaker.getState(),
            };
        }
        catch (error) {
            return {
                success: false,
                error: error,
                responseTime: Date.now() - startTime,
                circuitBreakerState: circuitBreaker.getState(),
            };
        }
    }
    invalidateAvailabilityCache(roomId, startDate, endDate) {
    }
    async healthCheck() {
        const circuitBreaker = this.circuitBreakerManager.getOrCreate('pms-health');
        const startTime = Date.now();
        try {
            const response = await circuitBreaker.call(async () => {
                return this.client.get('/health');
            });
            return {
                success: true,
                data: response.data,
                responseTime: Date.now() - startTime,
                circuitBreakerState: circuitBreaker.getState(),
            };
        }
        catch (error) {
            return {
                success: false,
                error: error,
                responseTime: Date.now() - startTime,
                circuitBreakerState: circuitBreaker.getState(),
            };
        }
    }
    getServiceStatus() {
        return {
            circuitBreakers: this.circuitBreakerManager.getStatus(),
            cache: this.cacheManager.getStats(),
        };
    }
}
