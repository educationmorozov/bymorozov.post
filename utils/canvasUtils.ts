
import { SlideData, DesignConfig, Alignment, NickPosition, AspectRatio, SlideFormat, OverlayType } from '../types.ts';

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

  const bgUrl = slide?.bgImageUrl || config.bgImageUrl;
  const overlayType = slide?.overlayType || OverlayType.FULL;
  const overlayIntensity = (slide?.overlayIntensity ?? 45) / 100;

  if (bgUrl) {
    try {
      const img = new Image();
      img.src = bgUrl;
      await new Promise((r, j) => { img.onload = r; img.onerror = j; });
      
      ctx.save();
      
      // Object-fit Cover logic
      const scale = Math.max(width / img.width, height / img.height);
      const x = (width / 2) - (img.width / 2) * scale;
      const y = (height / 2) - (img.height / 2) * scale;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      
      ctx.restore();

      // Apply Overlay
      if (overlayType === OverlayType.FULL) {
        ctx.fillStyle = `rgba(0,0,0,${overlayIntensity})`;
        ctx.fillRect(0, 0, width, height);
      } else if (overlayType === OverlayType.TOP) {
        const offset = (slide?.overlayOffset ?? 50) / 100;
        const grad = ctx.createLinearGradient(0, 0, 0, height * offset * 1.4);
        grad.addColorStop(0, `rgba(0,0,0,${overlayIntensity})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (overlayType === OverlayType.BOTTOM) {
        const offset = (slide?.overlayOffset ?? 50) / 100;
        const grad = ctx.createLinearGradient(0, height * (1 - offset * 1.4), 0, height);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, `rgba(0,0,0,${overlayIntensity})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (overlayType === OverlayType.BOTH) {
        // Top gradient
        const gradTop = ctx.createLinearGradient(0, 0, 0, height * 0.4);
        gradTop.addColorStop(0, `rgba(0,0,0,${overlayIntensity})`);
        gradTop.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradTop;
        ctx.fillRect(0, 0, width, height * 0.5);
        
        // Bottom gradient
        const gradBottom = ctx.createLinearGradient(0, height * 0.6, 0, height);
        gradBottom.addColorStop(0, 'rgba(0,0,0,0)');
        gradBottom.addColorStop(1, `rgba(0,0,0,${overlayIntensity})`);
        ctx.fillStyle = gradBottom;
        ctx.fillRect(0, height * 0.5, width, height * 0.5);
      }
    } catch (e) {}
  }

  if (isFinal) {
    await renderFinalSlide(ctx, width, height, safeMargin, config);
  } else if (slide) {
    const isFirst = slide.id === 1;
    let textToRender = slide.text;
    let headerText = '';

    // Branding Avoidance Logic
    const brandingHeight = 180; // Approximate height needed for branding
    let topAvoidance = 0;
    let bottomAvoidance = 0;

    if (config.nickPosition.startsWith('Вверху')) {
      topAvoidance = brandingHeight;
    } else if (config.nickPosition.startsWith('Внизу')) {
      bottomAvoidance = brandingHeight;
    }

    const availableHeight = height - (safeMargin * 2) - topAvoidance - bottomAvoidance;
    const textStartYLimit = safeMargin + topAvoidance;
    const textEndYLimit = height - safeMargin - bottomAvoidance;

    if (config.format === SlideFormat.POINT_EXPLAIN) {
      const firstDelimiter = slide.text.search(/[.!\n]/);
      if (firstDelimiter !== -1) {
        let firstPart = slide.text.substring(0, firstDelimiter + 1).trim();
        // Check if just a number or step
        const isJustNumber = /^\d+[\.\)]?$/.test(firstPart);
        
        if (isJustNumber && !isFirst) {
          const secondPartStart = firstDelimiter + 1;
          const secondDelimiter = slide.text.substring(secondPartStart).search(/[.!\n]/);
          if (secondDelimiter !== -1) {
            const splitIdx = secondPartStart + secondDelimiter + 1;
            headerText = slide.text.substring(0, splitIdx).trim();
            textToRender = slide.text.substring(splitIdx).trim();
          } else {
            headerText = slide.text;
            textToRender = "";
          }
        } else {
          headerText = firstPart;
          textToRender = slide.text.substring(firstDelimiter + 1).trim();
        }
      } else {
        headerText = slide.text;
        textToRender = "";
      }
    }

    const activeFont = isFirst ? config.fontPair.header : config.fontPair.body;
    const headerFont = config.fontPair.header;
    const bodyFont = config.fontPair.body;
    const lineHeightScale = config.fontSizes.lineHeight;
    const isBgEnabled = isFirst ? config.textBackground.enabledFirst : config.textBackground.enabledMiddle;
    
    let baseFontSize = isFirst ? config.fontSizes.first : config.fontSizes.middle;
    const minFontSize = 30;
    
    if (headerText) {
      // POINT_EXPLAIN format logic remains mostly same but we could apply background
      let finalHeadLayout: any = null;
      let finalBodyLayout: any = null;
      let currentFontSize = baseFontSize;

      while (currentFontSize >= minFontSize) {
        const headSize = currentFontSize * 1.3;
        const headLayout = getWrappedLines(ctx, headerText, maxWidth, headSize, headerFont, 1.25);
        const bodyLayout = getWrappedLines(ctx, textToRender, maxWidth, currentFontSize, bodyFont, lineHeightScale, config.format);
        
        const totalH = headLayout.totalHeight + 50 + bodyLayout.totalHeight;
        if (totalH <= availableHeight) {
          finalHeadLayout = headLayout;
          finalBodyLayout = bodyLayout;
          baseFontSize = currentFontSize;
          break;
        }
        currentFontSize -= 2;
      }

      if (!finalHeadLayout) {
        finalHeadLayout = getWrappedLines(ctx, headerText, maxWidth, minFontSize * 1.3, headerFont, 1.25);
        finalBodyLayout = getWrappedLines(ctx, textToRender, maxWidth, minFontSize, bodyFont, lineHeightScale, config.format);
        baseFontSize = minFontSize;
      }

      const headSize = baseFontSize * 1.3;
      const totalH = finalHeadLayout.totalHeight + 50 + finalBodyLayout.totalHeight;
      const startY = Math.max(textStartYLimit, Math.min(textEndYLimit - totalH, (height * config.fontSizes.verticalOffset / 100) - (totalH / 2)));
      let curY = startY;

      if (isBgEnabled) {
        const bg = config.textBackground;
        const padding = bg.padding;
        const radius = bg.borderRadius;
        // Convert hex to rgba with opacity
        const r = parseInt(bg.color.slice(1, 3), 16);
        const g = parseInt(bg.color.slice(3, 5), 16);
        const b = parseInt(bg.color.slice(5, 7), 16);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${bg.opacity / 100})`;
        ctx.beginPath();
        ctx.roundRect(safeMargin - padding, startY - padding, maxWidth + padding * 2, totalH + padding * 2, radius);
        ctx.fill();
      }

      ctx.textBaseline = 'top';
      finalHeadLayout.lines.forEach(l => {
        ctx.font = `700 ${headSize}px "${headerFont}"`;
        ctx.fillStyle = config.textColor;
        let lx = config.alignment === Alignment.CENTER ? width / 2 : safeMargin;
        if (config.alignment === Alignment.CENTER) {
          ctx.textAlign = 'center';
          ctx.fillText(l.parts.map(p => p.text).join(''), lx, curY);
        } else {
          ctx.textAlign = 'left';
          ctx.fillText(l.parts.map(p => p.text).join(''), lx, curY);
        }
        curY += headSize * 1.25;
      });

      curY += 50;
      
      finalBodyLayout.lines.forEach(l => {
        let lx = config.alignment === Alignment.CENTER ? width / 2 : safeMargin;
        if (config.alignment === Alignment.CENTER) {
          ctx.font = `400 ${baseFontSize}px "${bodyFont}"`;
          ctx.textAlign = 'center';
          ctx.fillStyle = config.textColor;
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
      });
    } else if (slide.paragraphs && slide.paragraphs.length > 0) {
      // Individual Paragraph Positioning
      slide.paragraphs.forEach(para => {
        let currentFontSize = baseFontSize;
        let layout = getWrappedLines(ctx, para.text, maxWidth, currentFontSize, activeFont, lineHeightScale, config.format);
        
        while (layout.totalHeight > height * 0.4 && currentFontSize > minFontSize) {
          currentFontSize -= 2;
          layout = getWrappedLines(ctx, para.text, maxWidth, currentFontSize, activeFont, lineHeightScale, config.format);
        }

        const py = Math.max(textStartYLimit, Math.min(textEndYLimit - layout.totalHeight, (height * para.verticalOffset / 100) - (layout.totalHeight / 2)));
        
        if (isBgEnabled) {
          const bg = config.textBackground;
          const padding = bg.padding;
          const radius = bg.borderRadius;
          const r = parseInt(bg.color.slice(1, 3), 16);
          const g = parseInt(bg.color.slice(3, 5), 16);
          const b = parseInt(bg.color.slice(5, 7), 16);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${bg.opacity / 100})`;
          ctx.beginPath();
          ctx.roundRect(safeMargin - padding, py - padding, maxWidth + padding * 2, layout.totalHeight + padding * 2, radius);
          ctx.fill();
        }

        ctx.textBaseline = 'top';
        let lineY = py;
        layout.lines.forEach((line: any) => {
          let x = config.alignment === Alignment.CENTER ? width / 2 : safeMargin;
          if (config.alignment === Alignment.CENTER) {
            ctx.textAlign = 'center';
            ctx.fillStyle = config.textColor;
            ctx.font = `400 ${currentFontSize}px "${activeFont}"`;
            ctx.fillText(line.parts.map((p: any) => p.text).join(''), x, lineY);
          } else {
            ctx.textAlign = 'left';
            let tempX = x;
            line.parts.forEach((p: any) => {
              ctx.font = `${p.bold ? '700' : '400'} ${currentFontSize}px "${activeFont}"`;
              ctx.fillStyle = p.color || config.textColor;
              ctx.fillText(p.text, tempX, lineY);
              tempX += ctx.measureText(p.text).width;
            });
          }
          lineY += currentFontSize * lineHeightScale;
        });
      });
    } else {
      let finalLayout: any = null;
      while (baseFontSize >= minFontSize) {
        const layout = getWrappedLines(ctx, textToRender, maxWidth, baseFontSize, activeFont, lineHeightScale, config.format);
        if (layout.totalHeight <= availableHeight) {
          finalLayout = layout;
          break;
        }
        baseFontSize -= 2;
      }
      if (!finalLayout) finalLayout = getWrappedLines(ctx, textToRender, maxWidth, minFontSize, activeFont, lineHeightScale, config.format);

      const lineHeight = baseFontSize * lineHeightScale;
      const startY = Math.max(textStartYLimit, Math.min(textEndYLimit - finalLayout.totalHeight, (height * config.fontSizes.verticalOffset / 100) - (finalLayout.totalHeight / 2)));
      let y = startY;

      if (isBgEnabled) {
        const bg = config.textBackground;
        const padding = bg.padding;
        const radius = bg.borderRadius;
        const r = parseInt(bg.color.slice(1, 3), 16);
        const g = parseInt(bg.color.slice(3, 5), 16);
        const b = parseInt(bg.color.slice(5, 7), 16);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${bg.opacity / 100})`;
        ctx.beginPath();
        ctx.roundRect(safeMargin - padding, startY - padding, maxWidth + padding * 2, finalLayout.totalHeight + padding * 2, radius);
        ctx.fill();
      }

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
  
  const mainY = height * (f.codeWordVerticalOffset / 100);
  const codeWordSpacingBefore = 220; 
  const codeWordSpacingAfter = 320; // Increased spacing as requested (2 empty lines feel)
  
  // 1. Text Before
  const fontSizeBefore = width * 0.045;
  ctx.font = `400 ${fontSizeBefore}px "${activeFont}"`;
  const beforeLayout = getWrappedLines(ctx, f.textBefore, maxWidth, fontSizeBefore, activeFont, 1.3);
  let curBeforeY = mainY - codeWordSpacingBefore - beforeLayout.totalHeight / 2;
  beforeLayout.lines.forEach(l => {
    ctx.fillStyle = textColor;
    ctx.fillText(l.parts.map(p => p.text).join(''), width / 2, curBeforeY);
    curBeforeY += fontSizeBefore * 1.3;
  });

  // 2. Code Word
  const codeWordFontSize = width * 0.08;
  ctx.font = `900 ${codeWordFontSize}px "${headerFont}"`;
  const codeWord = f.codeWord.toUpperCase();
  const metrics = ctx.measureText(codeWord);
  
  const paddingH = 100; 
  const rectH = width * 0.22; 
  const rectW = Math.min(metrics.width + paddingH * 2, maxWidth);

  ctx.strokeStyle = textColor; ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.roundRect(width/2 - rectW/2, mainY - rectH/2, rectW, rectH, rectH/2);
  ctx.stroke();
  
  ctx.textBaseline = 'middle';
  ctx.fillText(codeWord, width/2, mainY);

  // 3. Text After
  const fontSizeAfter = width * 0.045;
  ctx.font = `400 ${fontSizeAfter}px "${activeFont}"`;
  const afterLayout = getWrappedLines(ctx, f.textAfter, maxWidth, fontSizeAfter, activeFont, 1.3);
  let curAfterY = mainY + codeWordSpacingAfter - afterLayout.totalHeight / 2;
  afterLayout.lines.forEach(l => {
    ctx.fillStyle = textColor;
    ctx.fillText(l.parts.map(p => p.text).join(''), width / 2, curAfterY);
    curAfterY += fontSizeAfter * 1.3;
  });

  // 4. Branding
  const footerY = height - margin - 100; 
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
  const descLineHeight = descFontSize * 1.4;
  const totalTextH = nickFontSize + (descLines.length * descLineHeight) + 12;
  
  const avatarCenterY = footerY;
  const textTopY = avatarCenterY - totalTextH / 2;

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

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = textColor;
  ctx.font = `700 ${nickFontSize}px "${activeFont}"`;
  ctx.fillText(nickname, textXStart, textTopY);
  ctx.font = `400 ${descFontSize}px "${activeFont}"`;
  descLines.forEach((line, i) => {
    ctx.fillText(line, textXStart, textTopY + nickFontSize + 12 + (i * descLineHeight));
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
