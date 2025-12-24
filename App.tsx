
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ChevronRight, ChevronLeft, Download, ImageIcon, Upload, Eye, RefreshCw, AlignLeft, AlignCenter, AlignJustify, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Camera, Home, Search, Play, User, BarChart2, Zap
} from 'lucide-react';
import JSZip from 'jszip';
import { 
  SplitType, AspectRatio, NickPosition, SlideData, DesignConfig, Alignment, SlideFormat 
} from './types.ts';
import { renderSlideToCanvas, saveBlob } from './utils/canvasUtils.ts';

const FONT_PAIRS = [
  { name: 'Unbounded + Manrope', header: 'Unbounded', body: 'Manrope' },
  { name: 'Montserrat Alternates + Verdana', header: 'Montserrat Alternates', body: 'Verdana' },
  { name: 'DM Sans + Trebuchet MS', header: 'DM Sans', body: 'Trebuchet MS' },
  { name: 'Montserrat + Inter', header: 'Montserrat', body: 'Inter' },
  { name: 'Impact + Manrope', header: 'Impact', body: 'Manrope' },
  { name: 'Свой шрифт', header: 'Inter', body: 'Inter', isCustom: true },
];

const PRESETS = [
  { name: 'Классический черный', bg: '#000000', text: '#ffffff' },
  { name: 'Чистый белый', bg: '#ffffff', text: '#000000' },
  { name: 'Кремовый шоколад', bg: '#EDE0D4', text: '#6B4F4F' },
  { name: 'Благородный бордо', bg: '#55121B', text: '#FEFAEF' },
];

const HEADER_FONTS = ['Unbounded', 'Impact', 'Montserrat', 'Montserrat Alternates', 'Golos Text', 'Inter', 'DM Sans', 'Oswald', 'Rubik Mono One', 'Russo One', 'Kelly Slab', 'Tenor Sans', 'Roboto', 'Ubuntu'];
const BODY_FONTS = ['Inter', 'Manrope', 'Verdana', 'Trebuchet MS', 'Arial', 'Georgia', 'Open Sans', 'Roboto', 'Lato', 'Raleway', 'Ubuntu', 'PT Sans', 'PT Serif', 'Lora', 'Noto Sans'];

const App: React.FC = () => {
  const [step, setStep] = useState(1);
  const [inputText, setInputText] = useState('');
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCustomColor, setShowCustomColor] = useState(false);
  
  const [config, setConfig] = useState<DesignConfig>({
    splitType: SplitType.EMPTY_LINE,
    format: SlideFormat.NORMAL,
    customColor: '#000000',
    textColor: '#ffffff',
    bgImageUrl: null,
    alignment: Alignment.LEFT,
    fontPair: FONT_PAIRS[0],
    nickname: '',
    avatarUrl: null,
    nickPosition: NickPosition.BOTTOM_LEFT,
    numbering: { enabled: true, position: 'bottom-right' },
    sizes: { first: AspectRatio.PORTRAIT, middle: AspectRatio.PORTRAIT, last: AspectRatio.PORTRAIT },
    fontSizes: { first: 64, middle: 64, last: 64, lineHeight: 1.35, verticalOffset: 50 },
    finalSlide: { enabled: true, textBefore: 'Забирай подарок', codeWord: 'АКСЕЛЕРАТОР', textAfter: 'в директ', blogDescription: '', codeWordY: 50, avatarY: 85, codeWordVerticalOffset: 35 }
  });

  const resetAll = () => window.location.reload();

  const parseSlides = useCallback(() => {
    let raw: string[] = [];
    if (config.splitType === SplitType.EMPTY_LINE) raw = inputText.split(/\n\s*\n/);
    else if (config.splitType === SplitType.DASHES) raw = inputText.split(/-{3,}/); // 3 or more dashes
    else raw = inputText.split(/Слайд \d+:|Слайд \d+/i);
    const filtered = raw.map(s => s.trim()).filter(s => s.length > 0).slice(0, 20);
    setSlides(filtered.map((text, i) => ({ id: i + 1, text })));
  }, [inputText, config.splitType]);

  useEffect(() => { parseSlides(); }, [inputText, config.splitType]);

  const handleNicknameChange = (val: string) => {
    let clean = val.toLowerCase().replace(/\s/g, '');
    if (clean.length > 0 && !clean.startsWith('@')) clean = '@' + clean;
    setConfig(c => ({ ...c, nickname: clean }));
  };

  const handleBlogDescChange = (val: string) => {
    setConfig(c => ({ ...c, finalSlide: { ...c.finalSlide, blogDescription: val.toLowerCase() } }));
  };

  const handleCodeWordChange = (val: string) => {
    setConfig(c => ({ ...c, finalSlide: { ...c.finalSlide, codeWord: val.toUpperCase() } }));
  };

  const handleFormatChange = (f: SlideFormat) => {
    setConfig(c => ({
      ...c, 
      format: f,
      alignment: f === SlideFormat.POINT_EXPLAIN ? Alignment.LEFT : c.alignment
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'bg') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'avatar') setConfig(c => ({ ...c, avatarUrl: reader.result as string }));
        else setConfig(c => ({ ...c, bgImageUrl: reader.result as string, customColor: '#000000' }));
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadOne = async (id: number | 'final') => {
    const canvas = document.createElement('canvas');
    const isFinal = id === 'final';
    const slide = isFinal ? null : slides.find(s => s.id === id) || null;
    const size = isFinal ? config.sizes.last : (slide?.id === 1 ? config.sizes.first : config.sizes.middle);
    const [w, h] = size.split('x').map(Number);
    canvas.width = w; canvas.height = h;
    await renderSlideToCanvas(canvas, slide, slides.length + (config.finalSlide.enabled ? 1 : 0), config, isFinal);
    canvas.toBlob((blob) => blob && saveBlob(blob, `carousel_slide_${id}.png`));
  };

  const generateZip = async () => {
    setIsGenerating(true);
    const zip = new JSZip();
    const total = config.finalSlide.enabled ? slides.length + 1 : slides.length;
    for (const slide of slides) {
      const canvas = document.createElement('canvas');
      const size = slide.id === 1 ? config.sizes.first : config.sizes.middle;
      const [w, h] = size.split('x').map(Number);
      canvas.width = w; canvas.height = h;
      await renderSlideToCanvas(canvas, slide, total, config);
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
      if (blob) zip.file(`slide_${slide.id}.png`, blob);
    }
    if (config.finalSlide.enabled) {
      const canvas = document.createElement('canvas');
      const [w, h] = config.sizes.last.split('x').map(Number);
      canvas.width = w; canvas.height = h;
      await renderSlideToCanvas(canvas, null, total, config, true);
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
      if (blob) zip.file(`slide_final.png`, blob);
    }
    const content = await zip.generateAsync({ type: 'blob' });
    saveBlob(content, 'bymorozov_carousel.zip');
    setIsGenerating(false);
  };

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-['Inter']">
      <div className="w-full lg:w-[500px] border-r border-zinc-900 overflow-y-auto flex flex-col bg-[#050505] custom-scrollbar pb-24">
        <header className="p-8 pb-4 text-center border-b border-zinc-900">
          <h1 className="text-3xl font-[900] italic tracking-tighter uppercase leading-none text-white">Акселератор</h1>
          <p className="text-zinc-600 text-[10px] font-bold tracking-[0.6em] uppercase mt-1">bymorozov</p>
        </header>

        <div className="p-6 space-y-6">
          <div className="min-h-[250px]">
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <h2 className="text-xl font-bold uppercase tracking-tight">ШАГ 1: вставьте текст</h2>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Текст слайда 1&#10;&#10;Текст слайда 2..."
                  className="w-full h-40 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:ring-1 focus:ring-white outline-none"
                />
                <div className="grid grid-cols-3 gap-2">
                  {[SplitType.EMPTY_LINE, SplitType.DASHES, SplitType.SLIDE_N].map(st => (
                    <button key={st} onClick={() => setConfig(c => ({...c, splitType: st}))} className={`text-[10px] py-2.5 rounded-xl border transition-all ${config.splitType === st ? 'bg-white text-black font-bold' : 'border-zinc-800 text-zinc-500'}`}>
                      {st === SplitType.EMPTY_LINE ? 'Пустая строка' : st === SplitType.DASHES ? '---' : 'Слайд N'}
                    </button>
                  ))}
                </div>
                <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 space-y-2">
                   <p className="text-[10px] text-zinc-500 font-bold uppercase">Подсказка:</p>
                   <p className="text-[11px] leading-relaxed text-zinc-300">Чтобы сделать текст жирным, заключите его в звездочки: <span className="text-white font-bold">*текст*</span></p>
                   <p className="text-[11px] leading-relaxed text-zinc-300">Чтобы сделать текст цветным, используйте: <span className="text-rose-400 font-bold">[слово](#ff0000)</span></p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <h2 className="text-xl font-bold uppercase tracking-tight">ШАГ 2: выберите формат</h2>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(SlideFormat).map(f => (
                    <button key={f} onClick={() => handleFormatChange(f)} className={`p-4 rounded-xl border text-xs font-bold text-left h-20 transition-all ${config.format === f ? 'bg-white text-black border-white' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>{f}</button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <h2 className="text-xl font-bold uppercase tracking-tight">ШАГ 3: цвета и фон</h2>
                <div className="grid grid-cols-2 gap-2">
                  {PRESETS.map(p => (
                    <button key={p.name} onClick={() => {setConfig(c => ({...c, customColor: p.bg, textColor: p.text})); setShowCustomColor(false);}} className="p-4 rounded-xl border border-zinc-800 text-left h-20 flex flex-col justify-end transition-all" style={{backgroundColor: p.bg}}>
                      <span className="text-[10px] font-bold" style={{color: p.text}}>{p.name}</span>
                    </button>
                  ))}
                  <button onClick={() => setShowCustomColor(!showCustomColor)} className={`p-4 rounded-xl border h-20 text-[10px] font-bold uppercase transition-all ${showCustomColor ? 'bg-white text-black border-white' : 'bg-zinc-900 border-zinc-800'}`}>Свой цвет</button>
                  <label className="p-4 rounded-xl border border-zinc-800 h-20 flex items-center justify-center cursor-pointer hover:bg-zinc-900 bg-zinc-900 transition-all">
                    <span className="text-[10px] font-bold uppercase">Свое фото</span>
                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'bg')} />
                  </label>
                </div>
                {showCustomColor && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-900 rounded-xl border border-zinc-800 animate-in fade-in">
                    <div className="space-y-1.5"><span className="text-[9px] text-zinc-500 font-bold uppercase">HEX Фона</span><input type="text" value={config.customColor} onChange={e => setConfig(c => ({...c, customColor: e.target.value}))} className="w-full bg-black border border-zinc-800 p-2 rounded text-[10px] font-mono text-white" placeholder="#000000" /></div>
                    <div className="space-y-1.5"><span className="text-[9px] text-zinc-500 font-bold uppercase">HEX Текста</span><input type="text" value={config.textColor} onChange={e => setConfig(c => ({...c, textColor: e.target.value}))} className="w-full bg-black border border-zinc-800 p-2 rounded text-[10px] font-mono text-white" placeholder="#FFFFFF" /></div>
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <h2 className="text-xl font-bold uppercase tracking-tight">ШАГ 4: шрифты и верстка</h2>
                <div className="grid grid-cols-2 gap-2">
                  {FONT_PAIRS.map(p => (
                    <button key={p.name} onClick={() => setConfig(c => ({...c, fontPair: p}))} className={`p-4 rounded-xl border text-left flex flex-col h-20 transition-all ${config.fontPair.name === p.name ? 'border-white bg-white/10' : 'border-zinc-800 bg-zinc-900'}`}>
                      <span className="text-[11px] font-bold mb-1" style={{fontFamily: p.header}}>{p.name}</span>
                      <span className="text-[9px] text-zinc-600 opacity-60 mt-auto">АБВГД abcde</span>
                    </button>
                  ))}
                </div>
                {config.fontPair.isCustom && (
                  <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 grid grid-cols-2 gap-4">
                     <div className="space-y-1"><span className="text-[9px] text-zinc-500 uppercase font-bold">Заголовок</span><select value={config.fontPair.header} onChange={e => setConfig(c => ({...c, fontPair: {...c.fontPair, header: e.target.value}}))} className="w-full bg-black border border-zinc-800 p-2 rounded-lg text-[10px] text-white">{HEADER_FONTS.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
                     <div className="space-y-1"><span className="text-[9px] text-zinc-500 uppercase font-bold">Текст</span><select value={config.fontPair.body} onChange={e => setConfig(c => ({...c, fontPair: {...c.fontPair, body: e.target.value}}))} className="w-full bg-black border border-zinc-800 p-2 rounded-lg text-[10px] text-white">{BODY_FONTS.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
                  </div>
                )}
                
                <div className="pt-4 border-t border-zinc-900 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><span className="text-[9px] text-zinc-500 uppercase font-bold">Размер (Слайд 1)</span><input type="range" min="30" max="120" value={config.fontSizes.first} onChange={e => setConfig(c => ({...c, fontSizes: {...c.fontSizes, first: parseInt(e.target.value)}}))} className="w-full accent-white" /></div>
                    <div className="space-y-1"><span className="text-[9px] text-zinc-500 uppercase font-bold">Размер (Слайд 2+)</span><input type="range" min="30" max="100" value={config.fontSizes.middle} onChange={e => setConfig(c => ({...c, fontSizes: {...c.fontSizes, middle: parseInt(e.target.value)}}))} className="w-full accent-white" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[Alignment.LEFT, Alignment.CENTER, Alignment.JUSTIFY].map(a => (
                      <button key={a} onClick={() => setConfig(c => ({...c, alignment: a}))} className={`p-2 rounded-lg border flex items-center justify-center ${config.alignment === a ? 'bg-white text-black' : 'border-zinc-800'}`}>
                        {a === Alignment.LEFT ? <AlignLeft size={16}/> : a === Alignment.CENTER ? <AlignCenter size={16}/> : <AlignJustify size={16}/>}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1"><span className="text-[9px] text-zinc-500 uppercase font-bold">Межстрочный интервал</span><input type="range" min="100" max="300" value={config.fontSizes.lineHeight * 100} onChange={e => setConfig(c => ({...c, fontSizes: {...c.fontSizes, lineHeight: parseInt(e.target.value) / 100}}))} className="w-full accent-white" /></div>
                  <div className="space-y-1"><span className="text-[9px] text-zinc-500 uppercase font-bold">Смещение по вертикали</span><input type="range" min="20" max="80" value={config.fontSizes.verticalOffset} onChange={e => setConfig(c => ({...c, fontSizes: {...c.fontSizes, verticalOffset: parseInt(e.target.value)}}))} className="w-full accent-white" /></div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <h2 className="text-xl font-bold uppercase tracking-tight">ШАГ 5: брендинг</h2>
                <div className="flex items-center gap-6 bg-zinc-900 p-5 rounded-2xl border border-zinc-800">
                  <label className="relative w-24 h-24 rounded-full border border-zinc-700 flex items-center justify-center cursor-pointer overflow-hidden bg-black shrink-0">
                    {config.avatarUrl ? <img src={config.avatarUrl} className="w-full h-full object-cover" /> : <Upload size={28} className="text-zinc-700"/>}
                    <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'avatar')} />
                  </label>
                  <div className="flex-1 space-y-1">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase">Никнейм</span>
                    <input type="text" placeholder="@account" value={config.nickname} onChange={e => handleNicknameChange(e.target.value)} className="w-full bg-black border border-zinc-800 p-2.5 rounded-xl text-sm outline-none text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[NickPosition.TOP_LEFT, NickPosition.TOP_CENTER, NickPosition.TOP_RIGHT, NickPosition.BOTTOM_LEFT, NickPosition.BOTTOM_CENTER, NickPosition.BOTTOM_RIGHT].map(pos => (
                    <button key={pos} onClick={() => setConfig(c => ({...c, nickPosition: pos}))} className={`p-2 border rounded-lg text-[9px] h-10 transition-all ${config.nickPosition === pos ? 'border-white bg-white text-black font-bold' : 'border-zinc-800 bg-zinc-900'}`}>{pos}</button>
                  ))}
                </div>
                <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase">Нумерация страниц</span>
                  <button onClick={() => setConfig(c => ({...c, numbering: {...c.numbering, enabled: !c.numbering.enabled}}))} className={`px-4 py-1.5 rounded-full text-[9px] font-black transition-all ${config.numbering.enabled ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-500'}`}>{config.numbering.enabled ? 'ВКЛ' : 'ВЫКЛ'}</button>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold uppercase tracking-tight">ШАГ 6: кодовое слово</h2>
                  <button onClick={() => setConfig(c => ({...c, finalSlide: {...c.finalSlide, enabled: !c.finalSlide.enabled}}))} className={`px-4 py-1.5 rounded-full text-[9px] font-black ${config.finalSlide.enabled ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-500'}`}>{config.finalSlide.enabled ? 'ВКЛ' : 'ВЫКЛ'}</button>
                </div>
                <div className={`space-y-3 transition-opacity ${config.finalSlide.enabled ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
                  <div className="space-y-1"><span className="text-[9px] text-zinc-500 uppercase font-bold">Текст над словом</span><input type="text" placeholder="Забирай подарок" value={config.finalSlide.textBefore} onChange={e => setConfig(c => ({...c, finalSlide: {...c.finalSlide, textBefore: e.target.value}}))} className="w-full bg-zinc-900 p-3 rounded-xl border border-zinc-800 text-sm text-white" /></div>
                  <div className="space-y-1"><span className="text-[9px] text-zinc-500 uppercase font-bold">Кодовое слово</span><input type="text" placeholder="АКСЕЛЕРАТОР" value={config.finalSlide.codeWord} onChange={e => handleCodeWordChange(e.target.value)} className="w-full bg-zinc-900 p-3 rounded-xl border border-zinc-800 text-sm font-black text-white" /></div>
                  <div className="space-y-1"><span className="text-[9px] text-zinc-500 uppercase font-bold">Текст под словом</span><input type="text" placeholder="в директ" value={config.finalSlide.textAfter} onChange={e => setConfig(c => ({...c, finalSlide: {...c.finalSlide, textAfter: e.target.value}}))} className="w-full bg-zinc-900 p-3 rounded-xl border border-zinc-800 text-sm text-white" /></div>
                  <div className="space-y-1">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold">Положение кодового слова (Y)</span>
                    <input type="range" min="15" max="65" value={config.finalSlide.codeWordVerticalOffset} onChange={e => setConfig(c => ({...c, finalSlide: {...c.finalSlide, codeWordVerticalOffset: parseInt(e.target.value)}}))} className="w-full accent-white" />
                  </div>
                  <div className="space-y-1"><span className="text-[9px] text-zinc-500 uppercase font-bold">Призыв подписаться (4-7 слов)</span><textarea value={config.finalSlide.blogDescription} onChange={e => handleBlogDescChange(e.target.value)} placeholder="пишу про дизайн и жизнь..." className="w-full h-20 bg-zinc-900 p-3 rounded-xl border border-zinc-800 text-sm text-white" /></div>
                </div>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                 <h2 className="text-xl font-bold uppercase tracking-tight text-center">ШАГ 7: скачивание</h2>
                 <button onClick={generateZip} className="w-full h-14 bg-white text-black rounded-2xl font-black uppercase flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all shadow-xl active:scale-95 text-black">
                   {isGenerating ? <div className="w-5 h-5 border-2 border-black border-t-transparent animate-spin rounded-full"></div> : <Download size={20}/>} 
                   СКАЧАТЬ ZIP АРХИВ
                 </button>
                 <p className="text-[10px] text-zinc-500 text-center font-bold uppercase">Нажмите на слайд для мгновенного скачивания</p>
                 <div className="grid grid-cols-3 gap-x-2 gap-y-16 max-h-[480px] overflow-y-auto p-4 custom-scrollbar border border-zinc-900 rounded-2xl bg-black/50">
                    {slides.map(s => (
                      <button key={s.id} onClick={() => downloadOne(s.id)} className="aspect-[4/5] bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 hover:border-white transition-all transform active:scale-95 shadow-lg">
                        <SlidePreview slide={s} total={config.finalSlide.enabled ? slides.length + 1 : slides.length} config={config} />
                      </button>
                    ))}
                    {config.finalSlide.enabled && (
                      <button onClick={() => downloadOne('final')} className="aspect-[4/5] bg-white/5 rounded-lg overflow-hidden border border-white/10 hover:border-white transition-all transform active:scale-95 shadow-lg">
                         <SlidePreview slide={null} total={slides.length + 1} config={config} isFinal={true} />
                      </button>
                    )}
                 </div>
              </div>
            )}
          </div>

          <div className="border-t border-zinc-900 pt-4 !-mt-4">
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-2 text-center">Предпросмотр</p>
            <div className="flex justify-center">
              <InstagramMockup slides={slides} config={config} />
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 w-full lg:w-[500px] p-6 border-t border-zinc-900 bg-black/90 backdrop-blur-md z-50 flex items-center gap-3">
           <button disabled={step === 1} onClick={() => setStep(s => s - 1)} className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center disabled:opacity-20 active:scale-90 transition-all text-white"><ChevronLeft size={22}/></button>
           {step === 7 ? (
             <button onClick={resetAll} className="flex-1 h-14 bg-zinc-800 border border-zinc-700 text-white rounded-2xl font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all text-white"><RefreshCw size={18}/> НОВЫЙ ПОСТ</button>
           ) : (
             <button onClick={() => setStep(s => s + 1)} className="flex-1 h-14 bg-white text-black rounded-2xl font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all text-black">ВПЕРЕД <ChevronRight size={18}/></button>
           )}
        </div>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center bg-[#000] p-6 relative">
        <div className="absolute top-8 right-8 flex items-center gap-3 text-zinc-700 text-[10px] font-black uppercase tracking-widest bg-zinc-900/60 px-5 py-2.5 rounded-full border border-zinc-900 shadow-2xl backdrop-blur-sm">
          <Eye size={12}/> Живой предпросмотр
        </div>
        <div className="flex flex-col items-center gap-8 relative z-10 animate-in zoom-in duration-500">
          <InstagramMockup slides={slides} config={config} isLarge />
        </div>
      </div>
    </div>
  );
};

const InstagramMockup: React.FC<{slides: SlideData[], config: DesignConfig, isLarge?: boolean}> = ({slides, config, isLarge}) => (
  <div className={`iphone-mockup border-[#1a1a1a] shadow-2xl transition-all duration-300 ${isLarge ? 'scale-110' : 'scale-[0.8]'} !-mt-10`}>
    <div className="dynamic-island"></div>
    <div className="px-4 pt-10 pb-3 flex items-center gap-2.5 bg-black">
      <div className="w-8 h-8 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800 shrink-0">
        {config.avatarUrl && <img src={config.avatarUrl} className="w-full h-full object-cover" />}
      </div>
      <div className="flex flex-col">
        <div className="text-[11px] font-bold text-white tracking-tight">{config.nickname || '@account'}</div>
        <div className="text-[9px] text-zinc-500 font-medium">Original Audio</div>
      </div>
      <MoreHorizontal className="ml-auto text-zinc-600" size={16} />
    </div>
    
    <div className="carousel-snap h-[400px] bg-[#020202]">
      {slides.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-zinc-900/40 text-center px-10">
           <h3 className="text-2xl font-black uppercase mb-2 tracking-tighter italic">Акселератор</h3>
           <p className="text-[8px] tracking-[0.3em] uppercase font-bold">Введите текст в ШАГЕ 1</p>
        </div>
      ) : (
        <>
          {slides.map(s => <SlidePreview key={s.id} slide={s} total={config.finalSlide.enabled ? slides.length + 1 : slides.length} config={config} />)}
          {config.finalSlide.enabled && <SlidePreview slide={null} total={slides.length + 1} config={config} isFinal={true} />}
        </>
      )}
    </div>

    <div className="px-4 py-3 space-y-3 bg-black">
      <div className="flex items-center gap-4">
        <Heart size={22} className="text-white" />
        <MessageCircle size={22} className="text-white" />
        <Send size={22} className="text-white" />
        <div className="flex-1 flex justify-center gap-1">
          {[...Array(Math.min(slides.length + (config.finalSlide.enabled ? 1 : 0), 5))].map((_, i) => <div key={i} className={`w-1 h-1 rounded-full ${i === 0 ? 'bg-zinc-400' : 'bg-zinc-800'}`}></div>)}
        </div>
        <Bookmark size={22} className="text-white" />
      </div>
      <div className="flex justify-between items-center text-[10px] font-bold text-white border-y border-zinc-900 py-2">
        <button className="flex items-center gap-1 uppercase tracking-tighter"><BarChart2 size={14}/> Статистика</button>
        <button className="flex items-center gap-1 bg-blue-500 px-3 py-1 rounded-md text-white font-bold uppercase tracking-tighter text-white"><Zap size={14}/> Продвигать</button>
      </div>
      <div className="space-y-1 overflow-hidden">
        <p className="text-[11px] font-bold text-white leading-tight truncate">
          {config.nickname || '@account'} <span className="font-normal text-zinc-300 ml-1">Сделал этот пост в Акселераторе 🚀</span>
        </p>
      </div>
    </div>

    <div className="mt-auto px-8 py-4 border-t border-zinc-900 flex justify-between bg-black text-zinc-500">
       <Home size={20}/>
       <Search size={20}/>
       <div className="w-5 h-5 border-2 border-zinc-500 rounded-md"></div>
       <Play size={20}/>
       <User size={20}/>
    </div>
  </div>
);

const SlidePreview: React.FC<{slide: SlideData | null, total: number, config: DesignConfig, isFinal?: boolean}> = ({slide, total, config, isFinal}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const updateCanvas = useCallback(async () => {
    if (canvasRef.current) {
      const size = isFinal ? config.sizes.last : (slide?.id === 1 ? config.sizes.first : config.sizes.middle);
      const [w, h] = size.split('x').map(Number);
      canvasRef.current.width = w;
      canvasRef.current.height = h;
      await renderSlideToCanvas(canvasRef.current, slide, total, config, isFinal);
    }
  }, [slide, total, config, isFinal]);

  useEffect(() => { updateCanvas(); }, [updateCanvas, config]);
  return <div className="w-full h-full flex items-center justify-center bg-black overflow-hidden"><canvas ref={canvasRef} className="w-full h-auto max-h-full object-contain" /></div>;
};

export default App;
