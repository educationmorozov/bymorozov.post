
import { SlideData, DesignConfig, Alignment, NickPosition, AspectRatio, SlideFormat } from '../types.ts';

export const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

interface TextPart {
  text: string;
  bold: boolean;
  color: string | null;
}

const parseRichText = (text: string, format?: SlideFormat): TextPart[] => {
  const parts: TextPart[] = [];
  
  let processedText = text;
  if (format === SlideFormat.PLAN) {
    processedText = text.split('\n').map(line => {
      const regex = /^(шаг|день)\s*\d+/i;
      const match = line.match(regex);
      if (match) {
        return `*${match[0]}*${line.substring(match[0].length)}`;
      }
      return line;
    }).join('\n');
  }

  const regex = /(\*[^*]+\*|\[[^\]]+\]\(#[a-fA-F0-9]{3,6}\))/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(processedText)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: processedText.substring(lastIndex, match.index), bold: false, color: null });
    }
    const m = match[0];
    if (m.startsWith('*')) {
      parts.push({ text: m.slice(1, -1), bold: true, color: null });
    } else {
      const colorMatch = /\[([^\]]+)\]\(#([a-fA-F0-9]{3,6})\)/.exec(m);
      if (colorMatch) {
        parts.push({ text: colorMatch[1], bold: false, color: `#${colorMatch[2]}` });
      }
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < processedText.length) {
    parts.push({ text: processedText.substring(lastIndex), bold: false, color: null });
  }
  return parts;
};

const getWrappedLines = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
  lineHeightScale: number,
  format?: SlideFormat
) => {
  const paragraphs = text.split('\n');
  const allLines: { parts: TextPart[]; isParagraphEnd?: boolean }[] = [];
  
  paragraphs.forEach((p, pIdx) => {
    const parts = parseRichText(p, format);
    let currentLineParts: TextPart[] = [];
    let currentLineWidth = 0;

    parts.forEach((part) => {
      ctx.font = `${part.bold ? '700' : '400'} ${fontSize}px "${fontFamily}"`;
      const words = part.text.split(' ');

      words.forEach((word, idx) => {
        const wordWithSpace = (idx === 0 && currentLineParts.length === 0) ? word : ' ' + word;
        const wordWidth = ctx.measureText(wordWithSpace).width;

        if (currentLineWidth + wordWidth > maxWidth && currentLineParts.length > 0) {
          allLines.push({ parts: currentLineParts });
          currentLineParts = [{ ...part, text: word }];
          currentLineWidth = ctx.measureText(word).width;
        } else {
          currentLineParts.push({ ...part, text: wordWithSpace });
          currentLineWidth += wordWidth;
        }
      });
    });
    if (currentLineParts.length > 0) {
      allLines.push({ parts: currentLineParts, isParagraphEnd: pIdx < paragraphs.length - 1 });
    }
  });

  let totalHeight = 0;
  allLines.forEach((l) => {
    totalHeight += fontSize * lineHeightScale;
    if (l.isParagraphEnd && format === SlideFormat.PLAN) {
      totalHeight += fontSize * (lineHeightScale - 1); 
    }
  });

  return { lines: allLines, totalHeight };
};

export const renderSlideToCanvas = async (
  canvas: HTMLCanvasElement,
  slide: SlideData | null,
  totalSlides: number,
  config: DesignConfig,
  isFinal: boolean = false
): Promise<boolean> => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  const width = canvas.width;
  const height = canvas.height;
  const safeMargin = 130;
  const maxWidth = width - safeMargin * 2;

  ctx.fillStyle = config.customColor;
  ctx.fillRect(0, 0, width, height);

  if (config.bgImageUrl) {
    try {
      const img = new Image();
      img.src = config.bgImageUrl;
      await new Promise((r, j) => { img.onload = r; img.onerror = j; });
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.drawImage(img, 0, 0, width, height);
      ctx.restore();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, width, height);
    } catch (e) {}
  }

  if (isFinal) {
    await renderFinalSlide(ctx, width, height, safeMargin, config);
  } else if (slide) {
    const isFirst = slide.id === 1;
    let textToRender = slide.text;
    let headerText = '';

    if (config.format === SlideFormat.POINT_EXPLAIN) {
      const splitIdx = slide.text.search(/[.!\n]/);
      if (splitIdx !== -1) {
        headerText = slide.text.substring(0, splitIdx + 1).trim();
        textToRender = slide.text.substring(splitIdx + 1).trim();
      } else {
        headerText = slide.text;
        textToRender = "";
      }
    }

    const activeFont = isFirst ? config.fontPair.header : config.fontPair.body;
    const bodyFont = config.fontPair.body;
    const lineHeightScale = config.fontSizes.lineHeight;
    
    let baseFontSize = isFirst ? config.fontSizes.first : config.fontSizes.middle;
    const minFontSize = 30;
    
    if (headerText) {
      const headSize = baseFontSize * 1.35;
      ctx.font = `700 ${headSize}px "${config.fontPair.header}"`;
      const headLayout = getWrappedLines(ctx, headerText, maxWidth, headSize, config.fontPair.header, 1.25);
      const bodyLayout = getWrappedLines(ctx, textToRender, maxWidth, baseFontSize, bodyFont, lineHeightScale, config.format);
      
      const totalH = headLayout.totalHeight + 50 + bodyLayout.totalHeight;
      let curY = (height * config.fontSizes.verticalOffset / 100) - (totalH / 2);

      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      headLayout.lines.forEach(l => {
        ctx.fillStyle = config.textColor;
        ctx.fillText(l.parts.map(p => p.text).join(''), width / 2, curY);
        curY += headSize * 1.25;
      });
      curY += 50;
      
      bodyLayout.lines.forEach(l => {
        let lx = config.alignment === Alignment.CENTER ? width / 2 : safeMargin;
        if (config.alignment === Alignment.CENTER) {
          ctx.textAlign = 'center';
          ctx.fillText(l.parts.map(p => p.text).join(''), lx, curY);
        } else {
          ctx.textAlign = 'left';
          let tempX = lx;
          l.parts.forEach(p => {
             ctx.font = `${p.bold ? '700' : '400'} ${baseFontSize}px "${bodyFont}"`;
             ctx.fillStyle = p.color || config.textColor;
             ctx.fillText(p.text, tempX, curY);
             tempX += ctx.measureText(p.text).width;
          });
        }
        curY += baseFontSize * lineHeightScale;
        if (l.isParagraphEnd && config.format === SlideFormat.PLAN) curY += baseFontSize * (lineHeightScale - 1);
      });
    } else {
      let finalLayout: any = null;
      while (baseFontSize >= minFontSize) {
        const layout = getWrappedLines(ctx, textToRender, maxWidth, baseFontSize, activeFont, lineHeightScale, config.format);
        if (layout.totalHeight <= height - safeMargin * 3) {
          finalLayout = layout;
          break;
        }
        baseFontSize -= 2;
      }
      if (!finalLayout) finalLayout = getWrappedLines(ctx, textToRender, maxWidth, minFontSize, activeFont, lineHeightScale, config.format);

      const lineHeight = baseFontSize * lineHeightScale;
      let y = (height * config.fontSizes.verticalOffset / 100) - (finalLayout.totalHeight / 2);

      ctx.textBaseline = 'top';
      finalLayout.lines.forEach((line: any) => {
        let x = config.alignment === Alignment.CENTER ? width / 2 : safeMargin;
        let lineWidth = 0;
        
        if (config.alignment !== Alignment.LEFT) {
          line.parts.forEach((p: TextPart) => {
            ctx.font = `${p.bold ? '700' : '400'} ${baseFontSize}px "${activeFont}"`;
            lineWidth += ctx.measureText(p.text).width;
          });
          if (config.alignment === Alignment.CENTER) x -= lineWidth / 2;
        }
        ctx.textAlign = 'left';

        line.parts.forEach((p: TextPart) => {
          ctx.font = `${p.bold ? '700' : '400'} ${baseFontSize}px "${activeFont}"`;
          ctx.fillStyle = p.color || config.textColor;
          ctx.fillText(p.text, x, y);
          x += ctx.measureText(p.text).width;
        });
        y += lineHeight;
        if (line.isParagraphEnd && config.format === SlideFormat.PLAN) y += baseFontSize * (lineHeightScale - 1);
      });
    }
  }

  if (!isFinal) {
    await drawBranding(ctx, width, height, safeMargin, config);
    if (config.numbering.enabled) {
      drawNumbering(ctx, width, height, safeMargin, `${slide?.id}/${totalSlides}`, config);
    }
  }

  return true;
};

const renderFinalSlide = async (ctx: CanvasRenderingContext2D, width: number, height: number, margin: number, config: DesignConfig) => {
  const f = config.finalSlide;
  const textColor = config.textColor;
  const activeFont = config.fontPair.body;
  const headerFont = config.fontPair.header;
  const maxWidth = width - margin * 2;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Higher center to avoid collision with branding
  const mainY = height * 0.38;
  
  // 1. Text Before
  const fontSizeBefore = width * 0.045;
  ctx.font = `400 ${fontSizeBefore}px "${activeFont}"`;
  const beforeLayout = getWrappedLines(ctx, f.textBefore, maxWidth, fontSizeBefore, activeFont, 1.3);
  let curBeforeY = mainY - 140 - beforeLayout.totalHeight / 2;
  beforeLayout.lines.forEach(l => {
    ctx.fillStyle = textColor;
    ctx.fillText(l.parts.map(p => p.text).join(''), width / 2, curBeforeY);
    curBeforeY += fontSizeBefore * 1.3;
  });

  // 2. Code Word
  ctx.font = `900 ${width * 0.08}px "${headerFont}"`;
  const codeWord = f.codeWord.toUpperCase();
  const metrics = ctx.measureText(codeWord);
  const paddingH = 70, rectH = width * 0.13;
  const rectW = Math.min(metrics.width + paddingH * 2, maxWidth);

  ctx.strokeStyle = textColor; ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(width/2 - rectW/2, mainY - rectH/2, rectW, rectH, rectH/2);
  ctx.stroke();
  ctx.fillText(codeWord, width/2, mainY);

  // 3. Text After
  const fontSizeAfter = width * 0.045;
  ctx.font = `400 ${fontSizeAfter}px "${activeFont}"`;
  const afterLayout = getWrappedLines(ctx, f.textAfter, maxWidth, fontSizeAfter, activeFont, 1.3);
  let curAfterY = mainY + 140 - afterLayout.totalHeight / 2;
  afterLayout.lines.forEach(l => {
    ctx.fillStyle = textColor;
    ctx.fillText(l.parts.map(p => p.text).join(''), width / 2, curAfterY);
    curAfterY += fontSizeAfter * 1.3;
  });

  // 4. Improved Branding at the bottom
  const footerY = height - margin - 110; // Anchored slightly lower
  const avatarSize = 135;
  const avatarX = margin;
  const textXStart = avatarX + avatarSize + 35;
  const textMaxWidth = width - textXStart - margin;

  const nickname = config.nickname || '@account';
  const desc = f.blogDescription || "подписывайся!";
  
  ctx.font = `400 ${width * 0.038}px "${activeFont}"`;
  const descLines: string[] = [];
  const words = desc.split(' ');
  let currentLine = '';
  for(let word of words) {
    const testLine = currentLine + (currentLine === '' ? '' : ' ') + word;
    if (ctx.measureText(testLine).width < textMaxWidth) {
      currentLine = testLine;
    } else {
      descLines.push(currentLine);
      currentLine = word;
    }
  }
  descLines.push(currentLine);

  const nickFontSize = width * 0.05;
  const descFontSize = width * 0.038;
  const descLineHeight = descFontSize * 1.3;
  const totalTextH = nickFontSize + (descLines.length * descLineHeight) + 10;
  
  // Center block vertically relative to avatar center
  const avatarCenterY = footerY;
  const textTopY = avatarCenterY - totalTextH / 2;

  // Draw Avatar
  if (config.avatarUrl) {
    try {
      const img = new Image(); img.src = config.avatarUrl;
      await new Promise((r, j) => { img.onload = r; img.onerror = j; });
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize/2, avatarCenterY, avatarSize/2, 0, Math.PI * 2);
      ctx.clip();
      
      const aspect = img.width / img.height;
      let drawW = avatarSize, drawH = avatarSize;
      let drawX = avatarX, drawY = avatarCenterY - avatarSize/2;
      
      if (aspect > 1) { drawW = avatarSize * aspect; drawX = (avatarX + avatarSize/2) - drawW/2; }
      else if (aspect < 1) { drawH = avatarSize / aspect; drawY = avatarCenterY - drawH/2; }
      
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
    } catch (e) {}
  }

  // Draw Text aligned with blue lines style
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = textColor;
  
  ctx.font = `700 ${nickFontSize}px "${activeFont}"`;
  ctx.fillText(nickname, textXStart, textTopY);
  
  ctx.font = `400 ${descFontSize}px "${activeFont}"`;
  descLines.forEach((line, i) => {
    ctx.fillText(line, textXStart, textTopY + nickFontSize + 10 + (i * descLineHeight));
  });
};

const drawBranding = async (ctx: CanvasRenderingContext2D, width: number, height: number, margin: number, config: DesignConfig) => {
  let x = margin, y = height - margin;
  const avatarRadius = 35;
  const spacing = 18;
  ctx.textAlign = 'left';

  switch (config.nickPosition) {
    case NickPosition.TOP_LEFT: x = margin; y = margin; break;
    case NickPosition.TOP_CENTER: x = width/2; y = margin; ctx.textAlign = 'center'; break;
    case NickPosition.TOP_RIGHT: x = width - margin; y = margin; ctx.textAlign = 'right'; break;
    case NickPosition.BOTTOM_LEFT: x = margin; y = height - margin; break;
    case NickPosition.BOTTOM_CENTER: x = width/2; y = height - margin; ctx.textAlign = 'center'; break;
    case NickPosition.BOTTOM_RIGHT: x = width - margin; y = height - margin; ctx.textAlign = 'right'; break;
  }

  const nickname = config.nickname || '@account';
  ctx.font = `700 ${width * 0.032}px "${config.fontPair.body}"`;
  const nickWidth = ctx.measureText(nickname).width;
  
  if (config.avatarUrl) {
    try {
      const img = new Image(); img.src = config.avatarUrl;
      await new Promise((r, j) => { img.onload = r; img.onerror = j; });
      
      let finalAvatarX = x;
      if (ctx.textAlign === 'center') {
        const totalW = avatarRadius * 2 + spacing + nickWidth;
        finalAvatarX = x - totalW/2 + avatarRadius;
      } else if (ctx.textAlign === 'right') {
        finalAvatarX = x - nickWidth - spacing - avatarRadius;
      } else {
        finalAvatarX = x + avatarRadius;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(finalAvatarX, y, avatarRadius, 0, Math.PI * 2);
      ctx.clip();
      
      const aspect = img.width / img.height;
      let drawW = avatarRadius * 2, drawH = avatarRadius * 2;
      let drawX = finalAvatarX - avatarRadius, drawY = y - avatarRadius;
      if (aspect > 1) { drawW = avatarRadius * 2 * aspect; drawX = finalAvatarX - drawW/2; }
      else if (aspect < 1) { drawH = avatarRadius * 2 / aspect; drawY = y - drawH/2; }

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
      
      ctx.fillStyle = config.textColor;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(nickname, finalAvatarX + avatarRadius + spacing, y);
    } catch (e) {
      ctx.fillStyle = config.textColor;
      ctx.fillText(nickname, x, y);
    }
  } else {
    ctx.fillStyle = config.textColor;
    ctx.textBaseline = 'middle';
    ctx.fillText(nickname, x, y);
  }
};

const drawNumbering = (ctx: CanvasRenderingContext2D, width: number, height: number, margin: number, text: string, config: DesignConfig) => {
  ctx.font = `400 ${width * 0.025}px "${config.fontPair.body}"`;
  ctx.fillStyle = config.textColor;
  ctx.globalAlpha = 0.45;
  ctx.textAlign = 'right';
  ctx.fillText(text, width - margin, height - margin);
  ctx.globalAlpha = 1.0;
};
