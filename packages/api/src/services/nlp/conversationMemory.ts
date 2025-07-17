import { ConversationMessage, Conversation } from '@hotel-voice-bot/shared';
// TODO: Re-enable Supabase integration
// import { supabase } from '@hotel-voice-bot/integrations';
const supabase = null as any;
import { logger } from '../../utils/logger.js';

export class ConversationMemory {
  private readonly maxHistorySize = 50; // Maximum messages to store per conversation

  public async getHistory(
    conversationId: string,
    limit: number = 10
  ): Promise<ConversationMessage[]> {
    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Error fetching conversation history', { 
          conversationId, 
          error: error.message 
        });
        return [];
      }

      // Reverse to get chronological order
      return (data || []).reverse();
    } catch (error) {
      logger.error('Error getting conversation history', { 
        conversationId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  public async saveMessage(message: ConversationMessage): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversation_messages')
        .insert([{
          id: message.id,
          conversation_id: message.conversationId,
          role: message.role,
          content: message.content,
          timestamp: message.timestamp,
          metadata: message.metadata
        }]);

      if (error) {
        logger.error('Error saving message', { 
          messageId: message.id, 
          error: error.message 
        });
        throw error;
      }

      // Clean up old messages if conversation is getting too long
      await this.cleanupOldMessages(message.conversationId);

      logger.info('Message saved successfully', { 
        messageId: message.id, 
        conversationId: message.conversationId 
      });
    } catch (error) {
      logger.error('Error saving message', { 
        messageId: message.id, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  public async createConversation(conversation: Conversation): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversations')
        .insert([{
          id: conversation.id,
          phone_number: conversation.phoneNumber,
          guest_id: conversation.guestId,
          status: conversation.status,
          context: conversation.context,
          created_at: conversation.createdAt,
          updated_at: conversation.updatedAt,
          last_message_at: conversation.lastMessageAt
        }]);

      if (error) {
        logger.error('Error creating conversation', { 
          conversationId: conversation.id, 
          error: error.message 
        });
        throw error;
      }

      logger.info('Conversation created successfully', { 
        conversationId: conversation.id 
      });
    } catch (error) {
      logger.error('Error creating conversation', { 
        conversationId: conversation.id, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  public async updateConversation(conversation: Conversation): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({
          status: conversation.status,
          context: conversation.context,
          updated_at: conversation.updatedAt,
          last_message_at: conversation.lastMessageAt
        })
        .eq('id', conversation.id);

      if (error) {
        logger.error('Error updating conversation', { 
          conversationId: conversation.id, 
          error: error.message 
        });
        throw error;
      }

      logger.info('Conversation updated successfully', { 
        conversationId: conversation.id 
      });
    } catch (error) {
      logger.error('Error updating conversation', { 
        conversationId: conversation.id, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  public async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        logger.error('Error fetching conversation', { 
          conversationId, 
          error: error.message 
        });
        return null;
      }

      return {
        id: data.id,
        phoneNumber: data.phone_number,
        guestId: data.guest_id,
        status: data.status,
        context: data.context,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        lastMessageAt: data.last_message_at
      };
    } catch (error) {
      logger.error('Error getting conversation', { 
        conversationId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return null;
    }
  }

  public async getActiveConversationByPhone(phoneNumber: string): Promise<Conversation | null> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('phone_number', phoneNumber)
        .eq('status', 'active')
        .order('last_message_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        logger.error('Error fetching active conversation', { 
          phoneNumber, 
          error: error.message 
        });
        return null;
      }

      return {
        id: data.id,
        phoneNumber: data.phone_number,
        guestId: data.guest_id,
        status: data.status,
        context: data.context,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        lastMessageAt: data.last_message_at
      };
    } catch (error) {
      logger.error('Error getting active conversation', { 
        phoneNumber, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return null;
    }
  }

  private async cleanupOldMessages(conversationId: string): Promise<void> {
    try {
      // Count messages in conversation
      const { count, error: countError } = await supabase
        .from('conversation_messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId);

      if (countError) {
        logger.error('Error counting messages', { 
          conversationId, 
          error: countError.message 
        });
        return;
      }

      if (!count || count <= this.maxHistorySize) {
        return; // No cleanup needed
      }

      // Delete oldest messages beyond the limit
      const { data: oldMessages, error: fetchError } = await supabase
        .from('conversation_messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true })
        .limit(count - this.maxHistorySize);

      if (fetchError) {
        logger.error('Error fetching old messages', { 
          conversationId, 
          error: fetchError.message 
        });
        return;
      }

      if (oldMessages && oldMessages.length > 0) {
        const messageIds = oldMessages.map(msg => msg.id);
        const { error: deleteError } = await supabase
          .from('conversation_messages')
          .delete()
          .in('id', messageIds);

        if (deleteError) {
          logger.error('Error deleting old messages', { 
            conversationId, 
            error: deleteError.message 
          });
        } else {
          logger.info('Old messages cleaned up', { 
            conversationId, 
            deletedCount: messageIds.length 
          });
        }
      }
    } catch (error) {
      logger.error('Error cleaning up old messages', { 
        conversationId, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  public async getConversationStats(conversationId: string): Promise<{
    messageCount: number;
    duration: number;
    avgResponseTime: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('timestamp, role')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true });

      if (error) {
        logger.error('Error fetching conversation stats', { 
          conversationId, 
          error: error.message 
        });
        return { messageCount: 0, duration: 0, avgResponseTime: 0 };
      }

      const messages = data || [];
      const messageCount = messages.length;
      
      if (messageCount === 0) {
        return { messageCount: 0, duration: 0, avgResponseTime: 0 };
      }

      const firstMessage = new Date(messages[0].timestamp);
      const lastMessage = new Date(messages[messages.length - 1].timestamp);
      const duration = lastMessage.getTime() - firstMessage.getTime();

      // Calculate average response time (time between user message and assistant response)
      let totalResponseTime = 0;
      let responseCount = 0;
      
      for (let i = 0; i < messages.length - 1; i++) {
        if (messages[i].role === 'user' && messages[i + 1].role === 'assistant') {
          const userTime = new Date(messages[i].timestamp).getTime();
          const assistantTime = new Date(messages[i + 1].timestamp).getTime();
          totalResponseTime += assistantTime - userTime;
          responseCount++;
        }
      }

      const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

      return {
        messageCount,
        duration,
        avgResponseTime
      };
    } catch (error) {
      logger.error('Error calculating conversation stats', { 
        conversationId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return { messageCount: 0, duration: 0, avgResponseTime: 0 };
    }
  }
}
