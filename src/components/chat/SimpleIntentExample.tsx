import React, { useState } from 'react';
import { 
  intentDetectionService, 
  eventSchedulerService, 
  chatOrchestratorService,
  aiService 
} from '../../lib/ai/modules';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, MessageSquare, Lightbulb, CheckCircle, AlertCircle } from 'lucide-react';

interface SimpleIntentExampleProps {
  communityId: string;
}

const SimpleIntentExample: React.FC<SimpleIntentExampleProps> = ({ communityId }) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleIntentDetection = async () => {
    if (!message.trim() || !user) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Example 1: Simple intent detection
      const intent = await intentDetectionService.detectIntent(message, {
        communityId,
        userId: user.id
      });

      setResult({
        type: 'intent_detection',
        data: intent,
        message: `Detected intent: ${intent.intent} (confidence: ${(intent.confidence * 100).toFixed(1)}%)`
      });

    } catch (err) {
      setError('Failed to detect intent');
      console.error('Intent detection error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEventCreation = async () => {
    if (!message.trim() || !user) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Example 2: Event creation from message
      const event = await eventSchedulerService.createEventFromMessage(
        message,
        communityId,
        user.id
      );

      if (event) {
        setResult({
          type: 'event_created',
          data: event,
          message: `✅ Event created: "${event.title}"`
        });
      } else {
        setResult({
          type: 'no_event',
          message: 'No event was created (low confidence or no event intent detected)'
        });
      }

    } catch (err) {
      setError('Failed to create event');
      console.error('Event creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChatOrchestration = async () => {
    if (!message.trim() || !user) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Example 3: Full chat orchestration
      const orchestrationResult = await chatOrchestratorService.handleNewMessage({
        text: message,
        communityId,
        userId: user.id,
        enableEventCreation: true,
        enableAdminAlerts: true,
        enableAIReply: true
      });

      setResult({
        type: 'orchestration',
        data: orchestrationResult,
        message: `Orchestration result: ${orchestrationResult.type}`
      });

    } catch (err) {
      setError('Failed to process message');
      console.error('Orchestration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageAnalysis = async () => {
    if (!message.trim() || !user) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Example 4: Message analysis and sentiment
      const analysis = await aiService.analyzeMessage(message, {
        communityId,
        userId: user.id
      });

      setResult({
        type: 'analysis',
        data: analysis,
        message: `Message analysis: ${analysis.sentiment} sentiment, ${analysis.topics.length} topics detected`
      });

    } catch (err) {
      setError('Failed to analyze message');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGetSuggestions = async () => {
    if (!user) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Example 5: Get message suggestions
      const suggestions = await chatOrchestratorService.getMessageSuggestions(
        { name: user.email, interests: ['fitness', 'community'] },
        ['Hello everyone!', 'How was your workout?'],
        'Fitness community'
      );

      setResult({
        type: 'suggestions',
        data: suggestions,
        message: `Generated ${suggestions.length} message suggestions`
      });

    } catch (err) {
      setError('Failed to get suggestions');
      console.error('Suggestions error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderResult = () => {
    if (!result) return null;

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center mb-2">
          {result.type === 'event_created' && <CheckCircle className="h-5 w-5 text-green-500 mr-2" />}
          {result.type === 'intent_detection' && <Lightbulb className="h-5 w-5 text-blue-500 mr-2" />}
          {result.type === 'analysis' && <MessageSquare className="h-5 w-5 text-purple-500 mr-2" />}
          {result.type === 'suggestions' && <Calendar className="h-5 w-5 text-orange-500 mr-2" />}
          <span className="font-medium">{result.message}</span>
        </div>
        
        {result.data && (
          <div className="mt-2 text-sm text-gray-600">
            <pre className="bg-white p-2 rounded border overflow-auto max-h-40">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Modular AI Services Example
      </h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Test Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Try: 'Let's schedule a yoga class tomorrow at 9 AM' or 'How is everyone doing today?'"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={handleIntentDetection}
          disabled={loading || !message.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center"
        >
          <Lightbulb className="h-4 w-4 mr-2" />
          Detect Intent
        </button>

        <button
          onClick={handleEventCreation}
          disabled={loading || !message.trim()}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center justify-center"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Create Event
        </button>

        <button
          onClick={handleChatOrchestration}
          disabled={loading || !message.trim()}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center justify-center"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Full Orchestration
        </button>

        <button
          onClick={handleMessageAnalysis}
          disabled={loading || !message.trim()}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center"
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          Analyze Message
        </button>
      </div>

      <button
        onClick={handleGetSuggestions}
        disabled={loading}
        className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 flex items-center justify-center"
      >
        <Calendar className="h-4 w-4 mr-2" />
        Get Message Suggestions
      </button>

      {loading && (
        <div className="mt-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 mt-2">Processing...</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center text-red-700">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {renderResult()}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-800 mb-2">How to Use:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Detect Intent:</strong> Analyzes message for event, question, or other intents</li>
          <li>• <strong>Create Event:</strong> Automatically creates events from messages with event intent</li>
          <li>• <strong>Full Orchestration:</strong> Routes messages through the complete AI pipeline</li>
          <li>• <strong>Analyze Message:</strong> Provides sentiment analysis and topic extraction</li>
          <li>• <strong>Get Suggestions:</strong> Generates contextual message suggestions</li>
        </ul>
      </div>
    </div>
  );
};

export default SimpleIntentExample; 