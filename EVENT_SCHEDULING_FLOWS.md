# Event Scheduling Flows Implementation

## Overview

This document outlines the three main event scheduling flows that have been implemented in the system:

1. **Chat Intent Detection → Admin Notification → Event Creation**
2. **Manual Event Creation with AI Option**
3. **Pure Manual Event Creation**

## Flow 1: Chat Intent Detection → Admin Notification → Event Creation

### Process Flow:
1. **User sends message** in community chat
2. **AI detects intent** using sequential processing (Gemini → xAI fallback)
3. **Admin notification sent** with extracted event details
4. **Admin reviews notification** and can create event directly
5. **Event created** with extracted details

### Key Components:
- `MessageIntentDetector.tsx` - Detects event intents in chat messages
- `intentDetection.ts` - Sequential AI processing (Gemini → xAI)
- `AdminNotificationCenter.tsx` - Admin reviews and creates events from notifications
- `eventScheduler.ts` - Creates events from detected intents

### Code Flow:
```typescript
// 1. User message triggers intent detection
const intent = await intentDetectionService.detectIntent(message, {
  communityId,
  userId: user?.id
});

// 2. If event intent detected, send admin notification
if (intent.intent === 'create_event' && intent.confidence >= 0.6) {
  await sendEnhancedAdminNotification(messageId, 'event', intent.entities);
}

// 3. Admin can create event from notification
const result = await eventSchedulerService.createEventFromIntent(intent, communityId, userId);
```

## Flow 2: Manual Event Creation with AI Option

### Process Flow:
1. **Admin opens event creation screen**
2. **Chooses between Manual or AI-assisted**
3. **If AI-assisted**: Enters natural language description
4. **AI extracts details** and auto-populates form
5. **Admin reviews/edits** and submits

### Key Components:
- `ManualEventCreation.tsx` - Mode selection interface
- `EventForm.tsx` - Enhanced with AI extraction option
- `intentDetection.ts` - Extracts event details from prompts

### Code Flow:
```typescript
// 1. Admin selects AI-assisted mode
const extractedDetails = await intentDetectionService.extractEventDetailsFromPrompt(prompt, {
  communityId
});

// 2. Auto-populate form fields
setValue('title', extractedDetails.title);
setValue('description', extractedDetails.description);
setValue('start_date', extractedDetails.date);
// ... etc

// 3. Admin reviews and submits
```

## Flow 3: Pure Manual Event Creation

### Process Flow:
1. **Admin opens event creation screen**
2. **Chooses manual mode**
3. **Fills in all fields directly**
4. **Submits event**

### Key Components:
- `ManualEventCreation.tsx` - Mode selection
- `EventForm.tsx` - Standard form without AI option

## Technical Implementation

### Sequential AI Processing
- **Primary**: Google Gemini API
- **Fallback**: xAI API (if confidence < 0.6)
- **No OpenAI**: Removed for now as requested

### Enhanced Intent Detection
```typescript
// Enhanced prompt engineering for better extraction
const prompt = `Analyze this message and detect the user's intent. Return ONLY valid JSON.

Message: "${message}"

Detect if the user wants to:
1. create_event - User wants to schedule/organize an event, meeting, or activity
2. schedule_poll - User wants to create a poll or survey
3. admin_alert - User needs admin attention or has a concern
4. general_chat - Regular conversation, questions, or general discussion

For event intents, extract these details:
- title: Event name or type
- description: What the event is about
- date: Date in YYYY-MM-DD format
- time: Time in HH:MM format (24-hour)
- location: Where the event will be held
- suggestedDuration: Duration in minutes
- suggestedCapacity: Number of participants
- tags: Relevant categories or tags
- isOnline: Boolean for online events
- meetingUrl: Meeting link if mentioned`;
```

### Admin Notification System
- **Enhanced notifications** with detailed event information
- **Actionable buttons** for event creation
- **Priority-based filtering**
- **Category organization**

### Form Auto-Population
- **Smart field mapping** from AI extraction
- **Validation** of extracted data
- **Fallback handling** for missing information
- **User-friendly error messages**

## File Structure

### Enhanced Files:
- `src/lib/ai/modules/intentDetection.ts` - Sequential AI processing
- `src/components/chat/MessageIntentDetector.tsx` - Chat intent detection
- `src/components/events/EventForm.tsx` - AI-assisted form
- `src/components/admin/AdminNotificationCenter.tsx` - Event creation from notifications
- `src/components/admin/AdminEventScheduler.tsx` - Updated to use modular services

### New Files:
- `src/components/events/ManualEventCreation.tsx` - Mode selection interface

### Archived Files:
- `src/lib/ai/archive/eventSchedulerCore.ts` - Duplicate functionality
- `src/lib/ai/archive/eventPlanner.ts` - Replaced by modular services

## User Experience

### Flow 1: Chat-Based
1. User types: "Let's have a yoga session tomorrow at 6pm"
2. AI detects event intent with 85% confidence
3. Admin receives notification with extracted details
4. Admin clicks "Create Event" button
5. Event is created automatically

### Flow 2: AI-Assisted Manual
1. Admin clicks "Create Event" → "AI-Assisted"
2. Admin types: "Yoga session tomorrow at 6pm for 15 people"
3. AI extracts: title="Yoga Session", date="2025-01-05", time="18:00", capacity="15"
4. Form auto-populates with extracted details
5. Admin reviews and submits

### Flow 3: Pure Manual
1. Admin clicks "Create Event" → "Manual"
2. Admin fills in all fields directly
3. Admin submits event

## Benefits

1. **No Redundant Code**: Consolidated into modular services
2. **Sequential AI Processing**: Better accuracy with fallback
3. **Unified Experience**: Single EventForm component for all scenarios
4. **Admin Control**: All events require admin review/approval
5. **Flexible Creation**: Multiple ways to create events based on context
6. **Enhanced UX**: Clear feedback and intuitive interfaces

## Future Enhancements

1. **Parallel AI Processing**: Could implement parallel calls to all three LLMs
2. **Advanced Date Parsing**: More sophisticated relative date handling
3. **Location Intelligence**: Smart location suggestions based on community
4. **Recurring Events**: Enhanced AI support for recurring event patterns
5. **Event Templates**: Pre-defined event templates for common activities 