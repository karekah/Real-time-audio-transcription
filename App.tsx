import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Type Definition for Web Speech API ---
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
  onresult: ((event: any) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// --- SVG Icon Components (defined outside App to prevent re-creation) ---
const MicrophoneIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM18.999 13a1 1 0 1 0-1.998 0A5.002 5.002 0 0 1 12 18a5 5 0 0 1-5-5 1 1 0 1 0-2 0a7 7 0 0 0 6 6.93V22h-3a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-2.07A7.002 7.002 0 0 0 18.999 13z" />
  </svg>
);

const StopIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 7h10v10H7z" />
  </svg>
);

const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
  </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
  </svg>
);

// --- Supported Languages ---
const LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'es-ES', name: 'Español (España)' },
  { code: 'fr-FR', name: 'Français' },
  { code: 'de-DE', name: 'Deutsch' },
  { code: 'it-IT', name: 'Italiano' },
  { code: 'ja-JP', name: '日本語' },
  { code: 'ko-KR', name: '한국어' },
  { code: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'ru-RU', name: 'Русский' },
  { code: 'zh-CN', name: '中文 (普通话)' },
  { code: 'hi-IN', name: 'हिन्दी' },
];


// --- Main App Component ---
export default function App() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [language, setLanguage] = useState('en-US');
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const transcriptAtSessionStart = useRef('');

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser. Please try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        setError("No speech was detected. Please try again.");
      } else if (event.error === 'audio-capture') {
        setError("Microphone is not available. Please check your microphone settings.");
      } else if (event.error === 'not-allowed') {
        setError("Permission to use microphone was denied. Please allow microphone access in your browser settings.");
      } else {
        setError(`An error occurred: ${event.error}`);
      }
    };

    recognition.onresult = (event: any) => {
      let sessionInterimTranscript = '';
      let sessionFinalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          sessionFinalTranscript += event.results[i][0].transcript;
        } else {
          sessionInterimTranscript += event.results[i][0].transcript;
        }
      }
      
      setTranscript(transcriptAtSessionStart.current + sessionFinalTranscript + sessionInterimTranscript);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [language]);

  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [transcript]);

  const handleToggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      const currentTranscript = transcript.trim();
      transcriptAtSessionStart.current = currentTranscript ? currentTranscript + ' ' : '';
      recognitionRef.current?.start();
    }
  }, [isListening, transcript]);

  const handleCopy = useCallback(() => {
    if (transcript) {
      navigator.clipboard.writeText(transcript);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  }, [transcript]);

  const handleClear = useCallback(() => {
    setTranscript('');
    transcriptAtSessionStart.current = '';
  }, []);
  
  const StatusIndicator = () => {
    if (error) return <div className="text-red-400 font-medium text-center">{error}</div>;
    if (isListening) return <div className="text-cyan-400 font-medium text-center flex items-center justify-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
        </span>
        Listening...
      </div>;
    return <div className="text-slate-400 font-medium text-center">Click the microphone to start transcribing</div>;
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-4xl mx-auto flex flex-col h-[85vh]">
        <header className="text-center mb-6">
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">Real-time Transcription</h1>
          <p className="text-slate-400 mt-2 text-lg">Your words, captured instantly.</p>
          <div className="mt-6 max-w-xs mx-auto">
            <label htmlFor="language-select" className="sr-only">Select Language</label>
            <select
                id="language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                aria-label="Select transcription language"
                disabled={isListening}
            >
                {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                        {lang.name}
                    </option>
                ))}
            </select>
          </div>
        </header>

        <div ref={transcriptContainerRef} className="flex-grow bg-slate-800/50 rounded-lg shadow-inner p-6 overflow-y-auto ring-1 ring-slate-700/50">
          <p className="text-lg sm:text-xl leading-relaxed whitespace-pre-wrap">
            {transcript || <span className="text-slate-500">Transcript will appear here...</span>}
          </p>
        </div>
        
        <div className="flex-shrink-0 pt-6">
          <div className="text-center mb-6 h-6">
            <StatusIndicator />
          </div>
          <div className="flex items-center justify-center gap-4">
            <button
                onClick={handleClear}
                disabled={!transcript || isListening}
                className="p-3 rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500"
                aria-label="Clear transcript"
            >
                <TrashIcon className="w-6 h-6" />
            </button>
            <button
              onClick={handleToggleListening}
              className={`p-5 rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                isListening
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_theme(colors.red.500/50%)] focus:ring-red-500'
                  : 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-[0_0_20px_theme(colors.cyan.500/50%)] focus:ring-cyan-500'
              }`}
              aria-label={isListening ? 'Stop listening' : 'Start listening'}
            >
              {isListening ? (
                <StopIcon className="w-8 h-8" />
              ) : (
                <MicrophoneIcon className="w-8 h-8" />
              )}
            </button>
            <button
                onClick={handleCopy}
                disabled={!transcript || isListening}
                className="p-3 rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500"
                aria-label="Copy transcript"
            >
               {isCopied ? (
                  <svg className="w-6 h-6 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
               ) : (
                  <CopyIcon className="w-6 h-6" />
               )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
