import React from 'react';
import SimpleIntentExample from '../components/chat/SimpleIntentExample';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Code, BookOpen, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const AIExamplePage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Please log in to access AI examples</h1>
          <Link 
            to="/login" 
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link 
                to="/" 
                className="flex items-center text-gray-600 hover:text-gray-900 mr-6"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Home
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">AI Services Demo</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Welcome, {user.email}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Modular AI Services Demonstration
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              This page demonstrates the new modular AI services that have been extracted from the monolithic 
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">googleAI.ts</code> file. 
              Test different AI functionalities below.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center mb-4">
                <Zap className="h-8 w-8 text-blue-500 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Intent Detection</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Automatically detect user intents from messages (events, questions, feedback, etc.)
                with confidence scores and entity extraction.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center mb-4">
                <Code className="h-8 w-8 text-green-500 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Event Scheduling</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Create events automatically from natural language messages with AI-enhanced details,
                validation, and database integration.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center mb-4">
                <BookOpen className="h-8 w-8 text-purple-500 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Multi-Model AI</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Leverage multiple AI providers (Google AI, OpenAI, xAI) with intelligent fallbacks
                and ensemble voting for better accuracy.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Interactive AI Services Tester
            </h2>
            <p className="text-gray-600">
              Try different types of messages to see how the modular AI services work together.
            </p>
          </div>
          
          <div className="p-6">
            <SimpleIntentExample communityId="demo-community" />
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Example Messages to Try:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Event Creation:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• "Let's schedule a yoga class tomorrow at 9 AM"</li>
                <li>• "Can we organize a fitness meetup this weekend?"</li>
                <li>• "I want to host a cooking workshop next Friday"</li>
                <li>• "How about a community dinner on Saturday evening?"</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">General Chat:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• "How is everyone doing today?"</li>
                <li>• "I had a great workout this morning!"</li>
                <li>• "Does anyone have tips for staying motivated?"</li>
                <li>• "What's everyone's favorite healthy recipe?"</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Architecture Benefits:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Before (Monolithic):</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Single 1,191-line file</li>
                <li>• Mixed responsibilities</li>
                <li>• Hard to test and maintain</li>
                <li>• Difficult to extend</li>
                <li>• Error-prone changes</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">After (Modular):</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Focused, single-responsibility modules</li>
                <li>• Easy to test independently</li>
                <li>• Simple to maintain and extend</li>
                <li>• Clear separation of concerns</li>
                <li>• Better error isolation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIExamplePage; 