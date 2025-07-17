import { SupabaseClient } from '@hotel-voice-bot/integrations/supabase';
import { logger } from '../../utils/logger.js';

export interface MessageLog {
  id?: string;
  guest_user_id?: string;
  user_profile_id?: string;
  stay_id?: string;
  whatsapp_number: string;
  message_type: 'guest_audio' | 'guest_text' | 'bot_text' | 'bot_audio' | 'human_override';
  content: string;
  language_detected?: string;
  escalated_to_human?: boolean;
  session_id?: string;
  conversation_session_id?: string;
  cost_estimate_usd?: number;
  metadata?: Record<string, any>;
}

export interface ConversationSession {
  id?: string;
  guest_user_id?: string;
  whatsapp_number: string;
  stay_id?: string;
  status: 'active' | 'ended' | 'escalated';
  message_count?: number;
  escalation_count?: number;
  hotel_info?: Record<string, any>;
  guest_context?: Record<string, any>;
}

export class MessageLogger {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = new SupabaseClient();
  }

  async logMessage(messageData: MessageLog): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('bot_messages')
        .insert([{
          guest_user_id: messageData.guest_user_id,
          user_profile_id: messageData.user_profile_id,
          stay_id: messageData.stay_id,
          whatsapp_number: messageData.whatsapp_number,
          message_type: messageData.message_type,
          content: messageData.content,
          language_detected: messageData.language_detected,
          escalated_to_human: messageData.escalated_to_human || false,
          session_id: messageData.session_id,
          conversation_session_id: messageData.conversation_session_id,
          cost_estimate_usd: messageData.cost_estimate_usd,
          metadata: messageData.metadata || {}
        }])
        .select('id')
        .single();

      if (error) {
        logger.error('Error logging message:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      logger.error('Error in logMessage:', error);
      return null;
    }
  }

  async getOrCreateSession(whatsappNumber: string, guestUserId?: string): Promise<string | null> {
    try {
      // First, try to find active session
      const { data: existingSession, error: selectError } = await this.supabase.client
        .from('conversation_sessions')
        .select('id')
        .eq('whatsapp_number', whatsappNumber)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        logger.error('Error selecting session:', selectError);
        return null;
      }

      if (existingSession) {
        return existingSession.id;
      }

      // Create new session
      const { data: newSession, error: insertError } = await this.supabase.client
        .from('conversation_sessions')
        .insert([{
          guest_user_id: guestUserId,
          whatsapp_number: whatsappNumber,
          status: 'active',
          message_count: 0,
          escalation_count: 0,
          hotel_info: {},
          guest_context: {}
        }])
        .select('id')
        .single();

      if (insertError) {
        logger.error('Error creating new session:', insertError);
        return null;
      }

      return newSession?.id || null;
    } catch (error) {
      logger.error('Error in getOrCreateSession:', error);
      return null;
    }
  }

  async updateSessionMessageCount(sessionId: string): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .rpc('increment_message_count', { session_id: sessionId });

      if (error) {
        logger.error('Error updating session message count:', error);
      }
    } catch (error) {
      logger.error('Error in updateSessionMessageCount:', error);
    }
  }

  async endSession(sessionId: string): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('conversation_sessions')
        .update({ 
          status: 'ended',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) {
        logger.error('Error ending session:', error);
      }
    } catch (error) {
      logger.error('Error in endSession:', error);
    }
  }

  async escalateSession(sessionId: string, _reason: string): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('conversation_sessions')
        .update({ 
          status: 'escalated',
          escalation_count: this.supabase.client.raw('escalation_count + 1'),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) {
        logger.error('Error escalating session:', error);
      }
    } catch (error) {
      logger.error('Error in escalateSession:', error);
    }
  }

  async getRecentMessages(sessionId: string, limit: number = 10): Promise<MessageLog[]> {
    try {
      const { data: messages, error } = await this.supabase.client
        .from('bot_messages')
        .select('*')
        .eq('conversation_session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Error fetching recent messages:', error);
        return [];
      }

      return messages || [];
    } catch (error) {
      logger.error('Error in getRecentMessages:', error);
      return [];
    }
  }
}
