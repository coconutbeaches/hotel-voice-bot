-- Add function to safely increment message count
-- This function provides atomic increment for message count

CREATE OR REPLACE FUNCTION increment_message_count(session_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE conversation_sessions 
  SET 
    message_count = message_count + 1,
    updated_at = NOW(),
    last_message_at = NOW()
  WHERE id = session_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION increment_message_count(UUID) TO service_role;
