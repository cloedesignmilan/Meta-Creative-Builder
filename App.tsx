
import React, { useState, useCallback, useEffect } from 'react';
import { CreativeForm } from './components/CreativeForm';
import { ResultsDisplay } from './components/ResultsDisplay';
import { generateAdCreatives } from './services/geminiService';
import type { AdCreative, CreativeFormat, CreativeType, UserInputs } from './types';
import { IconLogo } from './components/IconComponents';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Generating creatives...');
  const [results, setResults] = useState<AdCreative[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoLoadingMessages = [
    'Generating video concept... 🎬',
    'Rendering frames... this can take a few minutes. ✨',
    'Adding dynamic transitions... 🎞️',
    'Optimizing for high engagement... 🚀',
    'Finalizing your video creative... 🎨',
  ];

  useEffect(() => {
    // FIX: Use `number` for interval ID type in browser environments instead of `NodeJS.Timeout`.
    let interval: number;
    if (isLoading && loadingMessage.includes('video')) {
      let index = 0;
      setLoadingMessage(videoLoadingMessages[index]);
      interval = setInterval(() => {
        index = (index + 1) % videoLoadingMessages.length;
        setLoadingMessage(videoLoadingMessages[index]);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isLoading, loadingMessage]);

  const handleGenerate = useCallback(async (inputs: UserInputs) => {
    setIsLoading(true);
    setError(null);
    setResults(null);
    setLoadingMessage(inputs.creativeType === 'Video' ? videoLoadingMessages[0] : 'Generating image creatives...');
    
    try {
      const generatedResults = await generateAdCreatives(inputs);
      setResults(generatedResults);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred. Please check your API key and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-brand-dark text-brand-light font-sans">
      <main className="container mx-auto px-4 py-8 md:py-12">
        <header className="text-center mb-10">
          <div className="flex items-center justify-center gap-4 mb-2">
            <IconLogo className="w-12 h-12 text-brand-primary" />
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-brand-gradient-from via-brand-primary to-brand-secondary">
              Meta Creative Builder
            </h1>
          </div>
          <p className="text-lg text-brand-subtle max-w-2xl mx-auto">
            Generate high-performing, policy-compliant ad creatives in seconds with AI.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <CreativeForm onGenerate={handleGenerate} isLoading={isLoading} />
          </div>
          <div className="lg:col-span-8">
            <ResultsDisplay isLoading={isLoading} loadingMessage={loadingMessage} results={results} error={error} />
          </div>
        </div>
        
        <footer className="text-center mt-16 text-brand-subtle text-sm">
          <p>&copy; {new Date().getFullYear()} Meta Creative Builder. AI-powered for peak performance.</p>
        </footer>
      </main>
    </div>
  );
};

export default App;