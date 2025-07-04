# Modular AI Services

This directory contains modular AI services that have been extracted from the monolithic `googleAI.ts` file to improve maintainability, testability, and separation of concerns.

## Architecture Overview

The AI functionality has been broken down into focused, single-responsibility modules:

```
modules/
├── intentDetection.ts    # Intent detection and classification
├── eventScheduler.ts     # Event creation and scheduling
├── aiService.ts         # Core AI operations (Google AI, OpenAI, xAI)
├── chatOrchestrator.ts  # Message flow orchestration
└── index.ts            # Service exports
```

## Services

### 1. Intent Detection Service (`intentDetection.ts`)

Handles message intent classification and entity extraction.

**Key Features:**
- Multi-model intent detection (Google AI, OpenAI, xAI)
- Entity extraction (dates, times, locations, etc.)
- Fallback regex-based detection
- Community context awareness

**Usage:**
```typescript
import { intentDetectionService } from './modules';

const intent = await intentDetectionService.detectIntent(
  "Let's schedule a yoga class tomorrow at 9 AM",
  { communityId: '123', userId: '456' }
);
```

### 2. Event Scheduler Service (`eventScheduler.ts`)

Manages event creation and scheduling from detected intents.

**Key Features:**
- Event creation from intent data
- Event validation and enhancement
- AI-powered event detail generation
- Database integration

**Usage:**
```typescript
import { eventSchedulerService } from './modules';

const event = await eventSchedulerService.createEventFromIntent(
  intent,
  communityId,
  userId
);
```

### 3. AI Service (`aiService.ts`)

Core AI operations including multiple model support.

**Key Features:**
- Google AI (Gemini) integration
- OpenAI integration
- xAI integration
- Message analysis and sentiment detection
- Content moderation
- Image analysis

**Usage:**
```typescript
import { aiService } from './modules';

const analysis = await aiService.analyzeMessage(message, userPreferences);
const reply = await aiService.generateChatReply(message);
```

### 4. Chat Orchestrator Service (`chatOrchestrator.ts`)

Orchestrates the flow between different AI services and handles message processing.

**Key Features:**
- Message routing based on intent
- Admin alert generation
- Multi-service coordination
- Fallback handling

**Usage:**
```typescript
import { chatOrchestratorService } from './modules';

const result = await chatOrchestratorService.handleNewMessage({
  text: "Let's have a workout session tomorrow",
  communityId: '123',
  userId: '456'
});
```

## Migration Guide

### From Old `googleAI.ts`

**Before:**
```typescript
import { googleAI } from '../googleAI';

const result = await googleAI.analyzeMessage(message);
```

**After:**
```typescript
import { intentDetectionService, aiService } from './modules';

// For intent detection
const intent = await intentDetectionService.detectIntent(message);

// For general AI analysis
const analysis = await aiService.analyzeMessage(message);
```

### From Old `intentDetector.ts`

**Before:**
```typescript
import { detectIntent } from '../intentDetector';

const intent = await detectIntent(message);
```

**After:**
```typescript
import { intentDetectionService } from './modules';

const intent = await intentDetectionService.detectIntent(message);
```

### From Old `chatOrchestrator.ts`

**Before:**
```typescript
import { handleNewMessage } from '../chatOrchestrator';

const result = await handleNewMessage({ text, communityId, userId });
```

**After:**
```typescript
import { chatOrchestratorService } from './modules';

const result = await chatOrchestratorService.handleNewMessage({
  text,
  communityId,
  userId
});
```

## Benefits of Modularization

1. **Single Responsibility**: Each service has a focused purpose
2. **Testability**: Services can be tested independently
3. **Maintainability**: Easier to understand and modify individual components
4. **Reusability**: Services can be used across different parts of the application
5. **Scalability**: New AI providers can be added without affecting existing code
6. **Error Isolation**: Issues in one service don't affect others

## Configuration

All services use environment variables for API keys:

```env
VITE_GOOGLE_AI_API_KEY=your_google_ai_key
VITE_OPENAI_API_KEY=your_openai_key
VITE_XAI_API_KEY=your_xai_key
```

## Error Handling

All services include comprehensive error handling with:
- Graceful fallbacks
- Detailed error logging
- Default responses for failed operations
- Multi-model redundancy

## Future Enhancements

- Add more AI providers (Claude, Cohere, etc.)
- Implement caching for repeated requests
- Add rate limiting and cost optimization
- Create service-specific configuration options
- Add metrics and monitoring 