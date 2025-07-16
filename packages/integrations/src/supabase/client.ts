import type { HotelGuest, ServiceRequest } from '@hotel-voice-bot/shared';

import { supabase } from './index.js';

export class SupabaseClient {
  async getGuest(phoneNumber: string): Promise<HotelGuest | null> {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    if (error) {
      console.error('Error fetching guest:', error);
      return null;
    }

    return data;
  }

  async createServiceRequest(
    request: Omit<ServiceRequest, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ServiceRequest | null> {
    const { data, error } = await supabase
      .from('service_requests')
      .insert([request])
      .select()
      .single();

    if (error) {
      console.error('Error creating service request:', error);
      return null;
    }

    return data;
  }

  async updateServiceRequest(
    id: string,
    updates: Partial<ServiceRequest>
  ): Promise<ServiceRequest | null> {
    const { data, error } = await supabase
      .from('service_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating service request:', error);
      return null;
    }

    return data;
  }
}
