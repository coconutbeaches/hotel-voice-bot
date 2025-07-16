# Hotel Voice Bot Specification Document

## Project Overview

The project aims to automate guest interactions through a WhatsApp-integrated PWA, eventually supporting multiple languages and multiple guest services.

## User Journeys

1. **Version 1.0 (within 1 week):**
   - Provide answers to the 100 most common FAQ questions via voice.
   - Handle fallback for unanswerable questions with direct escalation to the general manager.

2. **Version 1.1:**
   - Handle complaint management.

3. **Version 1.5:**
   - Support concierge services such as directions and recommendations.

4. **Version 2.0:**
   - Enable reservation booking functionality.

5. **Version 3.0:**
   - Facilitate room service orders.

## Accessibility

- Guests access the voice bot through a link in a WhatsApp message.
- Encourage installation on devices as a PWA for improved user experience.

## Multilingual Support

- **Primary:** English
- **Secondary (future versions):** German, French, Italian

## Tone of Voice

- A friendly, casual style with a touch of formality and a premium feel.
- Efficient and concise in responses.

## Response Time

- Aim for real-time responses (< 2 seconds) to ensure a seamless interaction.

## Technical Stack

- Next.js for server-side rendering and PWA capabilities
- WhatsApp API for messaging and notifications
- Supabase for data management
- React for all client-side interactions

## KPI's

- Success is measured through reduced direct guest interactions with staff.
- Aim for high call deflection rates.

## Operational Requirements

- **Availability:** 24/7
- **Message Handling:** Log summaries and raise alerts for certain types of queries.
- **Contact Collection:** Gather guest details for follow-ups.
- **Escalations:** Direct escalations to the general manager when needed.

## Timeline

- **Version 1.0:** Ready in 1 week
- **Subsequent Versions:** Every 2 weeks
