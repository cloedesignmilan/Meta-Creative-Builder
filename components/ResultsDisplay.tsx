
import React from 'react';
import type { AdCreative } from '../types';
import { IconCopy, IconDownload } from './IconComponents';

interface ResultsDisplayProps {
  isLoading: boolean;
  loadingMessage: string;
  results: AdCreative[] | null;
  error: string | null;
}

const LoadingState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center bg-brand-gray/50 rounded-xl p-8">
    <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-6"></div>
    <p className="text-xl font-semibold text-white">{message}</p>
    <p className="text-brand-subtle mt-2">AI is crafting your high-performance creatives...</p>
  </div>
);

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center bg-brand-gray/50 rounded-xl p-8 border-2 border-dashed border-white/10">
    <div className="text-6xl mb-4">✨</div>
    <h3 className="text-2xl font-bold text-white">Your Creatives Await</h3>
    <p className="text-brand-subtle mt-2 max-w-sm">Fill out the form to generate your Meta ad creatives. Your results will appear here.</p>
  </div>
);

const ErrorState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center bg-red-900/30 rounded-xl p-8 border-2 border-red-500">
    <div className="text-6xl mb-4">⚠️</div>
    <h3 className="text-2xl font-bold text-white">An Error Occurred</h3>
    <p className="text-red-300 mt-2 max-w-md">{message}</p>
  </div>
);

const CreativeCard: React.FC<{ creative: AdCreative }> = ({ creative }) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
        // can add a toast notification here
    });
  };

  return (
    <div className="bg-brand-gray rounded-xl overflow-hidden border border-white/10 shadow-lg transition-all hover:shadow-2xl hover:border-brand-primary/50">
      <div className="relative aspect-square bg-brand-dark">
        {creative.type === 'Image' ? (
          <img src={creative.url} alt={creative.variation} className="w-full h-full object-cover" />
        ) : (
          <video src={creative.url} controls loop muted playsInline className="w-full h-full object-cover"></video>
        )}
        <div className="absolute top-2 right-2 flex gap-2">
            <span className="bg-black/50 text-white text-xs font-semibold px-2 py-1 rounded-full backdrop-blur-sm">{creative.variation}</span>
            <a href={creative.url} download={`${creative.variation}.` + (creative.type === 'Image' ? 'jpg' : 'mp4')} className="bg-brand-primary p-2 rounded-full text-white hover:bg-opacity-80 transition">
                <IconDownload className="w-4 h-4" />
            </a>
        </div>
      </div>
      <div className="p-4">
        <div className="mb-3">
          <p className="text-xs text-brand-subtle font-semibold uppercase">Headline</p>
          <div className="flex justify-between items-start gap-2">
            <p className="text-white font-semibold">{creative.copy.headline}</p>
            <button onClick={() => copyToClipboard(creative.copy.headline)} className="text-brand-subtle hover:text-white p-1 flex-shrink-0"><IconCopy className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="mb-3">
          <p className="text-xs text-brand-subtle font-semibold uppercase">Primary Text</p>
           <div className="flex justify-between items-start gap-2">
            <p className="text-brand-light text-sm">{creative.copy.primaryText}</p>
            <button onClick={() => copyToClipboard(creative.copy.primaryText)} className="text-brand-subtle hover:text-white p-1 flex-shrink-0"><IconCopy className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="mt-4">
          <button className="w-full bg-brand-secondary text-brand-dark font-bold py-2 rounded-lg text-sm">{creative.copy.cta}</button>
        </div>
      </div>
    </div>
  );
};

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ isLoading, loadingMessage, results, error }) => {
  if (isLoading) {
    return <LoadingState message={loadingMessage} />;
  }
  if (error) {
    return <ErrorState message={error} />;
  }
  if (!results) {
    return <EmptyState />;
  }

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6 text-white">Generated Creatives</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {results.map((creative) => (
          <CreativeCard key={creative.id} creative={creative} />
        ))}
      </div>
    </div>
  );
};