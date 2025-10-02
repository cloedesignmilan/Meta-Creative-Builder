
export enum CreativeFormat {
  SQUARE = "1080x1080 (Square)",
  HORIZONTAL = "1920x1080 (Horizontal)",
  VERTICAL = "1080x1920 (Vertical/Reels)",
}

export enum CreativeType {
  IMAGE = "Image",
  VIDEO = "Video",
}

export enum FontStyle {
    MODERN = "Modern",
    BOLD = "Bold",
    HANDWRITTEN = "Handwritten",
    ELEGANT = "Elegant",
    PLAYFUL = "Playful",
}

export interface UserInputs {
  productDescription: string;
  productImage?: {
    mimeType: string;
    data: string; // base64 encoded
  };
  productUrl?: string;
  creativeFormat: CreativeFormat;
  creativeType: CreativeType;
  hookText?: string;
  fontStyle?: FontStyle;
}

export interface AdCopy {
  headline: string;
  primaryText: string;
  cta: string;
}

export interface AdCreative {
  id: string;
  url: string; // base64 data URL for images, or downloadable URL for videos
  type: CreativeType;
  copy: AdCopy;
  variation: string;
}