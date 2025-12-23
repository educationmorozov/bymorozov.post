
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Type, Settings, Layout, User, Download, Plus, Trash2, 
  ChevronRight, ChevronLeft, Check, AlignLeft, AlignCenter, AlignJustify,
  Palette, Image as ImageIcon, Smartphone
} from 'lucide-react';
import JSZip from 'jszip';
import { 
  SplitType, AspectRatio, NickPosition, SlideData, TemplateId, DesignConfig, Alignment 
} from './types.ts';
import { renderSlideToCanvas, saveBlob } from './utils/canvasUtils.ts';

const FONT_PAIRS = [
  { name: 'Gilroy ExtraBold + Manrope', header: 'Montserrat', body: 'Manrope' },
  { name: 'Montserrat Alternates + Manrope', header: 'Montserrat Alternates', body: 'Manrope' },
  { name: 'DM Sans Bold + Manrope', header: 'DM Sans', body: 'Manrope' },
  { name: 'Bold Humanist Sans', header: 'Golos Text', body: 'Manrope' },
  { name: 'Experimental + Neutral', header: 'Unbounded', body: 'Inter' },
  { name: 'Свой шрифт', header: '', body: '', isCustom: true },
];

const AVAILABLE_FONTS = ['Inter', 'Manrope', 'Montserrat', 'Montserrat Alternates', 'DM Sans', 'Golos Text', 'Unbounded', 'Arial', 'Georgia'];

const App: React.FC = () => {
  const [step, setStep] = useState(1);
  const [inputText, setInputText] = useState('');
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [config, setConfig] = useState<DesignConfig>({
    templateId: TemplateId.MINIMAL,
    customColor: '#000000',
    bgImageUrl: null,
    alignment: Alignment.LEFT,
    fontPair: { header: 'Montserrat', body: 'Manrope' },
    nickname: '',
    avatarUrl: null,
    nickPosition: NickPosition.BOTTOM_LEFT,
    numbering: { enabled: true, position: 'bottom-right' },
    sizes: {
      first: AspectRatio.PORTRAIT,
      middle: AspectRatio.PORTRAIT,
      last: AspectRatio.PORTRAIT
    }
  });

  const parseSlides = useCallback(() => {
    let raw = inputText.split(/\n\s*\n/).filter(s => s.trim().length > 0).slice(0, 20);
    setSlides(raw.map((text, i) => ({ id: i + 1, text })));
  }, [inputText]);

  useEffect(() => { parseSlides(); }, [inputText]);

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

  const generateZip = async () => {
    setIsGenerating(true);
    const zip = new JSZip();
    for (const slide of slides) {
      const canvas = document.createElement('canvas');
      const size = slide.id === 1 ? config.sizes.first : (slide.id === slides.length ? config.sizes.last : config.sizes.middle);
      const [w, h] = size.split('x').map(Number);
      canvas.width = w; canvas.height = h;
      await renderSlideToCanvas(canvas, slide, slides.length, config);
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
      if (blob) zip.file(`slide_${slide.id}.png`, blob);
    }
    const content = await zip.generateAsync({ type: 'blob' });
    saveBlob(content, 'bymorozov_carousel.zip');
    setIsGenerating(false);
  };

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Sidebar - Form Steps */}
      <div className="w-full lg:w-[450px] border-r border-zinc-900 overflow-y-auto p-8 flex flex-col gap-10">
        <header className="mb-2">
          <h1 className="text-3xl font-[900] italic tracking-tighter uppercase leading-none">Акселератор</h1>
          <p className="text-zinc-600 text-[10px] font-bold tracking-[0.4em] uppercase">bymorozov</p>
        </header>

        <div className="flex-1 space-y-12 pb-20">
          {/* Step 1: Text */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center text-xs">1</span>
                Вставьте текст
              </h2>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Текст слайда 1&#10;&#10;Текст слайда 2..."
                className="w-full h-64 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-sm focus:ring-2 focus:ring-white outline-none"
              />
              <p className="text-[11px] text-zinc-500 leading-relaxed italic">
                *слово* — жирный текст. (цвет)слово(цвет) — текст выбранного цвета.<br/>
                Разделяйте слайды пустой строкой. Максимум 20 слайдов.
              </p>
            </div>
          )}

          {/* Step 2: Formats */}
          {step === 2 && (
            <div className="space-y-8">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center text-xs">2</span>
                Выберите формат
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-500">Первый слайд</label>
                    <button onClick={() => setConfig(c => ({...c, sizes: {...c.sizes, first: config.sizes.first === AspectRatio.PORTRAIT ? AspectRatio.SQUARE : AspectRatio.PORTRAIT}}))} className="w-full bg-zinc-900 py-3 rounded-xl border border-zinc-800 text-xs">
                      {config.sizes.first === AspectRatio.PORTRAIT ? '1080x1350' : '1080x1080'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-500">Остальные</label>
                    <button onClick={() => setConfig(c => ({...c, sizes: {...c.sizes, middle: config.sizes.middle === AspectRatio.PORTRAIT ? AspectRatio.SQUARE : AspectRatio.PORTRAIT}}))} className="w-full bg-zinc-900 py-3 rounded-xl border border-zinc-800 text-xs">
                      {config.sizes.middle === AspectRatio.PORTRAIT ? '1080x1350' : '1080x1080'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Design */}
          {step === 3 && (
            <div className="space-y-8">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center text-xs">3</span>
                Дизайн и фон
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setConfig(c => ({...c, bgImageUrl: null}))} className="bg-zinc-900 h-20 rounded-xl border border-zinc-800 flex items-center justify-center"><Palette size={20}/></button>
                <label className="bg-zinc-900 h-20 rounded-xl border border-zinc-800 flex items-center justify-center cursor-pointer">
                  <ImageIcon size={20}/>
                  <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'bg')} />
                </label>
              </div>
              <input type="color" value={config.customColor} onChange={(e) => setConfig(c => ({...c, customColor: e.target.value}))} className="w-full h-12 bg-transparent rounded-xl cursor-pointer" />
            </div>
          )}

          {/* Step 4: Fonts */}
          {step === 4 && (
            <div className="space-y-8">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center text-xs">4</span>
                Шрифт
              </h2>
              <div className="space-y-3">
                {FONT_PAIRS.map(pair => (
                  <button 
                    key={pair.name}
                    onClick={() => setConfig(c => ({...c, fontPair: pair}))}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${config.fontPair.name === pair.name ? 'border-white bg-white/5' : 'border-zinc-800 hover:border-zinc-700'}`}
                  >
                    <p className="text-xs font-bold" style={{fontFamily: pair.header || 'inherit'}}>{pair.name}</p>
                    {pair.isCustom && config.fontPair.isCustom && (
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <select onChange={(e) => setConfig(c => ({...c, fontPair: {...c.fontPair, header: e.target.value}}))} className="bg-black text-[10px] p-2 border border-zinc-800 rounded-lg">
                          {AVAILABLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <select onChange={(e) => setConfig(c => ({...c, fontPair: {...c.fontPair, body: e.target.value}}))} className="bg-black text-[10px] p-2 border border-zinc-800 rounded-lg">
                          {AVAILABLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 justify-center pt-4">
                {[Alignment.LEFT, Alignment.CENTER, Alignment.JUSTIFY].map(a => (
                  <button key={a} onClick={() => setConfig(c => ({...c, alignment: a}))} className={`p-3 rounded-lg border ${config.alignment === a ? 'border-white bg-white/10' : 'border-zinc-800'}`}>
                    {a === Alignment.LEFT && <AlignLeft size={16}/>}
                    {a === Alignment.CENTER && <AlignCenter size={16}/>}
                    {a === Alignment.JUSTIFY && <AlignJustify size={16}/>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Branding */}
          {step === 5 && (
            <div className="space-y-8">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center text-xs">5</span>
                Брендинг и ник
              </h2>
              <div className="space-y-4">
                <input type="text" placeholder="@nickname" value={config.nickname} onChange={(e) => setConfig(c => ({...c, nickname: e.target.value}))} className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(NickPosition).map(pos => (
                    <button key={pos} onClick={() => setConfig(c => ({...c, nickPosition: pos}))} className={`p-2 border rounded-lg text-[10px] ${config.nickPosition === pos ? 'border-white' : 'border-zinc-800'}`}>{pos}</button>
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <input type="checkbox" checked={config.numbering.enabled} onChange={() => setConfig(c => ({...c, numbering: {...c.numbering, enabled: !c.numbering.enabled}}))} />
                  <span className="text-sm">Нумерация слайдов</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 7: Final */}
          {step === 7 && (
            <div className="space-y-8 text-center">
               <h2 className="text-xl font-bold">Готово!</h2>
               <p className="text-zinc-500 text-sm">Проверьте результат на предпросмотре и скачайте пост.</p>
               <button 
                onClick={generateZip}
                disabled={isGenerating}
                className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
               >
                 {isGenerating ? 'Упаковка...' : 'Скачать всё (ZIP)'}
               </button>
               <div className="grid grid-cols-2 gap-3 mt-4">
                  {slides.map(s => (
                    <button key={s.id} className="text-[10px] bg-zinc-900 py-2 rounded border border-zinc-800">Слайд {s.id}</button>
                  ))}
               </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-auto flex justify-between gap-4 pt-10 border-t border-zinc-900">
          <button disabled={step === 1} onClick={() => setStep(s => s - 1)} className="flex-1 py-4 bg-zinc-900 rounded-2xl flex items-center justify-center disabled:opacity-30"><ChevronLeft/></button>
          <button disabled={step === 7} onClick={() => setStep(s => s + 1)} className="flex-1 py-4 bg-white text-black rounded-2xl flex items-center justify-center"><ChevronRight/></button>
        </div>
      </div>

      {/* Main Preview - iPhone Mockup */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-[#050505]">
        <div className="flex flex-col items-center gap-8">
          <div className="iphone-mockup shadow-[0_50px_100px_rgba(0,0,0,0.5)]">
            {/* Instagram UI Header */}
            <div className="p-4 flex items-center gap-3 border-b border-zinc-900">
              <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden">
                {config.avatarUrl && <img src={config.avatarUrl} className="w-full h-full object-cover" />}
              </div>
              <div className="text-[11px] font-bold">{config.nickname || 'your_name'}</div>
              <div className="ml-auto flex gap-1"><div className="w-1 h-1 rounded-full bg-zinc-700"></div><div className="w-1 h-1 rounded-full bg-zinc-700"></div><div className="w-1 h-1 rounded-full bg-zinc-700"></div></div>
            </div>
            
            <div className="carousel-snap h-[500px]">
              {slides.length === 0 ? (
                <div className="flex items-center justify-center h-full text-zinc-800 font-black italic text-4xl">bymorozov</div>
              ) : (
                slides.map(s => (
                  <SlidePreview key={s.id} slide={s} total={slides.length} config={config} />
                ))
              )}
            </div>

            {/* Instagram UI Footer */}
            <div className="p-4 space-y-3">
              <div className="flex gap-4">
                <div className="w-6 h-6 border-2 border-zinc-200 rounded-md"></div>
                <div className="w-6 h-6 border-2 border-zinc-200 rounded-md"></div>
                <div className="w-6 h-6 border-2 border-zinc-200 rounded-md"></div>
              </div>
              <div className="h-2 w-32 bg-zinc-800 rounded-full"></div>
            </div>
          </div>
          <div className="flex gap-2">
            {slides.map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-800"></div>)}
          </div>
        </div>
      </div>
    </div>
  );
};

const SlidePreview: React.FC<{slide: SlideData, total: number, config: DesignConfig}> = ({slide, total, config}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) {
      const size = slide.id === 1 ? config.sizes.first : (slide.id === total ? config.sizes.last : config.sizes.middle);
      const [w, h] = size.split('x').map(Number);
      canvasRef.current.width = w; canvasRef.current.height = h;
      renderSlideToCanvas(canvasRef.current, slide, total, config);
    }
  }, [slide, total, config]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-zinc-950">
      <canvas ref={canvasRef} className="w-full h-auto" />
    </div>
  );
};

export default App;
