
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
  TOP_LEFT = 'Вверху слева',
  TOP_CENTER = 'Вверху по центру',
  TOP_RIGHT = 'Вверху справа',
  BOTTOM_LEFT = 'Внизу слева',
  BOTTOM_CENTER = 'Внизу по центру',
  BOTTOM_RIGHT = 'Внизу справа'
}

export enum SlideFormat {
  NORMAL = 'Обычный пост',
  PLAN = 'Пост-план',
  LIST = 'Пост-список',
  POINT_EXPLAIN = 'Пункт + пояснение'
}

export interface FinalSlideConfig {
  enabled: boolean;
  textBefore: string;
  codeWord: string;
  textAfter: string;
  blogDescription: string;
  codeWordY: number; 
  avatarY: number;   
  codeWordVerticalOffset: number; // New field: 0-100%
}

export interface DesignConfig {
  splitType: SplitType;
  format: SlideFormat;
  customColor: string;
  textColor: string;
  bgImageUrl: string | null;
  alignment: Alignment;
  fontPair: {
    name: string;
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
  fontSizes: {
    first: number;
    middle: number;
    last: number;
    lineHeight: number;
    verticalOffset: number; // 0-100
  };
  finalSlide: FinalSlideConfig;
}

export interface SlideData {
  id: number;
  text: string;
}
