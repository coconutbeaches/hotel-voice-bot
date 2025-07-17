# Hotel Voice Bot Conversation Design Guide

## Overview

This guide provides marketing and customer service teams with the tools and knowledge needed to update conversation prompts, FAQs, and conversation flows for the Hotel Voice Bot without requiring code changes.

## Table of Contents

1. [Understanding the Bot System](#understanding-the-bot-system)
2. [FAQ Management](#faq-management)
3. [Conversation Prompts](#conversation-prompts)
4. [Intent Configuration](#intent-configuration)
5. [Multi-language Support](#multi-language-support)
6. [Testing and Validation](#testing-and-validation)
7. [Best Practices](#best-practices)
8. [Common Scenarios](#common-scenarios)
9. [Troubleshooting](#troubleshooting)

## Understanding the Bot System

### Core Components

The Hotel Voice Bot consists of several key components that work together to provide a seamless guest experience:

1. **Intent Recognition**: Identifies what the guest wants to do
2. **Entity Extraction**: Pulls out specific information from messages
3. **Response Generation**: Creates appropriate responses using OpenAI
4. **FAQ System**: Provides quick answers to common questions
5. **Escalation System**: Transfers complex issues to human agents

### Message Flow

```
Guest Message → Intent Recognition → FAQ Check → Response Generation → Guest Reply
                                        ↓
                                   Escalation (if needed)
```

## FAQ Management

### Accessing FAQs

FAQs are stored in the Supabase database and can be managed through:

1. **API Endpoints** (recommended for bulk operations)
2. **Direct Database Access** (for technical users)
3. **Future Admin Panel** (coming soon)

### FAQ Structure

Each FAQ entry contains:

- **Question**: The question text
- **Answer**: The response text
- **Language**: Language code (en, es, fr, etc.)
- **Category**: Grouping for organization
- **Keywords**: Array of keywords for better matching
- **Is Active**: Whether the FAQ is currently in use

### Adding New FAQs

#### Method 1: Using API

```bash
curl -X POST "https://your-domain.com/api/faqs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "question": "What time is check-in?",
    "answer": "Check-in time is 3:00 PM. Early check-in may be available upon request and based on availability.",
    "language": "en",
    "category": "check-in",
    "keywords": ["check-in", "arrival", "time", "early"]
  }'
```

#### Method 2: Using SQL (for technical users)

```sql
INSERT INTO public.faqs (question, answer, language, category, keywords, is_active)
VALUES (
  'What time is check-in?',
  'Check-in time is 3:00 PM. Early check-in may be available upon request and based on availability.',
  'en',
  'check-in',
  ARRAY['check-in', 'arrival', 'time', 'early'],
  true
);
```

### Updating Existing FAQs

#### Using API

```bash
curl -X PUT "https://your-domain.com/api/faqs/123" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "question": "What time is check-in?",
    "answer": "Check-in time is 3:00 PM. Early check-in may be available upon request and based on availability. Please contact the front desk for assistance.",
    "language": "en",
    "category": "check-in",
    "keywords": ["check-in", "arrival", "time", "early", "front desk"]
  }'
```

### FAQ Categories

Organize your FAQs using these recommended categories:

- **check-in**: Check-in procedures, times, early check-in
- **check-out**: Check-out procedures, times, late check-out
- **amenities**: Hotel facilities, spa, gym, pool, business center
- **dining**: Restaurant information, room service, hours
- **services**: Concierge, housekeeping, maintenance, laundry
- **policies**: Pet policy, smoking policy, cancellation policy
- **location**: Directions, parking, nearby attractions
- **wifi**: Internet access, passwords, troubleshooting
- **billing**: Payment, charges, invoices, receipts
- **rooms**: Room types, features, upgrades, issues

### Multi-language FAQs

For each FAQ, create versions in all supported languages:

#### English

```json
{
  "question": "What time is check-in?",
  "answer": "Check-in time is 3:00 PM. Early check-in may be available upon request.",
  "language": "en",
  "category": "check-in"
}
```

#### Spanish

```json
{
  "question": "¿A qué hora es el check-in?",
  "answer": "La hora de check-in es a las 3:00 PM. El check-in temprano puede estar disponible bajo petición.",
  "language": "es",
  "category": "check-in"
}
```

#### French

```json
{
  "question": "À quelle heure est l'enregistrement?",
  "answer": "L'heure d'enregistrement est 15h00. Un enregistrement anticipé peut être disponible sur demande.",
  "language": "fr",
  "category": "check-in"
}
```

## Conversation Prompts

### System Prompts

System prompts define the bot's personality and behavior. These are currently stored in the code but can be updated through configuration files.

#### Current System Prompt Template

```
You are a helpful hotel concierge assistant. Your role is to:
- Assist guests with hotel information and services
- Provide accurate information about hotel amenities and policies
- Help with reservations and special requests
- Escalate complex issues to human staff when necessary

Hotel Information:
- Name: {hotel_name}
- Location: {hotel_location}
- Amenities: {hotel_amenities}
- Contact: {hotel_contact}

Guidelines:
- Be friendly, professional, and helpful
- Provide concise but complete answers
- Ask clarifying questions when needed
- Always confirm important details
- Escalate to human staff for complex issues
```

### Response Templates

Common response templates that can be customized:

#### Welcome Message

```
Welcome to {hotel_name}! I'm your virtual concierge assistant. How can I help you today?
```

#### Clarification Request

```
I'd be happy to help you with that. Could you please provide a bit more information about {specific_detail}?
```

#### Escalation Message

```
I understand this is important to you. Let me connect you with one of our staff members who can provide more detailed assistance.
```

#### Apology/Error Message

```
I apologize for any confusion. Let me help clarify that for you or connect you with our front desk team.
```

## Intent Configuration

### Common Intents

The bot recognizes several types of user intents:

1. **Informational**: Requests for hotel information
2. **Service Request**: Requests for hotel services
3. **Complaint**: Issues or problems
4. **Booking**: Reservation-related queries
5. **General**: Casual conversation

### Intent Examples

#### Check-in Intent

```json
{
  "name": "check_in_inquiry",
  "description": "Guest asking about check-in procedures",
  "keywords": ["check-in", "check in", "arrival", "checking in"],
  "patterns": [
    "What time is check-in?",
    "When can I check in?",
    "Check in time?",
    "I want to check in"
  ],
  "response_template": "Check-in time is {check_in_time}. {additional_info}"
}
```

#### Room Service Intent

```json
{
  "name": "room_service_request",
  "description": "Guest requesting room service",
  "keywords": ["room service", "food", "order", "menu"],
  "patterns": [
    "I want to order room service",
    "Can I get food delivered to my room?",
    "Room service menu",
    "I'm hungry"
  ],
  "response_template": "I'd be happy to help you with room service! {menu_info}"
}
```

### Adding New Intents

To add a new intent, you'll need to:

1. Define the intent structure
2. Add keyword patterns
3. Create response templates
4. Test the intent recognition

## Multi-language Support

### Supported Languages

Current supported languages:

- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Italian (it)
- Portuguese (pt)

### Language Detection

The bot automatically detects the language of incoming messages using OpenAI's language detection capabilities.

### Adding New Languages

To add support for a new language:

1. **Create FAQs in the new language**
2. **Update intent patterns**
3. **Add response templates**
4. **Test language detection**

#### Example: Adding Dutch Support

```sql
-- Add Dutch FAQ
INSERT INTO public.faqs (question, answer, language, category, keywords, is_active)
VALUES (
  'Hoe laat is de check-in?',
  'Check-in tijd is 15:00. Vroege check-in kan beschikbaar zijn op aanvraag.',
  'nl',
  'check-in',
  ARRAY['check-in', 'aankomst', 'tijd', 'vroeg'],
  true
);
```

## Testing and Validation

### Testing New FAQs

Before deploying new FAQs to production:

1. **Test in staging environment**
2. **Verify language detection**
3. **Check response accuracy**
4. **Test edge cases**

### Testing Conversation Flow

Test scenarios:

1. **Happy path**: Normal conversation flow
2. **Edge cases**: Unusual or complex requests
3. **Error handling**: Invalid inputs or system errors
4. **Language switching**: Guests switching languages mid-conversation

### Validation Checklist

- [ ] FAQ answers are accurate and up-to-date
- [ ] Grammar and spelling are correct
- [ ] Tone is appropriate for brand voice
- [ ] All languages are consistent
- [ ] Keywords are comprehensive
- [ ] Response length is appropriate
- [ ] Links and contact information are current

## Best Practices

### Writing Effective FAQs

1. **Keep answers concise but complete**
2. **Use clear, simple language**
3. **Include relevant details**
4. **Provide next steps when appropriate**
5. **Maintain consistent tone**

#### Good FAQ Example

```
Q: What time is check-in?
A: Check-in time is 3:00 PM. If you arrive early, we'll be happy to store your luggage and notify you when your room is ready. You can also check availability for early check-in at the front desk.
```

#### Poor FAQ Example

```
Q: Check-in?
A: 3 PM.
```

### Conversation Design Principles

1. **Be conversational**: Use natural language
2. **Be helpful**: Provide useful information
3. **Be consistent**: Maintain brand voice
4. **Be efficient**: Don't waste the guest's time
5. **Be empathetic**: Show understanding of guest needs

### Keywords and Patterns

**Do:**

- Include variations and synonyms
- Use common misspellings
- Include different phrasings
- Add context-specific terms

**Don't:**

- Use overly technical terms
- Include too many keywords (causes confusion)
- Forget regional variations
- Ignore common abbreviations

## Common Scenarios

### Scenario 1: Check-in Questions

**Guest Intent**: Information about check-in procedures
**Keywords**: check-in, arrival, room ready, early check-in
**Response Strategy**: Provide check-in time, mention early check-in options, offer assistance

### Scenario 2: Amenity Inquiries

**Guest Intent**: Information about hotel facilities
**Keywords**: pool, gym, spa, restaurant, wifi, parking
**Response Strategy**: Provide operating hours, location, any restrictions or fees

### Scenario 3: Service Requests

**Guest Intent**: Request for hotel services
**Keywords**: housekeeping, maintenance, room service, concierge
**Response Strategy**: Acknowledge request, provide process information, escalate if needed

### Scenario 4: Complaints or Issues

**Guest Intent**: Report problems or express dissatisfaction
**Keywords**: problem, issue, broken, not working, complaint
**Response Strategy**: Acknowledge concern, apologize, escalate to human staff

## Troubleshooting

### Common Issues

#### FAQ Not Triggering

**Possible Causes:**

- Keywords don't match guest query
- FAQ is marked as inactive
- Language mismatch

**Solutions:**

- Add more keywords and variations
- Check FAQ active status
- Verify language detection

#### Incorrect Response

**Possible Causes:**

- Multiple FAQs matching the same query
- Outdated information
- Wrong category assignment

**Solutions:**

- Review keyword overlap
- Update FAQ content
- Reorganize categories

#### Language Issues

**Possible Causes:**

- Language detection failure
- Missing translations
- Inconsistent terminology

**Solutions:**

- Improve language detection patterns
- Add missing language versions
- Standardize terminology across languages

### Getting Help

If you encounter issues:

1. **Check the FAQ Database**: Verify entries are correct
2. **Review Logs**: Check for error messages
3. **Test in Staging**: Reproduce issues in test environment
4. **Contact Technical Team**: For complex issues

## Monitoring and Analytics

### Key Metrics

Monitor these metrics to improve conversation quality:

1. **FAQ Hit Rate**: How often FAQs are used
2. **Escalation Rate**: How often conversations are escalated
3. **Response Accuracy**: Guest satisfaction with responses
4. **Language Distribution**: Which languages are most used
5. **Popular Topics**: Most common guest inquiries

### Updating Based on Analytics

Use analytics to:

- Identify missing FAQs
- Improve existing responses
- Add new language support
- Optimize conversation flows

## Appendix

### API Endpoints Reference

#### FAQs

- `GET /api/faqs` - List all FAQs
- `POST /api/faqs` - Create new FAQ
- `PUT /api/faqs/:id` - Update FAQ
- `DELETE /api/faqs/:id` - Delete FAQ

#### Conversations

- `GET /api/conversations` - List conversations
- `POST /api/conversations` - Create conversation
- `GET /api/conversations/:id/messages` - Get messages

### Database Schema

#### FAQs Table

```sql
CREATE TABLE public.faqs (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  language TEXT DEFAULT 'en' NOT NULL,
  category TEXT,
  keywords TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Language Codes

| Language   | Code |
| ---------- | ---- |
| English    | en   |
| Spanish    | es   |
| French     | fr   |
| German     | de   |
| Italian    | it   |
| Portuguese | pt   |
| Dutch      | nl   |
| Russian    | ru   |
| Chinese    | zh   |
| Japanese   | ja   |

## Contact Information

For questions or support:

- **Marketing Team Lead**: marketing@yourcompany.com
- **Technical Support**: tech-support@yourcompany.com
- **Project Manager**: pm@yourcompany.com
- **Customer Service Manager**: cs-manager@yourcompany.com

## Version History

| Version | Date       | Changes                      |
| ------- | ---------- | ---------------------------- |
| 1.0     | 2024-01-15 | Initial version              |
| 1.1     | 2024-01-20 | Added multi-language support |
| 1.2     | 2024-01-25 | Updated API endpoints        |
