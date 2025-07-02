import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Loader } from 'lucide-react';
import { motion } from 'framer-motion';

interface VoiceInputButtonProps {
  onTranscription: (text: string) => void;
  isListening: boolean;
  setIsListening: (isListening: boolean) => void;
}

const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscription,
  isListening,
  setIsListening
}) => {
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(true);
  const [visualizerValues, setVisualizerValues] = useState<number[]>(Array(5).fill(2));

  useEffect(() => {
    // Check if browser supports SpeechRecognition
    const isSpeechRecognitionSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    setRecognitionSupported(isSpeechRecognitionSupported);
    
    if (!isSpeechRecognitionSupported) {
      setError('Voice input is not supported in this browser');
    }
  }, []);

  useEffect(() => {
    let recognition: any = null;
    let visualizerInterval: NodeJS.Timeout | null = null;

    const initializeRecognition = () => {
      // Initialize SpeechRecognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) return null;
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsInitializing(false);
        setIsListening(true);
        setError('');
        
        // Start visualizer animation
        visualizerInterval = setInterval(() => {
          if (isListening) {
            setVisualizerValues(Array(5).fill(0).map(() => Math.random() * 20 + 2));
          }
        }, 100);
      };
      
      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const result = event.results[current];
        const transcriptValue = result[0].transcript;
        setTranscript(transcriptValue);
        
        if (result.isFinal) {
          onTranscription(transcriptValue);
          recognition.stop();
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setError(`Error: ${event.error}`);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
        if (visualizerInterval) {
          clearInterval(visualizerInterval);
          setVisualizerValues(Array(5).fill(2));
        }
      };
      
      return recognition;
    };

    if (isListening && !recognition) {
      setIsInitializing(true);
      recognition = initializeRecognition();
      if (recognition) {
        try {
          recognition.start();
        } catch (err) {
          console.error('Error starting speech recognition:', err);
          setError('Failed to start voice input');
          setIsListening(false);
        }
      }
    } else if (!isListening && recognition) {
      recognition.stop();
      recognition = null;
    }

    return () => {
      if (recognition) {
        recognition.stop();
      }
      if (visualizerInterval) {
        clearInterval(visualizerInterval);
      }
    };
  }, [isListening, onTranscription]);

  const toggleListening = () => {
    if (!recognitionSupported) {
      setError('Voice input is not supported in this browser');
      return;
    }
    
    setIsListening(!isListening);
  };

  return (
    <div className="relative">
      <button
        onClick={toggleListening}
        disabled={!recognitionSupported || isInitializing}
        className={`p-2 rounded-full ${
          isListening 
            ? 'bg-red-500 text-white hover:bg-red-600' 
            : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100'
        } ${!recognitionSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={isListening ? "Stop recording" : "Start voice input"}
      >
        {isInitializing ? (
          <Loader className="h-5 w-5 animate-spin" />
        ) : isListening ? (
          <MicOff size={20} />
        ) : (
          <Mic size={20} />
        )}
      </button>
      
      {isListening && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white rounded-lg shadow-lg border border-neutral-200 p-3 w-64">
          <div className="flex items-center justify-center space-x-1 mb-2">
            {visualizerValues.map((value, index) => (
              <motion.div
                key={index}
                className="w-1 bg-primary-500 rounded-full"
                animate={{ height: value }}
                transition={{ duration: 0.1 }}
              />
            ))}
          </div>
          <p className="text-xs text-center text-neutral-600">
            {transcript || "Listening..."}
          </p>
        </div>
      )}
      
      {error && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-red-50 text-red-700 text-xs p-2 rounded-lg whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  );
};

export default VoiceInputButton;