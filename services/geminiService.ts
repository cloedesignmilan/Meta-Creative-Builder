import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { UserInputs, AdCreative, AdCopy } from '../types';
import { CreativeFormat, CreativeType } from '../types';
import { GEMINI_TEXT_MODEL, GEMINI_IMAGE_MODEL, GEMINI_VIDEO_MODEL } from '../constants';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getProductInfo = async (inputs: UserInputs): Promise<string> => {
    if (inputs.productUrl) {
        const prompt = `Act as an expert marketer. Given this product URL: ${inputs.productUrl}, extract the product name and create a concise, compelling description (2-3 sentences) suitable for an ad. Focus on key features and benefits.`;
        const response = await ai.models.generateContent({
            model: GEMINI_TEXT_MODEL,
            contents: prompt,
        });
        return response.text;
    }
    return inputs.productDescription;
};

const generateAdCopy = async (productInfo: string): Promise<AdCopy[]> => {
    const prompt = `
    Based on the following product information, generate 3 unique sets of ad copy (headline, primary text, CTA) for a Meta ad.
    Product Info: "${productInfo}"

    The copy must be conversion-focused, highlight benefits, use positive emotional triggers (trust, curiosity, aspiration), and be fully compliant with Meta policies (NO shocking claims, NO before/after, NO clickbait). The CTA should be strong and clear.
    Return the response as a JSON array.
    `;
    
    const response = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        headline: { type: Type.STRING, description: "A short, catchy headline (max 40 chars)." },
                        primaryText: { type: Type.STRING, description: "Compelling primary text (2-3 sentences)." },
                        cta: { type: Type.STRING, description: "A strong call to action like 'Shop Now' or 'Learn More'." },
                    },
                    required: ["headline", "primaryText", "cta"],
                },
            },
        },
    });

    try {
        return JSON.parse(response.text);
    } catch (e) {
        console.error("Failed to parse ad copy JSON:", response.text);
        throw new Error("Failed to generate valid ad copy.");
    }
};

const getAspectRatio = (format: CreativeFormat): '1:1' | '16:9' | '9:16' => {
    switch(format) {
        case CreativeFormat.SQUARE: return '1:1';
        case CreativeFormat.HORIZONTAL: return '16:9';
        case CreativeFormat.VERTICAL: return '9:16';
        default: return '1:1';
    }
};

const VARIATION_PROMPTS = [
    "Focus on a clean, minimalist aesthetic with a bright, uncluttered background. The product should be the hero.",
    "Show the product in a vibrant, energetic lifestyle scene. Include a human element (e.g., hands using the product).",
    "Create a dynamic, eye-catching composition with bold colors and strong visual hierarchy. Emphasize a key feature."
];

const generateImages = async (inputs: UserInputs, productInfo: string): Promise<string[]> => {
    if (inputs.productImage) {
        // Image Editing workflow: Use the provided image as a base
        const imageEditPrompts = VARIATION_PROMPTS.map(variation => `
            You are an expert ad creative designer. Your task is to edit the provided image to turn it into a high-performing ad creative for Meta platforms.

            **Instructions:**
            1.  **Primary Subject:** The main product in the user's image is the hero. DO NOT alter, replace, or obscure it.
            2.  **Style:** Apply a "${variation}" theme. This means adjusting the background, lighting, and mood accordingly.
            3.  **Product Context:** The product is: "${productInfo}". Use this to inform the style.
            4.  **Text Overlay:** ${inputs.hookText ? `Add the text "${inputs.hookText}" using a professional and highly legible ${inputs.fontStyle} font. Ensure it's well-placed and doesn't cover the main product.` : 'Do not add any text.'}
            5.  **Output:** Return ONLY the edited image. Do not return text explanations.
        `.trim());

        const imagePart = {
            inlineData: {
                mimeType: inputs.productImage.mimeType,
                data: inputs.productImage.data,
            },
        };
        
        const promises = imageEditPrompts.map(prompt => 
            ai.models.generateContent({
                model: 'gemini-2.5-flash-image-preview',
                contents: { parts: [imagePart, { text: prompt }] },
                config: {
                    responseModalities: [Modality.IMAGE, Modality.TEXT],
                },
            })
        );
        
        const responses = await Promise.all(promises);

        const successfulImages = responses.reduce<string[]>((acc, response) => {
            const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
            if (imagePart?.inlineData?.data) {
                acc.push(`data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`);
            } else {
                console.warn("An image editing variation failed to produce an image.", JSON.stringify(response));
            }
            return acc;
        }, []);
        
        if (successfulImages.length === 0) {
            throw new Error("Image editing failed to produce any images. The model may be unable to process the request. Please try a different image or prompt.");
        }

        return successfulImages;

    } else {
        // Text-to-Image workflow: Generate from scratch
        const imagePrompts = VARIATION_PROMPTS.map(variation => `
            A high-resolution, photorealistic image for a Meta ad.
            Subject: "${productInfo}".
            Style: "${variation}".
            ${inputs.creativeFormat === CreativeFormat.VERTICAL ? 'Adapt for Instagram Reels.' : 'Use a clean, premium style.'}
            ${inputs.hookText ? `Include the text "${inputs.hookText}" in a stylish and legible ${inputs.fontStyle} font.` : ''}
            The image must be brand-safe and policy-compliant.
        `.trim());

        const promises = imagePrompts.map(prompt =>
            ai.models.generateImages({
                model: GEMINI_IMAGE_MODEL,
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: getAspectRatio(inputs.creativeFormat),
                },
            })
        );
        
        const responses = await Promise.all(promises);
        return responses.map(res => {
            if (!res.generatedImages || res.generatedImages.length === 0) {
                 console.error("Image generation failed:", res);
                throw new Error("Image generation failed to produce an image. Please try a different prompt.");
            }
            const base64ImageBytes = res.generatedImages[0].image.imageBytes;
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        });
    }
};

const generateVideos = async (inputs: UserInputs, productInfo: string): Promise<string[]> => {
    let videoPrompt: string;
    
    if (inputs.productImage) {
        videoPrompt = `
            Create an 8-15 second looping video ad for Meta.
            Use the provided image as the main subject.
            Animate the product in a dynamic scene based on this description: "${productInfo}".
            The video should be high-energy with an attention-grabbing hook in the first 2 seconds.
            Style: Clean, bright, professional.
            ${inputs.hookText ? `Overlay the text "${inputs.hookText}" in a stylish ${inputs.fontStyle} font.` : ''}
        `.trim();
    } else {
        videoPrompt = `
            Create an 8-15 second looping video ad for Meta.
            Product description: "${productInfo}".
            The video should be high-energy, visually appealing, and feature a motion hook in the first 2 seconds.
            Style: Clean, bright, professional.
            ${inputs.hookText ? `Overlay the text "${inputs.hookText}" in a stylish ${inputs.fontStyle} font.` : ''}
        `.trim();
    }
    
    let operation = await ai.models.generateVideos({
        model: GEMINI_VIDEO_MODEL,
        prompt: videoPrompt,
        ...(inputs.productImage && { image: { imageBytes: inputs.productImage.data, mimeType: inputs.productImage.mimeType } }),
        config: { numberOfVideos: 1 }
    });

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        console.error("Video generation operation completed but returned no video URI.", operation);
        throw new Error("Video generation failed. The model did not return a video. Please try a different prompt or image.");
    }

    // The downloadLink is an API endpoint. We must fetch it to get the video bytes.
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!videoResponse.ok) {
        throw new Error(`Failed to download the generated video: ${videoResponse.statusText}`);
    }

    // Convert the video data to a Blob and create a local URL for the browser to display.
    const videoBlob = await videoResponse.blob();
    const videoUrl = URL.createObjectURL(videoBlob);
    
    return [videoUrl];
};

const proofreadText = async (textToProofread: string, context: string): Promise<string> => {
    if (!textToProofread || !textToProofread.trim()) {
        return textToProofread;
    }
    try {
        const prompt = `
            You are an expert copy editor. Proofread and correct any spelling or grammatical errors in the following text.
            The text is for a marketing creative.
            Product context: "${context}"
            
            Return ONLY the corrected text, without any additional comments, formatting, or quotation marks.
            
            Text to correct: "${textToProofread}"
        `;
        const response = await ai.models.generateContent({
            model: GEMINI_TEXT_MODEL,
            contents: prompt,
        });
        return response.text.trim().replace(/^"|"$/g, '');
    } catch (error) {
        console.warn("Proofreading failed for text, returning original.", error);
        return textToProofread;
    }
};

const proofreadAdCopy = async (adCopies: AdCopy[], context: string): Promise<AdCopy[]> => {
    if (!adCopies || adCopies.length === 0) {
        return adCopies;
    }
    try {
        const prompt = `
            You are an expert copy editor. Proofread and correct any spelling or grammatical errors in the following JSON array of ad copy.
            Maintain the exact original JSON structure.
            The copy is for a marketing creative.
            Product Context: "${context}"

            JSON to correct:
            ${JSON.stringify(adCopies, null, 2)}
        `;
        const response = await ai.models.generateContent({
            model: GEMINI_TEXT_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            headline: { type: Type.STRING, description: "Corrected headline." },
                            primaryText: { type: Type.STRING, description: "Corrected primary text." },
                            cta: { type: Type.STRING, description: "The original Call To Action text (should not be changed)." },
                        },
                        required: ["headline", "primaryText", "cta"],
                    },
                },
            },
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.warn("Proofreading failed for ad copy, returning original.", error);
        return adCopies;
    }
};

export const generateAdCreatives = async (inputs: UserInputs): Promise<AdCreative[]> => {
    const correctedInputs = { ...inputs };

    // 1. Proofread the user's product description if it was provided directly.
    if (!correctedInputs.productUrl && correctedInputs.productDescription) {
        correctedInputs.productDescription = await proofreadText(correctedInputs.productDescription, "A product description for an online ad.");
    }

    // 2. Get the final product info, which may be from a URL or the now-corrected description.
    const productInfo = await getProductInfo(correctedInputs);
    
    // 3. Proofread the hook text using the product info as context.
    if (correctedInputs.hookText) {
        correctedInputs.hookText = await proofreadText(correctedInputs.hookText, productInfo);
    }

    // 4. Generate and proofread ad copy variations.
    const initialAdCopy = await generateAdCopy(productInfo);
    const finalAdCopy = await proofreadAdCopy(initialAdCopy, productInfo);

    if (finalAdCopy.length === 0) {
        throw new Error("Failed to generate ad copy.");
    }
    
    // 5. Generate creatives based on type.
    if (inputs.creativeType === CreativeType.VIDEO) {
        const videoUrls = await generateVideos(correctedInputs, productInfo);
        
        // For video, we generate one video and create a creative with the first ad copy.
        if (videoUrls.length > 0) {
            return [{
                id: crypto.randomUUID(),
                url: videoUrls[0],
                type: CreativeType.VIDEO,
                copy: finalAdCopy[0],
                variation: "Video Creative",
            }];
        }
        return []; // Return empty array if video generation failed.
    } else { // Image creatives
        const imageUrls = await generateImages(correctedInputs, productInfo);
        
        // 6. Combine image variations with ad copy.
        const variationNames = ["Minimalist", "Lifestyle", "Dynamic"];
        
        if (imageUrls.length === 0) {
            throw new Error("Failed to generate images.");
        }

        return imageUrls.map((url, index) => ({
            id: crypto.randomUUID(),
            url: url,
            type: CreativeType.IMAGE,
            copy: finalAdCopy[index % finalAdCopy.length], // Cycle through copy if not enough
            variation: `Variation ${index + 1}: ${variationNames[index % variationNames.length]}`,
        }));
    }
};
