
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ChevronRight, ChevronLeft, Download, ImageIcon, Upload, Eye, RefreshCw, AlignLeft, AlignCenter, AlignJustify, Heart, MessageCircle, Send, Bookmark, MoreHorizontal
} from 'lucide-react';
import JSZip from 'jszip';
import { 
  SplitType, AspectRatio, NickPosition, SlideData, DesignConfig, Alignment, SlideFormat 
} from './types.ts';
import { renderSlideToCanvas, saveBlob } from './utils/canvasUtils.ts';

const FONT_PAIRS = [
  { name: 'Gilroy Bold', header: 'Montserrat', body: 'Manrope' },
  { name: 'Montserrat Alternates', header: 'Montserrat Alternates', body: 'Manrope' },
  { name: 'DM Sans Bold', header: 'DM Sans', body: 'Manrope' },
  { name: 'Humanist Sans', header: 'Golos Text', body: 'Manrope' },
  { name: 'Experimental', header: 'Unbounded', body: 'Inter' },
  { name: 'Свой шрифт', header: 'Inter', body: 'Inter', isCustom: true },
];

const PRESETS = [
  { name: 'Классический черный', bg: '#000000', text: '#ffffff' },
  { name: 'Чистый белый', bg: '#ffffff', text: '#000000' },
  { name: 'Кремовый шоколад', bg: '#EDE0D4', text: '#6B4F4F' },
  { name: 'Благородный бордо', bg: '#55121B', text: '#FEFAEF' },
];

const AVAILABLE_FONTS = ['Inter', 'Manrope', 'Montserrat', 'Montserrat Alternates', 'DM Sans', 'Golos Text', 'Unbounded', 'Arial', 'Georgia', 'Verdana'];

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
    fontSizes: { first: 60, middle: 45, last: 45, lineHeight: 1.4, verticalOffset: 25 },
    finalSlide: { enabled: true, textBefore: 'Забирай подарок', codeWord: 'АКСЕЛЕРАТОР', textAfter: 'в директ', blogDescription: '', codeWordY: 50, avatarY: 85 }
  });

  const resetAll = () => window.location.reload();

  const parseSlides = useCallback(() => {
    let raw: string[] = [];
    if (config.splitType === SplitType.EMPTY_LINE) raw = inputText.split(/\n\s*\n/);
    else if (config.splitType === SplitType.DASHES) raw = inputText.split(/---/);
    else raw = inputText.split(/Слайд \d+:|Слайд \d+/i);
    const filtered = raw.map(s => s.trim()).filter(s => s.length > 0).slice(0, 20);
    setSlides(filtered.map((text, i) => ({ id: i + 1, text })));
  }, [inputText, config.splitType]);

  useEffect(() => { parseSlides(); }, [inputText, config.splitType]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'bg') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'avatar') setConfig(c => ({ ...c, avatarUrl: reader.result as string }));
        else setConfig(c => ({ ...c, bgImageUrl: reader.result as string }));
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
      {/* Sidebar Controls */}
      <div className="w-full lg:w-[500px] border-r border-zinc-900 overflow-y-auto flex flex-col bg-[#050505]">
        <header className="p-8 pb-4 text-center border-b border-zinc-900">
          <h1 className="text-3xl font-[900] italic tracking-tighter uppercase leading-none">Акселератор</h1>
          <p className="text-zinc-600 text-[10px] font-bold tracking-[0.6em] uppercase mt-1">bymorozov</p>
        </header>

        <div className="p-8 space-y-12">
          {/* Form Step Content */}
          <div className="min-h-[400px]">
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold uppercase tracking-tight">ШАГ 1: вставьте текст</h2>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Текст слайда 1&#10;&#10;Текст слайда 2..."
                  className="w-full h-48 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-sm focus:ring-1 focus:ring-white outline-none transition-all"
                />
                <div className="space-y-3">
                   <p className="text-[10px] text-zinc-500 font-bold uppercase">Как разделяем слайды?</p>
                   <div className="grid grid-cols-3 gap-2">
                     {[SplitType.EMPTY_LINE, SplitType.DASHES, SplitType.SLIDE_N].map(st => (
                       <button key={st} onClick={() => setConfig(c => ({...c, splitType: st}))} className={`text-[10px] py-3 rounded-xl border transition-all ${config.splitType === st ? 'bg-white text-black font-bold' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>
                         {st === SplitType.EMPTY_LINE ? 'Пустая строка' : st === SplitType.DASHES ? 'Линии' : 'Слайд N'}
                       </button>
                     ))}
                   </div>
                </div>
                <div className="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/50 space-y-2">
                   <p className="text-[11px] text-zinc-400 leading-relaxed italic">
                     <span className="text-white font-bold">Подсказка:</span><br/>
                     Чтобы сделать текст <span className="font-bold text-white">жирным</span>, заключите его в звездочки: <code className="bg-zinc-800 px-1 rounded">*текст*</code><br/>
                     Чтобы сделать текст <span className="text-rose-400">цветным</span>, используйте: <code className="bg-zinc-800 px-1 rounded">[слово](#ff0000)</code>
                   </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold uppercase tracking-tight">ШАГ 2: выберите формат</h2>
                <div className="grid grid-cols-2 gap-3">
                  {Object.values(SlideFormat).map(f => (
                    <button key={f} onClick={() => setConfig(c => ({...c, format: f}))} className={`p-5 rounded-2xl border text-xs font-bold text-left h-24 transition-all ${config.format === f ? 'bg-white text-black border-white' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>{f}</button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold uppercase tracking-tight">ШАГ 3: цвета и фон</h2>
                <div className="grid grid-cols-2 gap-3">
                  {PRESETS.map(p => (
                    <button key={p.name} onClick={() => setConfig(c => ({...c, customColor: p.bg, textColor: p.text}))} className="p-5 rounded-2xl border border-zinc-800 text-left h-24 flex flex-col justify-end transition-all hover:scale-[1.02]" style={{backgroundColor: p.bg}}>
                      <span className="text-[10px] font-bold" style={{color: p.text}}>{p.name}</span>
                    </button>
                  ))}
                  <button onClick={() => setShowCustomColor(!showCustomColor)} className={`p-5 rounded-2xl border h-24 text-[10px] font-bold uppercase tracking-widest transition-all ${showCustomColor ? 'bg-white text-black border-white' : 'bg-zinc-900 border-zinc-800'}`}>Свой цвет</button>
                  <label className="p-5 rounded-2xl border border-zinc-800 h-24 flex items-center justify-center cursor-pointer hover:bg-zinc-900 bg-zinc-900 transition-all">
                    <span className="text-[10px] font-bold uppercase tracking-widest">Свое фото</span>
                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'bg')} />
                  </label>
                </div>
                {showCustomColor && (
                  <div className="grid grid-cols-2 gap-6 p-6 bg-zinc-900 rounded-2xl border border-zinc-800 animate-in fade-in slide-in-from-top-4">
                    <div className="space-y-2"><span className="text-[9px] text-zinc-500 font-bold uppercase">Цвет фона</span><input type="color" value={config.customColor} onChange={e => setConfig(c => ({...c, customColor: e.target.value}))} className="w-full h-10 bg-transparent cursor-pointer" /></div>
                    <div className="space-y-2"><span className="text-[9px] text-zinc-500 font-bold uppercase">Цвет текста</span><input type="color" value={config.textColor} onChange={e => setConfig(c => ({...c, textColor: e.target.value}))} className="w-full h-10 bg-transparent cursor-pointer" /></div>
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-8">
                <h2 className="text-xl font-bold uppercase tracking-tight">ШАГ 4: шрифты и настройки</h2>
                <div className="grid grid-cols-2 gap-3">
                  {FONT_PAIRS.map(p => (
                    <button key={p.name} onClick={() => setConfig(c => ({...c, fontPair: p}))} className={`p-5 rounded-2xl border text-left flex flex-col h-24 transition-all ${config.fontPair.name === p.name ? 'border-white bg-white/10' : 'border-zinc-800 bg-zinc-900'}`}>
                      <span className="text-[11px] font-bold mb-1" style={{fontFamily: p.header}}>{p.name}</span>
                      <span className="text-[9px] text-zinc-600 opacity-60 mt-auto">АБВГД abcde</span>
                    </button>
                  ))}
                </div>
                {config.fontPair.isCustom && (
                  <div className="p-6 bg-zinc-900 rounded-3xl border border-zinc-800 grid grid-cols-2 gap-4">
                     <div className="space-y-1"><span className="text-[9px] text-zinc-500 uppercase font-bold">Шрифт заголовка</span><select value={config.fontPair.header} onChange={e => setConfig(c => ({...c, fontPair: {...c.fontPair, header: e.target.value}}))} className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-[10px]">{AVAILABLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
                     <div className="space-y-1"><span className="text-[9px] text-zinc-500 uppercase font-bold">Основной шрифт</span><select value={config.fontPair.body} onChange={e => setConfig(c => ({...c, fontPair: {...c.fontPair, body: e.target.value}}))} className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-[10px]">{AVAILABLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
                  </div>
                )}
                <div className="space-y-5 border-t border-zinc-900 pt-8">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Тонкие настройки</p>
                  <div className="space-y-4">
                    <RangeInput label="Размер 1-го слайда" min={30} max={120} value={config.fontSizes.first} onChange={v => setConfig(c => ({...c, fontSizes: {...c.fontSizes, first: v}}))} />
                    <RangeInput label="Размер текста (2+)" min={30} max={100} value={config.fontSizes.middle} onChange={v => setConfig(c => ({...c, fontSizes: {...c.fontSizes, middle: v}}))} />
                    <RangeInput label="Размер финала" min={30} max={100} value={config.fontSizes.last} onChange={v => setConfig(c => ({...c, fontSizes: {...c.fontSizes, last: v}}))} />
                    <RangeInput label="Межстрочный интервал" min={10} max={25} value={config.fontSizes.lineHeight * 10} onChange={v => setConfig(c => ({...c, fontSizes: {...c.fontSizes, lineHeight: v/10}}))} />
                    <RangeInput label="Вертикальный сдвиг" min={10} max={80} value={config.fontSizes.verticalOffset} onChange={v => setConfig(c => ({...c, fontSizes: {...c.fontSizes, verticalOffset: v}}))} />
                  </div>
                  <div className="flex gap-2 justify-center pt-2">
                    {[Alignment.LEFT, Alignment.CENTER].map(a => (
                      <button key={a} onClick={() => setConfig(c => ({...c, alignment: a}))} className={`p-4 rounded-xl border ${config.alignment === a ? 'border-white bg-white/10' : 'border-zinc-800'}`}>
                        {a === Alignment.LEFT ? <AlignLeft size={20}/> : <AlignCenter size={20}/>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-8">
                <h2 className="text-xl font-bold uppercase tracking-tight">ШАГ 5: брендинг</h2>
                <div className="flex items-center gap-8 bg-zinc-900/40 p-6 rounded-3xl border border-zinc-800/50">
                  <label className="relative w-24 h-24 rounded-full border-2 border-zinc-800 flex items-center justify-center cursor-pointer hover:border-white transition-all overflow-hidden bg-black shadow-inner">
                    {config.avatarUrl ? <img src={config.avatarUrl} className="w-full h-full object-cover" /> : <Upload size={24} className="text-zinc-700"/>}
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"><Camera size={16}/></div>
                    <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'avatar')} />
                  </label>
                  <div className="flex-1 space-y-2">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">Никнейм</span>
                    <input type="text" placeholder="@bymorozov" value={config.nickname} onChange={e => setConfig(c => ({...c, nickname: e.target.value}))} className="w-full bg-black border border-zinc-800 p-4 rounded-2xl text-sm outline-none focus:ring-1 focus:ring-white transition-all" />
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">Расположение ника</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(NickPosition).map(pos => (
                      <button key={pos} onClick={() => setConfig(c => ({...c, nickPosition: pos}))} className={`p-4 border rounded-xl text-[10px] font-medium transition-all ${config.nickPosition === pos ? 'border-white bg-white text-black' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'}`}>{pos}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-8">
                <div className="flex justify-between items-center"><h2 className="text-xl font-bold uppercase tracking-tight">ШАГ 6: финал</h2><button onClick={() => setConfig(c => ({...c, finalSlide: {...c.finalSlide, enabled: !c.finalSlide.enabled}}))} className={`px-6 py-2 rounded-full text-[11px] font-black tracking-widest transition-all ${config.finalSlide.enabled ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-600'}`}>{config.finalSlide.enabled ? 'ВКЛ' : 'ВЫКЛ'}</button></div>
                <div className="space-y-5">
                  <div className="space-y-1.5"><span className="text-[10px] text-zinc-500 font-bold uppercase">Текст до кодового слова</span><input type="text" value={config.finalSlide.textBefore} onChange={e => setConfig(c => ({...c, finalSlide: {...c.finalSlide, textBefore: e.target.value}}))} className="w-full bg-zinc-900 p-4 rounded-2xl border border-zinc-800 text-sm" /></div>
                  <div className="space-y-1.5"><span className="text-[10px] text-zinc-500 font-bold uppercase">Кодовое слово</span><input type="text" value={config.finalSlide.codeWord} onChange={e => setConfig(c => ({...c, finalSlide: {...c.finalSlide, codeWord: e.target.value}}))} className="w-full bg-zinc-900 p-4 rounded-2xl border border-zinc-800 text-sm font-black uppercase tracking-widest text-white" /></div>
                  <div className="space-y-1.5"><span className="text-[10px] text-zinc-500 font-bold uppercase">Текст после слова</span><input type="text" value={config.finalSlide.textAfter} onChange={e => setConfig(c => ({...c, finalSlide: {...c.finalSlide, textAfter: e.target.value}}))} className="w-full bg-zinc-900 p-4 rounded-2xl border border-zinc-800 text-sm" /></div>
                  <div className="space-y-1.5"><span className="text-[10px] text-zinc-500 font-bold uppercase">О чем ваш блог?</span><textarea value={config.finalSlide.blogDescription} onChange={e => setConfig(c => ({...c, finalSlide: {...c.finalSlide, blogDescription: e.target.value}}))} placeholder="У меня в блоге всё про дизайн и..." className="w-full h-28 bg-zinc-900 p-4 rounded-2xl border border-zinc-800 text-sm" /></div>
                </div>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-8">
                 <h2 className="text-xl font-bold uppercase tracking-tight text-center">ШАГ 7: ваш пост</h2>
                 <div className="space-y-4">
                    <button onClick={generateZip} disabled={isGenerating || slides.length === 0} className="w-full h-16 bg-white text-black rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all shadow-xl shadow-white/5 active:scale-95">
                      {isGenerating ? <div className="w-6 h-6 border-2 border-black border-t-transparent animate-spin rounded-full"></div> : <Download size={22}/>} 
                      СКАЧАТЬ АРХИВ (ZIP)
                    </button>
                    <p className="text-center text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em] pt-4">Или скачайте по одному:</p>
                    <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {slides.map(s => <button key={s.id} onClick={() => downloadOne(s.id)} className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-white transition-all">Слайд {s.id}</button>)}
                      {config.finalSlide.enabled && <button onClick={() => downloadOne('final')} className="p-4 bg-white/10 border border-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white">ФИНАЛЬНЫЙ СЛАЙД</button>}
                    </div>
                 </div>
              </div>
            )}
          </div>

          {/* Inline Preview (Visible on Mobile/Sidebar) */}
          <div className="mt-8">
            <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-widest mb-6 text-center">Предпросмотр</p>
            <div className="flex justify-center">
              <InstagramMockup slides={slides} config={config} />
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-auto p-8 border-t border-zinc-900 bg-black/80 backdrop-blur-md sticky bottom-0 z-50 flex items-center gap-4">
           <button disabled={step === 1} onClick={() => setStep(s => s - 1)} className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center disabled:opacity-20 hover:bg-zinc-800 transition-all active:scale-90"><ChevronLeft size={24}/></button>
           {step === 7 ? (
             <button onClick={resetAll} className="flex-1 h-16 bg-zinc-800 border border-zinc-700 text-white rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all active:scale-95 shadow-lg"><RefreshCw size={20}/> НОВЫЙ ПОСТ</button>
           ) : (
             <button onClick={() => setStep(s => s + 1)} className="flex-1 h-16 bg-white text-black rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all active:scale-95 shadow-xl shadow-white/5">ВПЕРЕД <ChevronRight size={20}/></button>
           )}
        </div>
      </div>

      {/* Main Preview Area (Desktop Only) */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-[#000] p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/40 via-transparent to-transparent opacity-50"></div>
        <div className="absolute top-10 right-10 flex items-center gap-3 text-zinc-700 text-[10px] font-black uppercase tracking-widest bg-zinc-900/60 px-6 py-3 rounded-full border border-zinc-900 shadow-2xl backdrop-blur-sm">
          <Eye size={14}/> Живой предпросмотр
        </div>
        
        <div className="flex flex-col items-center gap-12 relative z-10 animate-in zoom-in duration-500">
          <InstagramMockup slides={slides} config={config} isLarge />
          <div className="flex flex-col items-center gap-2">
            <p className="text-zinc-700 text-[10px] uppercase font-bold tracking-[0.3em] animate-pulse">Листайте слайды прямо здесь</p>
            <div className="flex gap-2">
              {[...Array(Math.min(slides.length + (config.finalSlide.enabled ? 1 : 0), 10))].map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-zinc-500' : 'bg-zinc-900'}`}></div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable UI Components
const RangeInput: React.FC<{label: string, min: number, max: number, value: number, onChange: (v: number) => void}> = ({label, min, max, value, onChange}) => (
  <div className="flex justify-between items-center bg-zinc-900/20 p-2 rounded-xl">
    <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-tighter">{label}</span>
    <input type="range" min={min} max={max} value={value} onChange={e => onChange(parseInt(e.target.value))} className="w-32 accent-white opacity-60 hover:opacity-100 transition-opacity" />
  </div>
);

const InstagramMockup: React.FC<{slides: SlideData[], config: DesignConfig, isLarge?: boolean}> = ({slides, config, isLarge}) => {
  return (
    <div className={`iphone-mockup border-[#1a1a1a] shadow-2xl transition-all duration-300 ${isLarge ? 'scale-110' : 'scale-[0.85]'}`}>
      <div className="px-5 py-4 flex items-center gap-3 border-b border-zinc-900/50 bg-black/50 backdrop-blur-sm">
        <div className="w-8 h-8 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
          {config.avatarUrl && <img src={config.avatarUrl} className="w-full h-full object-cover" />}
        </div>
        <div className="text-[11px] font-bold text-white tracking-tight">{config.nickname || 'account'}</div>
        <MoreHorizontal className="ml-auto text-zinc-700" size={18} />
      </div>
      
      <div className="carousel-snap h-[500px] bg-[#020202]">
        {slides.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-900/40 text-center px-10 italic">
             <h3 className="text-3xl font-black uppercase leading-none mb-3 tracking-tighter">ByMorozov</h3>
             <p className="text-[9px] tracking-[0.4em] uppercase font-bold">Введите текст в ШАГЕ 1</p>
          </div>
        ) : (
          <>
            {slides.map(s => <SlidePreview key={s.id} slide={s} total={config.finalSlide.enabled ? slides.length + 1 : slides.length} config={config} />)}
            {config.finalSlide.enabled && <SlidePreview slide={null} total={slides.length + 1} config={config} isFinal={true} />}
          </>
        )}
      </div>

      <div className="px-5 py-5 space-y-5 bg-black">
        <div className="flex items-center gap-6">
          <Heart size={24} className="text-zinc-200" />
          <MessageCircle size={24} className="text-zinc-200" />
          <Send size={24} className="text-zinc-200" />
          <div className="flex-1 flex justify-center gap-1.5">
            {[...Array(Math.min(slides.length + (config.finalSlide.enabled ? 1 : 0), 5))].map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-zinc-400' : 'bg-zinc-900'}`}></div>)}
          </div>
          <Bookmark size={24} className="text-zinc-200" />
        </div>
        <div className="space-y-2">
          <div className="h-2 w-36 bg-zinc-900 rounded-full"></div>
          <div className="h-2 w-24 bg-zinc-900 rounded-full opacity-50"></div>
        </div>
      </div>
    </div>
  );
};

const SlidePreview: React.FC<{slide: SlideData | null, total: number, config: DesignConfig, isFinal?: boolean}> = ({slide, total, config, isFinal}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) {
      const size = isFinal ? config.sizes.last : (slide?.id === 1 ? config.sizes.first : config.sizes.middle);
      const [w, h] = size.split('x').map(Number);
      canvasRef.current.width = w; canvasRef.current.height = h;
      renderSlideToCanvas(canvasRef.current, slide, total, config, isFinal);
    }
  }, [slide, total, config, isFinal]);
  return <div className="w-full h-full flex items-center justify-center bg-black overflow-hidden"><canvas ref={canvasRef} className="w-full h-auto max-h-full object-contain" /></div>;
};

const Camera = ({size}: {size: number}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;

export default App;
