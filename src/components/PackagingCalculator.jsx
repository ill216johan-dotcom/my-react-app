import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Settings, Plus, Save, Copy, Trash2, Box, Check, 
  ChevronDown, Package, X 
} from 'lucide-react';
import CalculatorLayout from './CalculatorLayout';

// --- КОНФИГУРАЦИЯ ПО УМОЛЧАНИЮ (Коэффициенты) ---
const DEFAULT_SETTINGS = {
  // ВПП (Пупырка)
  vpp_r1_1: 0.000835, vpp_r1_2: 0.000792,
  vpp_r2_1: 0.000208, vpp_r2_2: 0.000000,
  vpp_w_base_flat: 8.26, vpp_w_base_nano: 7.96,
  vpp_w_base_micro: 8.61, vpp_w_base_small: 8.98,
  vpp_w_base_2: 1.00,
  vpp_m_rate0: 0.175, vpp_m_rate1: 0.35,
  vpp_m_rate2: 0.525, vpp_m_rate3: 0.70,
  vpp_m_limit: 50,
  vpp_threshold: 1000, vpp_break: 3500,
  vpp_r1_narrow: 0.00140, vpp_r2_narrow: 0.00035,

  // Термоусадка (Услуга)
  srv_base: 6.59, srv_base_flat: 6.36, srv_base_nano: 6.17,
  limit_vol_nano: 115,
  srv_r1: 0.00060, srv_r2: 0.000425, srv_r3: 0.000588,
  srv_r_narrow: 0.00175,

  // Термоусадка (Вес)
  w_thresh_start: 0.42,
  w_rate0: 2.60, w_rate1: 3.11, w_rate2: 3.143, w_rate3: 1.188,

  // Термоусадка (Материал)
  rate_1: 0.1258, rate_2: 0.178, lim_h: 6, lim_vol: 999,
  
  // Ограничения
  max_l: 45, max_w: 30, max_h: 20,

  // Пакеты (Цены)
  zip_p1: 12.5, zip_p2: 16.5, zip_p3: 21.5,
  cour_p1: 6.0, cour_p2: 11.0, cour_p3: 19.0, cour_p4: 25.0,
  mat_rubber: 15.0
};

const LABELS = { len: 'Длина', wid: 'Ширина', hgt: 'Высота' };

// Опции слоев
const LAYERS = {
  l1: [
    { id: 'none', name: 'Не требуется', short: '' },
    { id: 'thermo', name: 'Упаковать в термоусадку', short: 'ТЕРМО' },
    { id: 'zip', name: 'ЗИП пакет', short: 'ЗИП' },
    { id: 'courier', name: 'Курьер пакет', short: 'КУРЬЕР' },
    { id: 'rubber', name: 'Резинка для обуви', short: 'РЕЗИНА' }
  ],
  l2: [
    { id: 'none', name: 'Не требуется', short: '' },
    { id: 'vpp1', name: 'Упаковка в один слой ВПП', short: 'ВПП' },
    { id: 'vpp2', name: 'Упаковка в два слоя ВПП', short: 'ВППx2' }
  ]
};

export default function PackagingCalculator() {
  // --- STATE ---
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  
  // Временное имя для нового товара
  const [tempName, setTempName] = useState('');
  // Поле импорта
  const [importText, setImportText] = useState('');

  const [inputs, setInputs] = useState({
    len: 15, wid: 15, hgt: 7, wgt: 0.45, qty: 1,
    layer1: 'thermo', layer2: 'vpp1', kiz: false,
    customCost: 0
  });

  const [skus, setSkus] = useState([]);
  const [activeSkuId, setActiveSkuId] = useState(null);
  
  // Расчетные значения
  const [results, setResults] = useState({
    workThermo: 0, workVpp: 0, workOther: 0, workKiz: 0, workCustom: 0,
    matThermo: 0, matVpp: 0, matOther: 0,
    totalUnit: 0, totalBatch: 0,
    vol: 0, sumWH: 0, badge: ''
  });

  // --- ЭФФЕКТЫ ---
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // --- ЛОГИКА ПОДБОРА ПАКЕТА ---
  const getBagPrice = (type, L, W, H) => {
    const dims = [L, W, H].sort((a, b) => b - a);
    const midDim = dims[1];
    const minDim = dims[2];

    const reqW = midDim + minDim + 1;
    const reqH = dims[0] + minDim + 4;

    let bags = [];
    if (type === 'zip') {
      bags = [
        { w: 20, h: 25, p: settings.zip_p1 },
        { w: 30, h: 40, p: settings.zip_p2 },
        { w: 40, h: 50, p: settings.zip_p3 }
      ];
    } else {
      bags = [
        { w: 15, h: 25, p: settings.cour_p1 },
        { w: 30, h: 40, p: settings.cour_p2 },
        { w: 40, h: 50, p: settings.cour_p3 },
        { w: 60, h: 60, p: settings.cour_p4 }
      ];
    }

    for (let b of bags) {
      const fit1 = (b.w >= reqW && b.h >= reqH);
      const fit2 = (b.h >= reqW && b.w >= reqH);
      if (fit1 || fit2) return b.p;
    }
    return bags[bags.length - 1].p; 
  };

  // --- ОСНОВНОЙ РАСЧЕТ ---
  useEffect(() => {
    const { len, wid, hgt, wgt, qty, layer1, layer2, kiz, customCost } = inputs;
    
    const dims = [Number(len), Number(wid), Number(hgt)].sort((a, b) => b - a);
    const L = dims[0];
    const W = dims[1];
    const H = dims[2];
    const vol = L * W * H;
    const sumWH = W + H;

    // Факторы
    const isNano = vol <= settings.limit_vol_nano;
    const isFlat = H <= 2;
    const isNarrowLong = L >= 20 && (W + H) <= 15 && vol > 900;

    let costWorkThermo = 0, costWorkVpp = 0, costWorkOther = 0;
    let costWorkKiz = kiz ? 10 : 0;
    let costWorkCustom = customCost || 0;

    let costMatThermo = 0, costMatVpp = 0, costMatOther = 0;

    // 1. ТЕРМОУСАДКА (РАБОТА)
    let srvBase = settings.srv_base;
    if (isNano) srvBase = settings.srv_base_nano;
    else if (isFlat) srvBase = settings.srv_base_flat;

    const srvThreshold = 500;
    let volumeSurcharge = 0;
    
    // Наценка за объем термоусадки
    const chargeableVol = Math.max(0, vol - srvThreshold);
    if (chargeableVol > 0) {
      if (isNarrowLong) {
        volumeSurcharge = chargeableVol * settings.srv_r_narrow;
      } else {
        const br1 = 3500, br2 = 10000;
        const limitForR1 = Math.max(0, br1 - srvThreshold);
        const volPart1 = Math.min(chargeableVol, limitForR1);
        volumeSurcharge += volPart1 * settings.srv_r1;

        if (chargeableVol > limitForR1) {
          const remaining = chargeableVol - limitForR1;
          const limitForR2 = br2 - br1;
          const volPart2 = Math.min(remaining, limitForR2);
          volumeSurcharge += volPart2 * settings.srv_r2;
          if (remaining > limitForR2) {
             volumeSurcharge += (remaining - limitForR2) * settings.srv_r3;
          }
        }
      }
    }

    let weightSurcharge = 0;
    if (wgt >= settings.w_thresh_start) {
      if (wgt > 0) weightSurcharge += Math.min(wgt, 1.0) * settings.w_rate0;
      if (wgt > 1.0) weightSurcharge += Math.min(wgt - 1.0, 1.0) * settings.w_rate1;
      if (wgt > 2.0) weightSurcharge += Math.min(wgt - 2.0, 3.0) * settings.w_rate2;
      if (wgt > 5.0) weightSurcharge += (wgt - 5.0) * settings.w_rate3;
    }

    const calcThermoService = srvBase + Math.max(volumeSurcharge, weightSurcharge);

    // --- СЛОЙ 1 ---
    if (layer1 === 'thermo') {
      costWorkThermo = calcThermoService;
      const rate = H <= settings.lim_h ? settings.rate_1 : settings.rate_2;
      costMatThermo = rate * (L + 2.0 * H);
    } else if (layer1 === 'zip') {
      costWorkOther += 12.6;
      costMatOther += getBagPrice('zip', L, W, H);
    } else if (layer1 === 'courier') {
      costWorkOther += 12.6;
      costMatOther += getBagPrice('courier', L, W, H);
    } else if (layer1 === 'rubber') {
      costWorkOther += 20.0;
      costMatOther += settings.mat_rubber;
    }

    // --- СЛОЙ 2 (ВПП) ---
    if (layer2.includes('vpp')) {
      let vppBase = 9.00;
      if (!isNarrowLong) {
        if (isNano) vppBase = settings.vpp_w_base_nano;
        else if (isFlat) vppBase = settings.vpp_w_base_flat;
        else if (vol <= 900) vppBase = settings.vpp_w_base_micro;
        else if (vol <= 1000) vppBase = settings.vpp_w_base_small;
      }

      const vppChargeable = Math.max(0, vol - settings.vpp_threshold);
      let surcharge1 = 0;
      if (isNarrowLong) {
        surcharge1 = vppChargeable * settings.vpp_r1_narrow;
      } else {
        const limitVpp1 = Math.max(0, settings.vpp_break - settings.vpp_threshold);
        const vppVol1 = Math.min(vppChargeable, limitVpp1);
        const vppVol2 = Math.max(0, vppChargeable - limitVpp1);
        surcharge1 = (vppVol1 * settings.vpp_r1_1) + (vppVol2 * settings.vpp_r1_2);
      }

      costWorkVpp = vppBase + surcharge1;

      if (layer2 === 'vpp2') {
        let surcharge2 = 0;
        if (isNarrowLong) {
          surcharge2 = vppChargeable * settings.vpp_r2_narrow;
        } else {
          const limitVpp1 = Math.max(0, settings.vpp_break - settings.vpp_threshold);
          const vppVol1 = Math.min(vppChargeable, limitVpp1);
          const vppVol2 = Math.max(0, vppChargeable - limitVpp1);
          surcharge2 = (vppVol1 * settings.vpp_r2_1) + (vppVol2 * settings.vpp_r2_2);
        }
        costWorkVpp += (settings.vpp_w_base_2 + surcharge2);
      }

      // Материал ВПП
      let usedRate = settings.vpp_m_rate1;
      const isMicroMat = (L <= 18) && ((sumWH <= 10) || (sumWH <= 15 && H <= 2));

      if (isMicroMat) usedRate = settings.vpp_m_rate0;
      else if (sumWH <= 20) usedRate = settings.vpp_m_rate1;
      else if (sumWH <= settings.vpp_m_limit) usedRate = settings.vpp_m_rate2;
      else usedRate = settings.vpp_m_rate3;

      const rawMat = usedRate * sumWH;
      costMatVpp = (layer2 === 'vpp2') ? rawMat * 2 : rawMat;
    }

    const totalUnit = costWorkThermo + costWorkVpp + costWorkOther + costWorkKiz + costWorkCustom + costMatThermo + costMatVpp + costMatOther;
    const badge = isNano ? "NANO" : (isNarrowLong ? "NARROW" : (isFlat ? "FLAT" : "STD"));

    setResults({
      workThermo: costWorkThermo, workVpp: costWorkVpp, workOther: costWorkOther, workKiz: costWorkKiz, workCustom: costWorkCustom,
      matThermo: costMatThermo, matVpp: costMatVpp, matOther: costMatOther,
      totalUnit, totalBatch: totalUnit * qty,
      vol, sumWH, badge
    });
    
    // Если редактируем товар, обновляем его цену в списке в реальном времени
    if (activeSkuId) {
      setSkus(prev => prev.map(sku => 
        sku.id === activeSkuId ? { ...sku, totalBatch: totalUnit * qty } : sku
      ));
    }

  }, [inputs, settings, activeSkuId]);


  // --- УПРАВЛЕНИЕ СПИСКОМ ---
  const generateName = (base) => {
    const root = base || "Товар";
    
    // Автонумерация если имя не уникально или дефолтное
    if (root === "Товар" || skus.some(s => s.name === root)) {
        let maxIdx = 0;
        // Ищем максимальный номер среди "Товар #N" или "root #N"
        const regex = new RegExp(`^${root} #(\\d+)$`);
        
        skus.forEach(s => {
            let m = s.name.match(regex);
            // Если имя просто "Товар", считаем его как #1, если не занято
            if (s.name === root) {
               if(maxIdx < 1) maxIdx = 1;
            }
            if (m) {
                let idx = parseInt(m[1]);
                if (idx > maxIdx) maxIdx = idx;
            }
        });
        return `${root} #${maxIdx + 1}`;
    }
    return root;
  };

  // Обновить имя в списке при вводе
  const handleNameChange = (e) => {
    const val = e.target.value;
    setTempName(val);
    if (activeSkuId) {
       setSkus(prev => prev.map(s => s.id === activeSkuId ? {...s, name: val} : s));
    }
  };

  const handleAdd = () => {
    const name = generateName(tempName || "Товар");
    const newSku = { ...inputs, name, id: Date.now(), totalBatch: results.totalBatch };
    setSkus([...skus, newSku]);
    setTempName(''); // Сброс поля имени
    // Мы остаемся в режиме песочницы
  };

  const handleSave = () => {
    if (!activeSkuId) return;
    // При сохранении просто обновляем данные (они и так обновляются реактивно, но это "фиксация" для пользователя)
    // По сути кнопка нужна для выхода из режима редактирования или просто визуального подтверждения
    // Можно сделать выход:
    // exitEditMode();
    // Но пользователь просил "Сохранить" изменения в текущем. React state уже сделал это.
  };

  const handleDuplicate = () => {
    if (!activeSkuId) return;
    const currentSku = skus.find(s => s.id === activeSkuId);
    if (!currentSku) return;

    const baseName = currentSku.name.replace(/ \(Копия\d*\)$/, ""); // убрать старые копии
    const name = generateName(baseName + " (Копия)");
    
    const newSku = { ...currentSku, ...inputs, name, id: Date.now(), totalBatch: results.totalBatch };
    setSkus([...skus, newSku]);
    
    // Переключаемся на дубликат
    setActiveSkuId(newSku.id); 
    setTempName(newSku.name);
  };

  const loadSku = (id) => {
    const sku = skus.find(s => s.id === id);
    if (sku) {
      setActiveSkuId(id);
      setInputs({
          len: sku.len, wid: sku.wid, hgt: sku.hgt, wgt: sku.wgt, qty: sku.qty,
          layer1: sku.layer1, layer2: sku.layer2, kiz: sku.kiz, customCost: sku.customCost
      });
      setTempName(sku.name);
    }
  };

  const deleteSku = (e, id) => {
    e.stopPropagation();
    setSkus(prev => prev.filter(s => s.id !== id));
    if (activeSkuId === id) exitEditMode();
  };

  const exitEditMode = () => {
    setActiveSkuId(null);
    setTempName('');
    // Оставляем инпуты как есть (последние значения) или сбрасываем?
    // Обычно удобнее оставить, чтобы продолжить создавать похожее.
  };

  const handleParseImport = () => {
    const lines = importText.split('\n');
    const newSkus = [];
    
    // Определяем текущий индекс для авто-имен
    let maxIdx = 0;
    skus.forEach(s => {
        let m = s.name.match(/^Товар #(\d+)$/);
        if (m) maxIdx = Math.max(maxIdx, parseInt(m[1]));
    });

    lines.forEach(line => {
       if (!line.trim()) return;
       const nums = line.match(/[0-9]+([.,][0-9]+)?/g);
       if (nums && nums.length >= 3) {
         const p = nums.map(n => parseFloat(n.replace(',', '.')));
         maxIdx++;
         newSkus.push({
            id: Date.now() + Math.random(),
            name: `Товар #${maxIdx}`,
            len: p[0], wid: p[1], hgt: p[2],
            wgt: p.length > 3 ? p[3] : 0.1,
            qty: 1, layer1: 'thermo', layer2: 'vpp1', kiz: false, customCost: 0,
            totalBatch: 0 
         });
       }
    });
    
    if (newSkus.length > 0) {
        setSkus([...skus, ...newSkus]);
        setImportText('');
    }
  };

  const totalWork = results.workThermo + results.workVpp + results.workOther + results.workKiz + results.workCustom;
  const totalMat = results.matThermo + results.matVpp + results.matOther;
  const grandTotalBatch = skus.reduce((sum, sku) => sum + (sku.totalBatch || 0), 0);
  
  let errorMsg = null;
  if (inputs.layer2 !== 'none' && ['none', 'rubber'].includes(inputs.layer1)) {
     errorMsg = "Пузырчатая пленка не может быть внешней упаковкой.";
  }
  if (inputs.layer1 === 'thermo' && (inputs.len > settings.max_l || inputs.wid > settings.max_w || inputs.hgt > settings.max_h)) {
     errorMsg = `Габариты > ${settings.max_l}x${settings.max_w}x${settings.max_h} для термоусадки!`;
  }

  return (
    <CalculatorLayout title="Packaging Calculator">
      <div className={`font-sans transition-colors duration-300 ${isDarkMode ? 'bg-[#0a0a0a] text-neutral-300' : 'bg-gray-100 text-gray-800'}`}>
        <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col md:flex-row gap-6">
        
        {/* LEFT: Calculator */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 no-scrollbar">
          <div className={`rounded-xl shadow-lg p-6 border transition-colors ${isDarkMode ? 'bg-[#171717] border-neutral-800' : 'bg-white border-gray-200'}`}>
            
            {/* HEADER */}
            <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-4 gap-4 ${isDarkMode ? 'border-neutral-800' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2">
                {activeSkuId ? (
                  <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded border ${isDarkMode ? 'bg-blue-900/20 text-blue-400 border-blue-800' : 'bg-blue-100 text-blue-600 border-blue-200'}`}>
                    <span className="font-bold">Редактирование</span>
                    <button onClick={exitEditMode} className="hover:text-red-500 ml-2"><X size={12}/></button>
                  </div>
                ) : (
                  <span className={`text-xs font-normal px-2 py-1 rounded ${isDarkMode ? 'bg-neutral-800 text-neutral-500' : 'bg-gray-100 text-gray-400'}`}>Новый расчет</span>
                )}
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <input 
                    className={`text-xs border rounded px-3 py-1.5 w-full sm:w-40 focus:outline-none focus:border-blue-400 transition-colors ${isDarkMode ? 'bg-neutral-900 border-neutral-700 text-neutral-200 placeholder-neutral-600' : 'bg-white border-gray-300 text-gray-800'}`}
                    placeholder="Название SKU"
                    value={tempName}
                    onChange={handleNameChange}
                />
                
                {!activeSkuId ? (
                  <button onClick={handleAdd} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1">
                    <Plus size={14} /> В список
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1">
                      <Save size={14} />
                    </button>
                    <button onClick={handleDuplicate} className={`text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1 ${isDarkMode ? 'bg-neutral-700 hover:bg-neutral-600' : 'bg-gray-600 hover:bg-gray-700'}`}>
                      <Copy size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* INPUTS */}
            <div className="mb-6">
              <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${isDarkMode ? 'text-neutral-500' : 'text-gray-500'}`}>Параметры</h3>
              <div className="grid grid-cols-5 gap-3">
                  {['len', 'wid', 'hgt'].map(f => (
                    <div key={f}>
                      <label className={`block text-xs mb-1 ${isDarkMode ? 'text-neutral-500' : 'text-gray-500'}`}>{LABELS[f]} (см)</label>
                      <input type="number" className={`w-full border rounded p-2 text-sm focus:border-blue-500 outline-none transition-all ${isDarkMode ? 'bg-neutral-900 border-neutral-700 text-neutral-200' : 'bg-white border-gray-300'}`}
                        value={inputs[f]} onChange={(e) => setInputs({...inputs, [f]: parseFloat(e.target.value) || 0})} />
                    </div>
                  ))}
                  <div>
                    <label className={`block text-xs mb-1 ${isDarkMode ? 'text-neutral-500' : 'text-gray-500'}`}>Вес (кг)</label>
                    <input type="number" step="0.01" className={`w-full border rounded p-2 text-sm focus:border-blue-500 outline-none ${isDarkMode ? 'bg-neutral-900 border-neutral-700 text-neutral-200' : 'bg-white border-gray-300'}`}
                        value={inputs.wgt} onChange={(e) => setInputs({...inputs, wgt: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="block text-xs text-blue-500 font-bold mb-1">Кол-во</label>
                    <input type="number" min="1" className={`w-full border border-blue-400 rounded p-2 text-sm font-bold outline-none ${isDarkMode ? 'bg-blue-900/10 text-blue-100' : 'bg-blue-50 text-gray-800'}`}
                        value={inputs.qty} onChange={(e) => setInputs({...inputs, qty: parseFloat(e.target.value) || 1})} />
                  </div>
              </div>
              <div className="mt-2 text-xs text-gray-400 flex gap-4">
                  <span>V: {results.vol.toFixed(0)}</span>
                  <span>W+H: {results.sumWH.toFixed(1)}</span>
                  <span className={`ml-auto px-2 rounded font-bold ${isDarkMode ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-200 text-gray-600'}`}>{results.badge}</span>
              </div>
            </div>

            {/* LAYERS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <h3 className={`text-xs font-bold uppercase mb-2 ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}>1. Внешний</h3>
                <div className="space-y-2">
                  {LAYERS.l1.map(opt => (
                    <label key={opt.id} className={`flex items-center p-3 rounded border cursor-pointer transition-colors ${inputs.layer1 === opt.id ? (isDarkMode ? 'bg-blue-900/10 border-blue-700' : 'bg-blue-50 border-blue-400') : (isDarkMode ? 'hover:bg-neutral-800 border-neutral-800' : 'hover:bg-gray-50 border-gray-200')}`}>
                      <input type="radio" name="l1" className="hidden" checked={inputs.layer1 === opt.id} onChange={() => setInputs({...inputs, layer1: opt.id})} />
                      <div className={`w-4 h-4 rounded-full border mr-3 flex items-center justify-center ${inputs.layer1 === opt.id ? 'border-blue-500 bg-blue-500' : 'border-gray-400'}`}>
                          {inputs.layer1 === opt.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <span className={`text-sm ${isDarkMode ? 'text-neutral-300' : 'text-gray-800'}`}>{opt.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <h3 className={`text-xs font-bold uppercase mb-2 ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}>2. Внутренний</h3>
                <div className="space-y-2">
                  {LAYERS.l2.map(opt => (
                    <label key={opt.id} className={`flex items-center p-3 rounded border cursor-pointer transition-colors ${inputs.layer2 === opt.id ? (isDarkMode ? 'bg-blue-900/10 border-blue-700' : 'bg-blue-50 border-blue-400') : (isDarkMode ? 'hover:bg-neutral-800 border-neutral-800' : 'hover:bg-gray-50 border-gray-200')}`}>
                      <input type="radio" name="l2" className="hidden" checked={inputs.layer2 === opt.id} onChange={() => setInputs({...inputs, layer2: opt.id})} />
                      <div className={`w-4 h-4 rounded-full border mr-3 flex items-center justify-center ${inputs.layer2 === opt.id ? 'border-blue-500 bg-blue-500' : 'border-gray-400'}`}>
                          {inputs.layer2 === opt.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <span className={`text-sm ${isDarkMode ? 'text-neutral-300' : 'text-gray-800'}`}>{opt.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* EXTRA */}
            <div className={`mb-6 p-3 rounded border ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-gray-50 border-gray-100'}`}>
              <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${isDarkMode ? 'text-neutral-500' : 'text-gray-500'}`}>Дополнительно</h3>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" checked={inputs.kiz} onChange={(e) => setInputs({...inputs, kiz: e.target.checked})} className="rounded text-blue-600 w-4 h-4" />
                  <span className={`text-sm ${isDarkMode ? 'text-neutral-300' : 'text-gray-800'}`}>Наклейка КиЗ <span className="text-green-500 font-bold">(+10₽)</span></span>
                </label>
                
                <div className="flex items-center gap-2">
                    <span className={`text-sm ${isDarkMode ? 'text-neutral-300' : 'text-gray-800'}`}>Спец. упаковка:</span>
                    <input 
                        type="number" 
                        min="0"
                        className={`w-20 border rounded p-1 text-sm text-right focus:border-blue-500 outline-none ${isDarkMode ? 'bg-black border-neutral-700 text-white' : 'bg-white border-gray-300'}`}
                        value={inputs.customCost} 
                        onChange={(e) => setInputs({...inputs, customCost: parseFloat(e.target.value) || 0})}
                    />
                    <span className="text-xs text-gray-400">руб</span>
                </div>
              </div>
            </div>

            {/* ERROR */}
            {errorMsg && (
              <div className="mb-6 bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 p-4 rounded-r text-sm text-red-700 dark:text-red-400">
                {errorMsg}
              </div>
            )}

            {/* RESULTS */}
            <div className={`rounded-lg p-5 border text-sm transition-colors ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-gray-50 border-gray-200'} ${errorMsg ? 'opacity-50' : ''}`}>
              <div className={`mb-4 pb-4 border-b grid grid-cols-2 gap-4 ${isDarkMode ? 'border-neutral-800' : 'border-gray-200'}`}>
                <div style={{display: totalWork > 0 ? 'block' : 'none'}}>
                    <div className={`font-bold mb-1 ${isDarkMode ? 'text-neutral-300' : 'text-gray-700'}`}>Услуги</div>
                    <div className={`text-xs space-y-1 ${isDarkMode ? 'text-neutral-500' : 'text-gray-500'}`}>
                      {results.workThermo > 0 && <div className="flex justify-between"><span>Термо:</span><span>{results.workThermo.toFixed(2)}</span></div>}
                      {results.workVpp > 0 && <div className="flex justify-between"><span>ВПП:</span><span>{results.workVpp.toFixed(2)}</span></div>}
                      {results.workKiz > 0 && <div className="flex justify-between"><span>КиЗ:</span><span>{results.workKiz.toFixed(2)}</span></div>}
                      {results.workCustom > 0 && <div className="flex justify-between"><span className="text-blue-500">Спец. упак:</span><span className="text-blue-500">{results.workCustom.toFixed(2)}</span></div>}
                      {results.workOther > 0 && <div className="flex justify-between"><span>Прочее:</span><span>{results.workOther.toFixed(2)}</span></div>}
                    </div>
                </div>
                <div style={{display: totalMat > 0 ? 'block' : 'none'}}>
                    <div className={`font-bold mb-1 ${isDarkMode ? 'text-neutral-300' : 'text-gray-700'}`}>Материалы</div>
                    <div className={`text-xs space-y-1 ${isDarkMode ? 'text-neutral-500' : 'text-gray-500'}`}>
                      {results.matThermo > 0 && <div className="flex justify-between"><span>Термо:</span><span>{results.matThermo.toFixed(2)}</span></div>}
                      {results.matVpp > 0 && <div className="flex justify-between"><span>ВПП:</span><span>{results.matVpp.toFixed(2)}</span></div>}
                      {results.matOther > 0 && <div className="flex justify-between"><span>Прочее:</span><span>{results.matOther.toFixed(2)}</span></div>}
                    </div>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <div className="text-xs font-bold uppercase mb-1 text-gray-500">Цена за 1 шт</div>
                  <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{results.totalUnit.toFixed(2)} ₽</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-blue-500 font-bold uppercase mb-1">Итого за партию ({inputs.qty})</div>
                  <div className="text-3xl font-bold text-blue-600">{results.totalBatch.toFixed(0)} ₽</div>
                </div>
              </div>
            </div>

          </div>

          {/* SETTINGS PANEL */}
          <div className={`rounded-xl shadow-lg border overflow-hidden ${isDarkMode ? 'bg-black border-neutral-800 text-neutral-300' : 'bg-gray-800 border-gray-700 text-white'}`}>
            <button onClick={() => setShowSettings(!showSettings)} className="w-full p-4 flex justify-between items-center hover:bg-neutral-800 transition-colors">
                <span className="font-bold text-yellow-400 text-sm flex items-center gap-2"><Settings size={16}/> Параметры WMS</span>
                <ChevronDown size={16} className={`transform transition-transform ${showSettings ? 'rotate-180' : ''}`} />
            </button>
            
            {showSettings && (
              <div className="p-5 border-t border-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-blue-900/10 p-2 rounded col-span-2">
                    <h4 className="font-bold mb-2 text-blue-400">Базовые ставки (Услуга)</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div>База: <input className="bg-neutral-800 w-full p-1 rounded text-white" type="number" value={settings.srv_base} onChange={e => setSettings({...settings, srv_base: +e.target.value})}/></div>
                      <div>Нано: <input className="bg-neutral-800 w-full p-1 rounded text-white" type="number" value={settings.srv_base_nano} onChange={e => setSettings({...settings, srv_base_nano: +e.target.value})}/></div>
                      <div>Плоск: <input className="bg-neutral-800 w-full p-1 rounded text-white" type="number" value={settings.srv_base_flat} onChange={e => setSettings({...settings, srv_base_flat: +e.target.value})}/></div>
                    </div>
                  </div>
                  {/* Add other settings blocks as needed */}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: SKU MANAGER */}
        <div className="w-full md:w-80 flex flex-col gap-4 h-full">
          <div className={`rounded-xl shadow-lg border flex flex-col h-full overflow-hidden ${isDarkMode ? 'bg-black border-neutral-800' : 'bg-white border-gray-200'}`}>
              <div className={`p-4 border-b flex-shrink-0 ${isDarkMode ? 'border-neutral-800 bg-black' : 'border-gray-100 bg-gray-50'}`}>
                <h3 className={`font-bold text-sm flex justify-between ${isDarkMode ? 'text-neutral-200' : 'text-gray-800'}`}>
                  <span className="flex items-center gap-2"><Package size={16} className="text-blue-500"/> Менеджер SKU</span>
                  <span className={`text-xs px-2 rounded ${isDarkMode ? 'bg-neutral-800 text-neutral-400 border border-neutral-700' : 'bg-white border text-gray-400'}`}>{skus.length} шт</span>
                </h3>
              </div>
              
              <div className={`p-3 border-b flex-shrink-0 ${isDarkMode ? 'border-neutral-800 bg-black' : 'border-gray-100 bg-gray-50'}`}>
                <textarea 
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    className={`w-full h-20 text-xs p-2 border rounded resize-none focus:border-blue-500 outline-none ${isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-200' : 'bg-white border-gray-300'}`} 
                    placeholder="20x20x10&#10;15 15 5 0.5"
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={handleParseImport} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 rounded">Импорт</button>
                  <button onClick={() => setSkus([])} className={`px-3 rounded ${isDarkMode ? 'bg-neutral-800 text-neutral-400 hover:bg-red-900/30 hover:text-red-400' : 'bg-gray-200 text-gray-600 hover:bg-red-100 hover:text-red-500'}`}><Trash2 size={14}/></button>
                </div>
              </div>

              <div className={`flex-1 overflow-y-auto custom-scroll p-2 ${isDarkMode ? 'bg-neutral-900' : 'bg-gray-50/50'}`}>
                {skus.length === 0 && <div className="text-center text-xs text-gray-500 mt-10">Список пуст</div>}
                {[...skus].reverse().map(sku => {
                    const isActive = sku.id === activeSkuId;
                    const l1Obj = LAYERS.l1.find(x => x.id === sku.layer1);
                    const l2Obj = LAYERS.l2.find(x => x.id === sku.layer2);

                    return (
                      <div key={sku.id} onClick={() => loadSku(sku.id)} 
                          className={`p-3 mb-2 rounded border cursor-pointer relative group transition-all ${isActive 
                              ? (isDarkMode ? 'border-blue-500 bg-blue-900/10' : 'border-blue-400 bg-blue-50 ring-1 ring-blue-200') 
                              : (isDarkMode ? 'bg-black border-neutral-800 hover:border-blue-500' : 'bg-white border-gray-200 hover:border-blue-300')}`}>
                        
                        <div className="pr-6">
                            <div className={`font-bold text-sm truncate ${isDarkMode ? 'text-neutral-200' : 'text-gray-700'}`}>{sku.name}</div>
                            <div className="text-[10px] text-gray-400 mb-1">{sku.len}x{sku.wid}x{sku.hgt} | {sku.wgt}кг</div>
                            <div className="flex gap-1 flex-wrap">
                              {l1Obj?.short && <span className={`text-[9px] px-1 rounded border ${isDarkMode ? 'bg-neutral-800 text-neutral-400 border-neutral-700' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>{l1Obj.short}</span>}
                              {l2Obj?.short && <span className={`text-[9px] px-1 rounded border ${isDarkMode ? 'bg-blue-900/20 text-blue-400 border-blue-900' : 'bg-blue-100 text-blue-600 border-blue-200'}`}>{l2Obj.short}</span>}
                              {sku.kiz && <span className={`text-[9px] px-1 rounded border ${isDarkMode ? 'bg-green-900/20 text-green-400 border-green-900' : 'bg-green-100 text-green-700 border-green-200'}`}>КИЗ</span>}
                            </div>
                        </div>
                        
                        <div className="absolute top-3 right-3 text-right">
                            <div className={`text-xs font-bold mb-1 ${isDarkMode ? 'text-neutral-300' : 'text-gray-600'}`}>{(sku.totalBatch || 0).toFixed(0)} ₽</div>
                            <div className="text-[10px] text-blue-500 font-bold">{sku.qty} шт</div>
                        </div>

                        <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate();
                            }} className={`p-1 ${isDarkMode ? 'text-neutral-500 hover:text-blue-400' : 'text-gray-300 hover:text-blue-500'}`}><Copy size={14}/></button>
                            
                            <button onClick={(e) => deleteSku(e, sku.id)} className={`p-1 ${isDarkMode ? 'text-neutral-500 hover:text-red-400' : 'text-gray-300 hover:text-red-500'}`}><Trash2 size={14}/></button>
                        </div>
                      </div>
                    );
                })}
              </div>
              
              {/* FOOTER: TOTAL BATCH */}
              <div className={`p-4 border-t flex-shrink-0 ${isDarkMode ? 'border-neutral-800 bg-black' : 'border-gray-200 bg-white'}`}>
                  <div className="flex justify-between items-center">
                      <span className={`font-bold ${isDarkMode ? 'text-neutral-400' : 'text-gray-500'}`}>ИТОГО ПАРТИЯ:</span>
                      <span className="text-xl font-bold text-blue-600">{grandTotalBatch.toFixed(0)} ₽</span>
                  </div>
              </div>

          </div>
        </div>

        </div>
      </div>
      <style>{`
        /* Custom scrollbar for dark mode */
        .dark ::-webkit-scrollbar-track { background: #171717; }
        .dark ::-webkit-scrollbar-thumb { background: #333; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </CalculatorLayout>
  );
}