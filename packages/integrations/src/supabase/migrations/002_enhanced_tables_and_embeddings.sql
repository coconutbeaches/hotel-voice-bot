-- Last Updated: 2025-07-17

-- Enhanced table definitions with embeddings support
-- Update messages table to include embeddings
ALTER TABLE messages ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS messages_embedding_idx ON messages 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enhanced guests table with more fields
ALTER TABLE guests ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS room_number TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Enhanced conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel TEXT; -- 'voice', 'chat', etc.

-- Enhanced messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender TEXT; -- 'guest', 'bot', 'staff'
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT; -- 'text', 'audio', 'image'
ALTER TABLE messages ADD COLUMN IF NOT EXISTS intent_id BIGINT REFERENCES intents(id);

-- Enhanced intents table
ALTER TABLE intents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE intents ADD COLUMN IF NOT EXISTS confidence_threshold DECIMAL(3,2) DEFAULT 0.7;
ALTER TABLE intents ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Enhanced prompt_versions table
ALTER TABLE prompt_versions ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE prompt_versions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
ALTER TABLE prompt_versions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Enhanced service_requests table
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;

-- Enhanced bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS room_type TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'confirmed';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Enhanced upsell_offers table
ALTER TABLE upsell_offers ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE upsell_offers ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);
ALTER TABLE upsell_offers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE upsell_offers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add comprehensive policies for internal services
CREATE POLICY "Internal services can insert messages" ON messages
  FOR INSERT
  WITH CHECK (auth.role() = 'internal');

CREATE POLICY "Internal services can update messages" ON messages
  FOR UPDATE
  USING (auth.role() = 'internal');

CREATE POLICY "Internal services can insert conversations" ON conversations
  FOR INSERT
  WITH CHECK (auth.role() = 'internal');

CREATE POLICY "Internal services can update conversations" ON conversations
  FOR UPDATE
  USING (auth.role() = 'internal');

CREATE POLICY "Internal services can insert service_requests" ON service_requests
  FOR INSERT
  WITH CHECK (auth.role() = 'internal');

CREATE POLICY "Internal services can update service_requests" ON service_requests
  FOR UPDATE
  USING (auth.role() = 'internal');

-- Add comprehensive policies for staff dashboard
CREATE POLICY "Staff can insert guests" ON guests
  FOR INSERT
  WITH CHECK (auth.role() = 'staff');

CREATE POLICY "Staff can update guests" ON guests
  FOR UPDATE
  USING (auth.role() = 'staff');

CREATE POLICY "Staff can update service_requests" ON service_requests
  FOR UPDATE
  USING (auth.role() = 'staff');

CREATE POLICY "Staff can insert bookings" ON bookings
  FOR INSERT
  WITH CHECK (auth.role() = 'staff');

CREATE POLICY "Staff can update bookings" ON bookings
  FOR UPDATE
  USING (auth.role() = 'staff');

CREATE POLICY "Staff can update upsell_offers" ON upsell_offers
  FOR UPDATE
  USING (auth.role() = 'staff');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_requests_updated_at BEFORE UPDATE ON service_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
