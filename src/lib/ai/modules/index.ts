// Modular AI Services
export { intentDetectionService } from './intentDetection';
export { eventSchedulerService } from './eventScheduler';
export { aiService } from './aiService';
export { chatOrchestratorService } from './chatOrchestrator';

// Export types
export type { DetectedIntent, IntentType } from './intentDetection';
export type { EventDetails, ScheduledEvent } from './eventScheduler';
export type { AIAnalysisResult, ImageAnalysisResult, AIMessageSuggestion } from './aiService';
export type { OrchestratorResult, OrchestratorOptions } from './chatOrchestrator'; 