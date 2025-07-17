import { supabase } from '@hotel-voice-bot/integrations/supabase';
import type {
  WhatsAppOutgoingMessage,
  MessageQueueJob,
  RateLimitInfo,
} from '@hotel-voice-bot/shared';
import { logger } from '../../utils/logger.js';
import { wahaClient } from './wahaClient.js';

export class MessageQueueService {
  private readonly maxRetries: number = 3;
  private readonly rateLimit: number = 80; // messages per hour per recipient
  private readonly rateLimitWindow: number = 60 * 60 * 1000; // 1 hour in milliseconds
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startProcessing();
  }

  /**
   * Add a message to the queue
   */
  async enqueueMessage(
    phoneNumber: string,
    message: WhatsAppOutgoingMessage,
    priority: 'low' | 'normal' | 'high' = 'normal',
    scheduledAt?: Date
  ): Promise<string> {
    try {
      // Check rate limit
      const canSend = await this.checkRateLimit(phoneNumber);
      if (!canSend) {
        // Schedule for later if rate limited
        const nextAvailableSlot = await this.getNextAvailableSlot(phoneNumber);
        scheduledAt = nextAvailableSlot;
      }

      const job: Omit<MessageQueueJob, 'id'> = {
        phoneNumber,
        message,
        priority,
        maxRetries: this.maxRetries,
        attempt: 0,
        scheduledAt: (scheduledAt || new Date()).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'pending',
      };

      const { data, error } = await supabase
        .from('message_queue')
        .insert([job])
        .select()
        .single();

      if (error) {
        logger.error('Failed to enqueue message', error);
        throw error;
      }

      logger.info('Message enqueued', { jobId: data.id, phoneNumber, priority });
      return data.id;
    } catch (error) {
      logger.error('Error enqueueing message', error);
      throw error;
    }
  }

  /**
   * Check if we can send a message to a phone number without hitting rate limits
   */
  private async checkRateLimit(phoneNumber: string): Promise<boolean> {
    try {
      const windowStart = new Date(Date.now() - this.rateLimitWindow);
      
      const { data, error } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('phone_number', phoneNumber)
        .gte('window_start', windowStart.toISOString())
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        logger.error('Error checking rate limit', error);
        return false;
      }

      if (!data) {
        // No rate limit record, can send
        return true;
      }

      return data.message_count < this.rateLimit;
    } catch (error) {
      logger.error('Error checking rate limit', error);
      return false;
    }
  }

  /**
   * Get the next available slot for sending a message
   */
  private async getNextAvailableSlot(phoneNumber: string): Promise<Date> {
    try {
      const { data, error } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('phone_number', phoneNumber)
        .order('window_end', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return new Date(); // If no data, can send immediately
      }

      // Schedule after the current rate limit window ends
      return new Date(data.window_end);
    } catch (error) {
      logger.error('Error getting next available slot', error);
      return new Date(Date.now() + this.rateLimitWindow);
    }
  }

  /**
   * Update rate limit counter
   */
  private async updateRateLimit(phoneNumber: string): Promise<void> {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - this.rateLimitWindow);
      const windowEnd = new Date(now.getTime() + this.rateLimitWindow);

      const { data: existingData, error: selectError } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('phone_number', phoneNumber)
        .gte('window_start', windowStart.toISOString())
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        logger.error('Error selecting rate limit', selectError);
        return;
      }

      if (existingData) {
        // Update existing record
        const { error } = await supabase
          .from('rate_limits')
          .update({
            message_count: existingData.message_count + 1,
            window_end: windowEnd.toISOString(),
          })
          .eq('id', existingData.id);

        if (error) {
          logger.error('Error updating rate limit', error);
        }
      } else {
        // Create new record
        const { error } = await supabase
          .from('rate_limits')
          .insert([{
            phone_number: phoneNumber,
            message_count: 1,
            window_start: windowStart.toISOString(),
            window_end: windowEnd.toISOString(),
          }]);

        if (error) {
          logger.error('Error creating rate limit', error);
        }
      }
    } catch (error) {
      logger.error('Error updating rate limit', error);
    }
  }

  /**
   * Process pending messages
   */
  private async processMessages(): Promise<void> {
    try {
      const { data: jobs, error } = await supabase
        .from('message_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) {
        logger.error('Error fetching pending messages', error);
        return;
      }

      if (!jobs || jobs.length === 0) {
        return;
      }

      logger.info(`Processing ${jobs.length} pending messages`);

      for (const job of jobs) {
        await this.processMessage(job);
      }
    } catch (error) {
      logger.error('Error processing messages', error);
    }
  }

  /**
   * Process a single message
   */
  private async processMessage(job: MessageQueueJob): Promise<void> {
    try {
      // Update job status to processing
      await this.updateJobStatus(job.id, 'processing');

      // Check rate limit before sending
      const canSend = await this.checkRateLimit(job.phoneNumber);
      if (!canSend) {
        // Reschedule for later
        const nextSlot = await this.getNextAvailableSlot(job.phoneNumber);
        await this.rescheduleJob(job.id, nextSlot);
        return;
      }

      // Send the message via WAHA
      const result = await wahaClient.sendTextMessage(job.phoneNumber, job.message.text?.body || '');
      
      // Update rate limit
      await this.updateRateLimit(job.phoneNumber);

      // Mark job as completed
      await this.updateJobStatus(job.id, 'completed');

      logger.info('Message sent successfully', {
        jobId: job.id,
        messageId: result.messageId,
        phoneNumber: job.phoneNumber,
      });
    } catch (error) {
      logger.error('Error processing message', { jobId: job.id, error });
      await this.handleJobError(job, error as Error);
    }
  }

  /**
   * Handle job error and retry logic
   */
  private async handleJobError(job: MessageQueueJob, error: Error): Promise<void> {
    const newAttempt = job.attempt + 1;

    if (newAttempt >= job.maxRetries) {
      // Max retries reached, mark as failed
      await this.updateJobStatus(job.id, 'failed', error.message);
      logger.error('Job failed after max retries', {
        jobId: job.id,
        attempts: newAttempt,
        error: error.message,
      });
    } else {
      // Retry with exponential backoff
      const delay = Math.pow(2, newAttempt) * 1000; // 2^attempt seconds
      const nextAttempt = new Date(Date.now() + delay);
      
      await this.rescheduleJob(job.id, nextAttempt, newAttempt, error.message);
      
      logger.warn('Job rescheduled for retry', {
        jobId: job.id,
        attempt: newAttempt,
        nextAttempt,
        error: error.message,
      });
    }
  }

  /**
   * Update job status
   */
  private async updateJobStatus(
    jobId: string,
    status: MessageQueueJob['status'],
    error?: string
  ): Promise<void> {
    try {
      const updates: Partial<MessageQueueJob> = {
        status,
        updatedAt: new Date().toISOString(),
      };

      if (error) {
        updates.error = error;
      }

      const { error: updateError } = await supabase
        .from('message_queue')
        .update(updates)
        .eq('id', jobId);

      if (updateError) {
        logger.error('Error updating job status', { jobId, error: updateError });
      }
    } catch (error) {
      logger.error('Error updating job status', { jobId, error });
    }
  }

  /**
   * Reschedule a job
   */
  private async rescheduleJob(
    jobId: string,
    scheduledAt: Date,
    attempt?: number,
    error?: string
  ): Promise<void> {
    try {
      const updates: Partial<MessageQueueJob> = {
        status: 'pending',
        scheduledAt: scheduledAt.toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (attempt !== undefined) {
        updates.attempt = attempt;
      }

      if (error) {
        updates.error = error;
      }

      const { error: updateError } = await supabase
        .from('message_queue')
        .update(updates)
        .eq('id', jobId);

      if (updateError) {
        logger.error('Error rescheduling job', { jobId, error: updateError });
      }
    } catch (error) {
      logger.error('Error rescheduling job', { jobId, error });
    }
  }

  /**
   * Start the message processing loop
   */
  private startProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(async () => {
      await this.processMessages();
    }, 5000); // Process every 5 seconds

    logger.info('Message queue processing started');
  }

  /**
   * Stop the message processing loop
   */
  public stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    logger.info('Message queue processing stopped');
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('message_queue')
        .select('status')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        logger.error('Error getting queue stats', error);
        return { pending: 0, processing: 0, completed: 0, failed: 0 };
      }

      const stats = data.reduce(
        (acc, job) => {
          acc[job.status]++;
          return acc;
        },
        { pending: 0, processing: 0, completed: 0, failed: 0 }
      );

      return stats;
    } catch (error) {
      logger.error('Error getting queue stats', error);
      return { pending: 0, processing: 0, completed: 0, failed: 0 };
    }
  }

  /**
   * Clear old completed jobs
   */
  async cleanupOldJobs(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

      const { error } = await supabase
        .from('message_queue')
        .delete()
        .eq('status', 'completed')
        .lt('updated_at', cutoff.toISOString());

      if (error) {
        logger.error('Error cleaning up old jobs', error);
      } else {
        logger.info('Old completed jobs cleaned up');
      }
    } catch (error) {
      logger.error('Error cleaning up old jobs', error);
    }
  }
}

export const messageQueue = new MessageQueueService();
