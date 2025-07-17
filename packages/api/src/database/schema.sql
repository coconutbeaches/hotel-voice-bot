-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Message queue table for managing outgoing WhatsApp messages
CREATE TABLE IF NOT EXISTS message_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL,
    message JSONB NOT NULL,
    priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    max_retries INTEGER NOT NULL DEFAULT 3,
    attempt INTEGER NOT NULL DEFAULT 0,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error TEXT,
    INDEX idx_message_queue_status (status),
    INDEX idx_message_queue_scheduled_at (scheduled_at),
    INDEX idx_message_queue_phone_number (phone_number),
    INDEX idx_message_queue_priority (priority)
);

-- Rate limiting table for tracking message sending rates
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL,
    message_count INTEGER NOT NULL DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    INDEX idx_rate_limits_phone_number (phone_number),
    INDEX idx_rate_limits_window_start (window_start),
    INDEX idx_rate_limits_window_end (window_end)
);

-- RLS (Row Level Security) policies for message_queue table
ALTER TABLE message_queue ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role to access all records
CREATE POLICY "Allow service role full access to message_queue" ON message_queue
    FOR ALL USING (auth.role() = 'service_role');

-- Policy to allow authenticated users to view their own messages
CREATE POLICY "Users can view their own messages" ON message_queue
    FOR SELECT USING (auth.uid()::text = phone_number);

-- RLS policies for rate_limits table
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role to access all records
CREATE POLICY "Allow service role full access to rate_limits" ON rate_limits
    FOR ALL USING (auth.role() = 'service_role');

-- Policy to allow authenticated users to view their own rate limits
CREATE POLICY "Users can view their own rate limits" ON rate_limits
    FOR SELECT USING (auth.uid()::text = phone_number);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at for message_queue
CREATE TRIGGER update_message_queue_updated_at
    BEFORE UPDATE ON message_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at for rate_limits
CREATE TRIGGER update_rate_limits_updated_at
    BEFORE UPDATE ON rate_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old completed messages
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS void AS $$
BEGIN
    DELETE FROM message_queue
    WHERE status = 'completed'
    AND updated_at < NOW() - INTERVAL '7 days';
    
    DELETE FROM rate_limits
    WHERE window_end < NOW() - INTERVAL '1 day';
END;
$$ language 'plpgsql';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_message_queue_created_at ON message_queue (created_at);
CREATE INDEX IF NOT EXISTS idx_message_queue_updated_at ON message_queue (updated_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at ON rate_limits (created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_updated_at ON rate_limits (updated_at);

-- Create a view for queue statistics
CREATE OR REPLACE VIEW message_queue_stats AS
SELECT 
    status,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_time_seconds
FROM message_queue
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Grant permissions to the service role
GRANT ALL ON message_queue TO service_role;
GRANT ALL ON rate_limits TO service_role;
GRANT SELECT ON message_queue_stats TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_messages() TO service_role;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO service_role;
