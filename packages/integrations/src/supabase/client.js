import { supabase } from './index.js';
export class SupabaseClient {
    async getGuest(phoneNumber) {
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
    async createServiceRequest(request) {
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
    async updateServiceRequest(id, updates) {
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
