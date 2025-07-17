-- Last Updated: 2025-07-17

-- Hotel Voice Bot Database Migration
-- This migration adds bot-related tables without modifying existing schema
-- All changes are additive and safe for production

-- Bot Messages Table
-- Stores all bot conversation messages with guest users
CREATE TABLE IF NOT EXISTS public.bot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_user_id TEXT REFERENCES public.guest_users(user_id),
  user_profile_id UUID REFERENCES public.profiles(id),
  stay_id TEXT,
  whatsapp_number TEXT,
  message_type TEXT NOT NULL CHECK (message_type IN ('guest_audio', 'guest_text', 'bot_text', 'bot_audio', 'human_override')),
  content TEXT NOT NULL,
  language_detected TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  escalated_to_human BOOLEAN DEFAULT false,
  session_id UUID,
  cost_estimate_usd NUMERIC(8,3),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Indexes for performance
  CONSTRAINT bot_messages_message_type_check CHECK (message_type IN ('guest_audio', 'guest_text', 'bot_text', 'bot_audio', 'human_override'))
);

-- Create indexes for bot_messages
CREATE INDEX IF NOT EXISTS idx_bot_messages_guest_user_id ON public.bot_messages(guest_user_id);
CREATE INDEX IF NOT EXISTS idx_bot_messages_stay_id ON public.bot_messages(stay_id);
CREATE INDEX IF NOT EXISTS idx_bot_messages_whatsapp_number ON public.bot_messages(whatsapp_number);
CREATE INDEX IF NOT EXISTS idx_bot_messages_created_at ON public.bot_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_bot_messages_session_id ON public.bot_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_bot_messages_escalated ON public.bot_messages(escalated_to_human);

-- Escalations Table
-- Tracks when conversations are escalated to human agents
CREATE TABLE IF NOT EXISTS public.escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_message_id UUID REFERENCES public.bot_messages(id),
  guest_user_id TEXT REFERENCES public.guest_users(user_id),
  stay_id TEXT,
  assigned_to TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'resolved', 'closed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  escalation_reason TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Constraints
  CONSTRAINT escalations_status_check CHECK (status IN ('open', 'assigned', 'resolved', 'closed')),
  CONSTRAINT escalations_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

-- Create indexes for escalations
CREATE INDEX IF NOT EXISTS idx_escalations_guest_user_id ON public.escalations(guest_user_id);
CREATE INDEX IF NOT EXISTS idx_escalations_stay_id ON public.escalations(stay_id);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON public.escalations(status);
CREATE INDEX IF NOT EXISTS idx_escalations_assigned_to ON public.escalations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_escalations_created_at ON public.escalations(created_at);
CREATE INDEX IF NOT EXISTS idx_escalations_priority ON public.escalations(priority);

-- FAQs Table
-- Manages frequently asked questions in multiple languages
CREATE TABLE IF NOT EXISTS public.faqs (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  language TEXT DEFAULT 'en' NOT NULL,
  category TEXT,
  keywords TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint for question-language combination
  CONSTRAINT faqs_question_language_unique UNIQUE (question, language)
);

-- Create indexes for faqs
CREATE INDEX IF NOT EXISTS idx_faqs_language ON public.faqs(language);
CREATE INDEX IF NOT EXISTS idx_faqs_category ON public.faqs(category);
CREATE INDEX IF NOT EXISTS idx_faqs_is_active ON public.faqs(is_active);
CREATE INDEX IF NOT EXISTS idx_faqs_keywords ON public.faqs USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_faqs_updated_at ON public.faqs(updated_at);

-- Conversation Sessions Table
-- Tracks conversation sessions for analytics and context
CREATE TABLE IF NOT EXISTS public.conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_user_id TEXT REFERENCES public.guest_users(user_id),
  whatsapp_number TEXT NOT NULL,
  stay_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'escalated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  escalation_count INTEGER DEFAULT 0,
  hotel_info JSONB DEFAULT '{}'::jsonb,
  guest_context JSONB DEFAULT '{}'::jsonb,
  
  -- Constraints
  CONSTRAINT conversation_sessions_status_check CHECK (status IN ('active', 'ended', 'escalated'))
);

-- Create indexes for conversation_sessions
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_guest_user_id ON public.conversation_sessions(guest_user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_whatsapp_number ON public.conversation_sessions(whatsapp_number);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_stay_id ON public.conversation_sessions(stay_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_status ON public.conversation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_created_at ON public.conversation_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_last_message_at ON public.conversation_sessions(last_message_at);

-- Bot Analytics Table
-- Stores analytics data for performance monitoring
CREATE TABLE IF NOT EXISTS public.bot_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint for date-metric combination
  CONSTRAINT bot_analytics_date_metric_unique UNIQUE (date, metric_type)
);

-- Create indexes for bot_analytics
CREATE INDEX IF NOT EXISTS idx_bot_analytics_date ON public.bot_analytics(date);
CREATE INDEX IF NOT EXISTS idx_bot_analytics_metric_type ON public.bot_analytics(metric_type);
CREATE INDEX IF NOT EXISTS idx_bot_analytics_created_at ON public.bot_analytics(created_at);

-- Add foreign key for bot_messages to conversation_sessions
ALTER TABLE public.bot_messages 
ADD COLUMN IF NOT EXISTS conversation_session_id UUID REFERENCES public.conversation_sessions(id);

CREATE INDEX IF NOT EXISTS idx_bot_messages_conversation_session_id ON public.bot_messages(conversation_session_id);

-- Add foreign key for escalations to conversation_sessions
ALTER TABLE public.escalations 
ADD COLUMN IF NOT EXISTS conversation_session_id UUID REFERENCES public.conversation_sessions(id);

CREATE INDEX IF NOT EXISTS idx_escalations_conversation_session_id ON public.escalations(conversation_session_id);

-- Update function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_faqs_updated_at
    BEFORE UPDATE ON public.faqs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_sessions_updated_at
    BEFORE UPDATE ON public.conversation_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
-- Enable RLS on all tables
ALTER TABLE public.bot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can read their own bot messages" ON public.bot_messages
    FOR SELECT USING (auth.uid() = user_profile_id OR auth.role() = 'service_role');

CREATE POLICY "Service role can manage bot messages" ON public.bot_messages
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can read escalations" ON public.escalations
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Service role can manage escalations" ON public.escalations
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can read active FAQs" ON public.faqs
    FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can manage FAQs" ON public.faqs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can read their own conversation sessions" ON public.conversation_sessions
    FOR SELECT USING (auth.uid()::text = guest_user_id OR auth.role() = 'service_role');

CREATE POLICY "Service role can manage conversation sessions" ON public.conversation_sessions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage bot analytics" ON public.bot_analytics
    FOR ALL USING (auth.role() = 'service_role');

-- Comments for documentation
COMMENT ON TABLE public.bot_messages IS 'Stores all bot conversation messages with guest users';
COMMENT ON TABLE public.escalations IS 'Tracks when conversations are escalated to human agents';
COMMENT ON TABLE public.faqs IS 'Manages frequently asked questions in multiple languages';
COMMENT ON TABLE public.conversation_sessions IS 'Tracks conversation sessions for analytics and context';
COMMENT ON TABLE public.bot_analytics IS 'Stores analytics data for performance monitoring';

COMMENT ON COLUMN public.bot_messages.guest_user_id IS 'Reference to guest_users.user_id';
COMMENT ON COLUMN public.bot_messages.user_profile_id IS 'Reference to profiles.id';
COMMENT ON COLUMN public.bot_messages.message_type IS 'Type of message: guest_audio, guest_text, bot_text, bot_audio, human_override';
COMMENT ON COLUMN public.bot_messages.content IS 'Text content or audio file URL (Supabase Storage)';
COMMENT ON COLUMN public.bot_messages.language_detected IS 'Detected language of the message';
COMMENT ON COLUMN public.bot_messages.escalated_to_human IS 'Whether this message was escalated to human agent';
COMMENT ON COLUMN public.bot_messages.cost_estimate_usd IS 'Estimated cost of processing this message';

COMMENT ON COLUMN public.escalations.bot_message_id IS 'Reference to the message that triggered escalation';
COMMENT ON COLUMN public.escalations.guest_user_id IS 'Reference to guest_users.user_id';
COMMENT ON COLUMN public.escalations.status IS 'Status: open, assigned, resolved, closed';
COMMENT ON COLUMN public.escalations.escalation_reason IS 'Reason for escalation';
COMMENT ON COLUMN public.escalations.priority IS 'Priority level: low, medium, high, urgent';

COMMENT ON COLUMN public.faqs.question IS 'The question text';
COMMENT ON COLUMN public.faqs.answer IS 'The answer text';
COMMENT ON COLUMN public.faqs.language IS 'Language code (e.g., en, es, fr)';
COMMENT ON COLUMN public.faqs.category IS 'Category for grouping FAQs';
COMMENT ON COLUMN public.faqs.keywords IS 'Array of keywords for search optimization';
COMMENT ON COLUMN public.faqs.is_active IS 'Whether this FAQ is active and should be used';
