
export enum SplitType {
  EMPTY_LINE = 'EMPTY_LINE',
  DASHES = 'DASHES',
  SLIDE_N = 'SLIDE_N'
}

export enum AspectRatio {
  PORTRAIT = '1080x1350',
  SQUARE = '1080x1080'
}

export enum Alignment {
  LEFT = 'left',
  CENTER = 'center',
  JUSTIFY = 'justify'
}

export enum NickPosition {
  BOTTOM_LEFT = 'BOTTOM_LEFT',
  BOTTOM_RIGHT = 'BOTTOM_RIGHT',
  TOP_RIGHT = 'TOP_RIGHT',
  TOP_CENTER = 'TOP_CENTER',
  TOP_LEFT = 'TOP_LEFT'
}

export enum TemplateId {
  COLOR = 'COLOR',
  IMAGE = 'IMAGE',
  GRADIENT = 'GRADIENT',
  MINIMAL = 'MINIMAL'
}

export interface SlideData {
  id: number;
  text: string;
}

export interface DesignConfig {
  templateId: TemplateId;
  customColor: string;
  bgImageUrl: string | null;
  alignment: Alignment;
  fontPair: {
    header: string;
    body: string;
    isCustom?: boolean;
  };
  nickname: string;
  avatarUrl: string | null;
  nickPosition: NickPosition;
  numbering: {
    enabled: boolean;
    position: 'top-right' | 'bottom-right';
  };
  sizes: {
    first: AspectRatio;
    middle: AspectRatio;
    last: AspectRatio;
  };
}
