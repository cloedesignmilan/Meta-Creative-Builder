import React, { useState, useCallback } from 'react';
import type { UserInputs } from '../types';
import { CreativeFormat, CreativeType, FontStyle } from '../types';
import { IconUpload, IconLink, IconSparkles } from './IconComponents';

interface CreativeFormProps {
  onGenerate: (inputs: UserInputs) => void;
  isLoading: boolean;
}

const FormSection: React.FC<{ title: string; step: number; children: React.ReactNode }> = ({ title, step, children }) => (
  <div className="mb-6">
    <h3 className="text-lg font-semibold text-brand-light mb-3 flex items-center">
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-primary text-white text-sm font-bold mr-3">{step}</span>
      {title}
    </h3>
    <div className="pl-9">{children}</div>
  </div>
);

export const CreativeForm: React.FC<CreativeFormProps> = ({ onGenerate, isLoading }) => {
  const [productDescription, setProductDescription] = useState('');
  const [productImage, setProductImage] = useState<{ mimeType: string; data: string } | undefined>();
  const [productUrl, setProductUrl] = useState('');
  const [creativeFormat, setCreativeFormat] = useState<CreativeFormat>(CreativeFormat.SQUARE);
  const [creativeType, setCreativeType] = useState<CreativeType>(CreativeType.IMAGE);
  const [hookText, setHookText] = useState('');
  const [fontStyle, setFontStyle] = useState<FontStyle>(FontStyle.MODERN);


  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let { width, height } = img;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error("Could not get canvas context");
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to JPEG for wide compatibility and parse the result
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const match = dataUrl.match(/^data:(image\/jpeg);base64,(.*)$/);

        if (match && match[1] && match[2]) {
          setProductImage({ mimeType: match[1], data: match[2] });
        } else {
          console.error("Could not parse converted image data URL");
        }
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    let desc = productDescription;
    if (!productDescription && !productUrl && !productImage) {
      desc = "Crea creative effetto wow per pubblicità professionale e iperealistica";
    }

    onGenerate({
      productDescription: desc,
      productImage,
      productUrl,
      creativeFormat,
      creativeType,
      hookText,
      fontStyle,
    });
  }, [onGenerate, productDescription, productImage, productUrl, creativeFormat, creativeType, hookText, fontStyle]);
  

  return (
    <form onSubmit={handleSubmit} className="bg-brand-gray p-6 rounded-xl border border-white/10 shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-white">Creative Setup</h2>
      
      <FormSection title="Describe Your Product" step={1}>
        <div className="space-y-4">
            <textarea
                className="w-full bg-brand-dark border border-white/20 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-brand-primary focus:outline-none transition"
                rows={4}
                placeholder="e.g., Eco-friendly, reusable coffee cup..."
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
            />
            <div className="relative">
                <IconLink className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-subtle" />
                <input
                    type="text"
                    className="w-full bg-brand-dark border border-white/20 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-brand-primary focus:outline-none transition"
                    placeholder="Or enter product URL"
                    value={productUrl}
                    onChange={(e) => setProductUrl(e.target.value)}
                />
            </div>
             <label htmlFor="image-upload" className="w-full bg-brand-dark border border-dashed border-white/20 rounded-lg px-4 py-3 text-brand-subtle hover:border-brand-primary hover:text-white transition cursor-pointer flex items-center justify-center gap-2">
                <IconUpload className="w-5 h-5" />
                <span>{productImage ? "Change product image" : "Upload product image"}</span>
            </label>
            <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            {productImage && (
                <div className="p-2 bg-brand-dark rounded-lg border border-white/20">
                    <img src={`data:${productImage.mimeType};base64,${productImage.data}`} alt="Product preview" className="rounded w-full object-contain max-h-36" />
                    <button type="button" onClick={() => setProductImage(undefined)} className="w-full text-center text-xs text-red-400 hover:text-red-300 mt-2">
                        Remove Image
                    </button>
                </div>
            )}
        </div>
      </FormSection>

      <FormSection title="Select Format" step={2}>
        <div className="grid grid-cols-3 gap-2">
          {Object.values(CreativeFormat).map(format => (
            <button type="button" key={format} onClick={() => setCreativeFormat(format)} className={`px-2 py-2 text-xs md:text-sm rounded-md transition ${creativeFormat === format ? 'bg-brand-primary text-white font-semibold' : 'bg-brand-dark hover:bg-white/10'}`}>
              {format.split(' ')[0]}
            </button>
          ))}
        </div>
      </FormSection>

      <FormSection title="Select Creative Type" step={3}>
        <div className="grid grid-cols-2 gap-2">
            {Object.values(CreativeType).map(type => (
                <button type="button" key={type} onClick={() => setCreativeType(type)} className={`px-3 py-2 rounded-md transition font-semibold ${creativeType === type ? 'bg-brand-secondary text-brand-dark' : 'bg-brand-dark hover:bg-white/10'}`}>
                {type}
                </button>
            ))}
        </div>
      </FormSection>

      <FormSection title="Add Text Overlay (Optional)" step={4}>
         <input
            type="text"
            className="w-full bg-brand-dark border border-white/20 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-brand-primary focus:outline-none transition mb-3"
            placeholder="e.g., 50% Off Today!"
            value={hookText}
            onChange={(e) => setHookText(e.target.value)}
        />
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {Object.values(FontStyle).map(style => (
                <button type="button" key={style} onClick={() => setFontStyle(style)} className={`px-2 py-2 text-xs rounded-md transition ${fontStyle === style ? 'bg-brand-primary text-white font-semibold' : 'bg-brand-dark hover:bg-white/10'}`}>
                    {style}
                </button>
            ))}
        </div>
      </FormSection>

      <button type="submit" disabled={isLoading} className="w-full mt-4 bg-gradient-to-r from-brand-gradient-from via-brand-primary to-brand-secondary text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Generating...</span>
          </>
        ) : (
          <>
           <IconSparkles className="w-5 h-5" />
           <span>Generate Creatives</span>
          </>
        )}
      </button>
    </form>
  );
};