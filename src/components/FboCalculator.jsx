import React, { useState, useMemo } from 'react';
import { Truck, Box, DollarSign, RotateCcw, Map, Settings, CheckSquare, Square, Zap, Sun, Moon, RefreshCw, X, Lock, Unlock, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const FboCalculator = () => {
  // --- THEME STATE ---
  const [theme, setTheme] = useState('light');
  const isDark = theme === 'dark';
  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  // --- Theme Configuration ---
  const t = useMemo(() => {
    return theme === 'light'
      ? {
          // LIGHT THEME (Original)
          mainBg: 'bg-slate-50', mainText: 'text-slate-800', headerTitle: 'text-indigo-900',
          cardBg: 'bg-white', cardBorder: 'border-slate-200',
          inputBg: 'bg-white', inputBorder: 'border-slate-200', inputText: 'text-slate-800',
          focusRing: 'focus:ring-indigo-500',
          ffBarColor: '#6366f1', wbBarColor: '#cbd5e1',
          tableHeaderBg: 'bg-slate-50', tableHeaderText: 'text-slate-500', tableRowBg: 'bg-white',
          tableRowHover: 'hover:bg-slate-50',
          ffHighlightBg: 'bg-indigo-50/30', ffHighlightText: 'text-indigo-600',
          profitBg: 'bg-emerald-50 border-emerald-100', profitText: 'text-emerald-700',
          lossBg: 'bg-orange-50 border-orange-100', lossText: 'text-orange-700',
          subtitleText: 'text-slate-500',
          subText: 'text-slate-500',
          
          // Specifics
          iconPrimary: 'text-indigo-600',
          buttonBase: 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
          lockActive: 'bg-indigo-600 text-white', 
          lockInactive: 'text-indigo-400 hover:bg-indigo-100',
          wbBadge: 'bg-slate-100 text-slate-500 border-slate-200',
          chartGrid: '#e5e7eb', chartTooltipBg: '#fff', chartTooltipText: '#1f2937',
          
          // Custom inputs logic
          emptyInputBg: 'bg-slate-50', emptyInputText: 'text-slate-400', emptyInputBorder: 'border-slate-200',
          filledInputBg: 'bg-white', filledInputText: 'text-indigo-700', filledInputBorder: 'border-indigo-300'
        }
      : {
          // DARK THEME (Ozon-style: Deep Gray/Black)
          mainBg: 'bg-[#101113]', mainText: 'text-gray-100', headerTitle: 'text-white',
          cardBg: 'bg-[#1c1e23]', cardBorder: 'border-gray-700',
          inputBg: 'bg-[#25272c]', inputBorder: 'border-gray-600', inputText: 'text-gray-200',
          focusRing: 'focus:ring-indigo-500 focus:border-indigo-500',
          ffBarColor: '#818cf8', wbBarColor: '#4b5563',
          tableHeaderBg: 'bg-[#25272c]', tableHeaderText: 'text-gray-400', tableRowBg: 'bg-[#1c1e23]',
          tableRowHover: 'hover:bg-[#25272c]',
          ffHighlightBg: 'bg-[#2a2d36]', ffHighlightText: 'text-indigo-300',
          profitBg: 'bg-[#0f3925] border-[#166534]', profitText: 'text-emerald-400',
          lossBg: 'bg-[#431407] border-[#9a3412]', lossText: 'text-orange-400',
          subtitleText: 'text-gray-400',
          subText: 'text-gray-400',

          // Specifics
          iconPrimary: 'text-indigo-400',
          buttonBase: 'bg-[#25272c] border-gray-600 text-gray-300 hover:bg-[#2d3036]',
          lockActive: 'bg-indigo-600 text-white',
          lockInactive: 'text-gray-500 hover:bg-gray-700',
          wbBadge: 'bg-[#25272c] text-gray-400 border-gray-600',
          chartGrid: '#374151', chartTooltipBg: '#1f2937', chartTooltipText: '#f3f4f6',

          // Custom inputs logic
          emptyInputBg: 'bg-[#18191c]', emptyInputText: 'text-gray-600', emptyInputBorder: 'border-gray-700',
          filledInputBg: 'bg-[#2a2d36]', filledInputText: 'text-indigo-300', filledInputBorder: 'border-indigo-500/50'
        };
  }, [theme]);

  // --- 1. ПАРАМЕТРЫ ТОВАРА ---
  const [product, setProduct] = useState({
    price: 1500, cost: 500, width: 20, height: 30, length: 10, weight: 0.5
  });

  const [manualLiterage, setManualLiterage] = useState(null);
  const [manualUnitsPerBox, setManualUnitsPerBox] = useState(null);

  // --- 2. ТАРИФЫ ---
  const [ffRates, setFfRates] = useState({
    processing: 15, specification: 3, boxAssembly: 55, boxMaterial: 65
  });

  // --- 3. НАСТРОЙКИ КЛИЕНТА ---
  const [clientSettings, setClientSettings] = useState({
    locIndex: 1.15, selectedWhIds: [1]
  });
  
  const [anchorMode, setAnchorMode] = useState('items');
  const [whSearch, setWhSearch] = useState('');

  // --- 4. СКЛАДЫ ---
  const initialWarehouses = [
    // ЦФО
    { id: 1, name: 'Коледино', region: 'ЦФО', logisticCostBox: 280, wbCoeff: 2.00, boxCount: 15, regionDemand: 25, isHub: true },
    { id: 2, name: 'Подольск', region: 'ЦФО', logisticCostBox: 280, wbCoeff: 2.00, boxCount: 0, regionDemand: 8, isHub: true },
    { id: 3, name: 'Электросталь', region: 'ЦФО', logisticCostBox: 390, wbCoeff: 1.75, boxCount: 0, regionDemand: 10, isHub: true },
    { id: 4, name: 'Тула', region: 'ЦФО', logisticCostBox: 470, wbCoeff: 1.60, boxCount: 0, regionDemand: 4, isHub: false },
    { id: 5, name: 'Рязань', region: 'ЦФО', logisticCostBox: 550, wbCoeff: 1.40, boxCount: 0, regionDemand: 2, isHub: false },
    { id: 6, name: 'Белые столбы', region: 'ЦФО', logisticCostBox: 280, wbCoeff: 2.80, boxCount: 0, regionDemand: 2, isHub: false },
    { id: 7, name: 'Котовск', region: 'ЦФО', logisticCostBox: 550, wbCoeff: 1.20, boxCount: 0, regionDemand: 1, isHub: false },
    { id: 8, name: 'Владимир (Ворш.)', region: 'ЦФО', logisticCostBox: 450, wbCoeff: 1.30, boxCount: 0, regionDemand: 2, isHub: false },
    { id: 9, name: 'Софьино', region: 'ЦФО', logisticCostBox: 350, wbCoeff: 1.00, boxCount: 0, regionDemand: 3, isHub: false },
    { id: 10, name: 'Ярославль', region: 'ЦФО', logisticCostBox: 500, wbCoeff: 1.60, boxCount: 0, regionDemand: 2, isHub: false },
    { id: 11, name: 'Воронеж', region: 'ЦФО', logisticCostBox: 550, wbCoeff: 0.75, boxCount: 0, regionDemand: 2, isHub: false },
    // СЗФО
    { id: 12, name: 'СПб (СЦ Шушары)', region: 'СЗФО', logisticCostBox: 650, wbCoeff: 2.20, boxCount: 0, regionDemand: 6, isHub: true },
    { id: 13, name: 'СПб (Уткина)', region: 'СЗФО', logisticCostBox: 650, wbCoeff: 3.00, boxCount: 0, regionDemand: 3, isHub: false },
    // ПФО
    { id: 14, name: 'Казань', region: 'ПФО', logisticCostBox: 600, wbCoeff: 2.20, boxCount: 0, regionDemand: 8, isHub: true },
    { id: 15, name: 'Новосемейкино', region: 'ПФО', logisticCostBox: 750, wbCoeff: 0.85, boxCount: 0, regionDemand: 3, isHub: false },
    { id: 16, name: 'Сарапул', region: 'ПФО', logisticCostBox: 800, wbCoeff: 0.85, boxCount: 0, regionDemand: 1, isHub: false },
    { id: 17, name: 'Пенза', region: 'ПФО', logisticCostBox: 600, wbCoeff: 1.00, boxCount: 0, regionDemand: 1, isHub: false },
    { id: 18, name: 'Нижний Новгород', region: 'ПФО', logisticCostBox: 550, wbCoeff: 1.00, boxCount: 0, regionDemand: 2, isHub: false },
    // ЮФО
    { id: 19, name: 'Краснодар', region: 'ЮФО', logisticCostBox: 650, wbCoeff: 1.65, boxCount: 0, regionDemand: 8, isHub: true },
    { id: 20, name: 'Волгоград', region: 'ЮФО', logisticCostBox: 800, wbCoeff: 1.10, boxCount: 0, regionDemand: 2, isHub: false },
    { id: 21, name: 'Невинномысск', region: 'ЮФО', logisticCostBox: 700, wbCoeff: 1.05, boxCount: 0, regionDemand: 2, isHub: false },
    // Урал
    { id: 22, name: 'Екатеринбург (Исп)', region: 'Урал', logisticCostBox: 900, wbCoeff: 2.25, boxCount: 0, regionDemand: 5, isHub: true },
    { id: 23, name: 'Екатеринбург (Пер)', region: 'Урал', logisticCostBox: 900, wbCoeff: 1.20, boxCount: 0, regionDemand: 2, isHub: false },
    // СФО
    { id: 24, name: 'Новосибирск', region: 'СФО', logisticCostBox: 1200, wbCoeff: 4.45, boxCount: 0, regionDemand: 4, isHub: true },
  ];

  const [warehouses, setWarehouses] = useState(initialWarehouses);

  const filteredClientWarehouses = useMemo(() => {
    if (!whSearch) return warehouses;
    return warehouses.filter(w => w.name.toLowerCase().includes(whSearch.toLowerCase()));
  }, [warehouses, whSearch]);

  // --- ВЫЧИСЛЕНИЯ ---
  const calcLiterage = (product.width * product.height * product.length) / 1000;
  const currentLiterage = manualLiterage !== null ? manualLiterage : calcLiterage;

  const calculatedUnitsPerBox = useMemo(() => {
    if (currentLiterage <= 0) return 0;
    return Math.floor((96 / currentLiterage) * 0.95) || 1;
  }, [currentLiterage]);
  const unitsPerBox = manualUnitsPerBox !== null ? manualUnitsPerBox : calculatedUnitsPerBox;
  
  const currentTableBoxes = useMemo(() => warehouses.reduce((sum, w) => sum + (w.boxCount || 0), 0), [warehouses]);

  const [manualTotalBoxes, setManualTotalBoxes] = useState(null);
  const [manualTotalItems, setManualTotalItems] = useState(null);
  
  const displayTotalBoxes = manualTotalBoxes !== null ? manualTotalBoxes : currentTableBoxes;
  const displayTotalItems = manualTotalItems !== null ? manualTotalItems : (displayTotalBoxes * unitsPerBox);
  
  const baseWbLogistics = 50 + Math.max(0, currentLiterage - 5) * 5;
  const totalItems = displayTotalItems;

  // --- УПРАВЛЕНИЕ ---
  const distributeBoxes = (targetTotal) => {
      if (currentTableBoxes > 0) {
          const ratio = targetTotal / currentTableBoxes;
          let remainder = targetTotal;
          const newWarehouses = warehouses.map(w => {
              if (w.boxCount === 0) return w;
              const newCount = Math.floor(w.boxCount * ratio);
              remainder -= newCount;
              return { ...w, boxCount: newCount };
          });
          if (remainder > 0) {
             const activeWh = newWarehouses.find(w => w.boxCount > 0) || newWarehouses[0];
             activeWh.boxCount += remainder;
          }
          setWarehouses(newWarehouses);
      } else {
          setWarehouses(warehouses.map(w => w.id === 1 ? { ...w, boxCount: targetTotal } : w));
      }
  };

  const handleBoxChange = (id, count) => {
    const val = Math.max(0, parseInt(count) || 0);
    setWarehouses(warehouses.map(w => w.id === id ? { ...w, boxCount: val } : w));
    setManualTotalBoxes(null);
    setManualTotalItems(null);
  };

  const handleLogisticCostChange = (id, value) => {
    const val = Math.max(0, parseInt(value) || 0);
    setWarehouses(warehouses.map(w => w.id === id ? { ...w, logisticCostBox: val } : w));
  };

  const handleTotalBoxesChange = (newTotal) => {
      const total = Math.max(0, parseInt(newTotal) || 0);
      setManualTotalBoxes(total);
      
      if (anchorMode === 'items') {
          if (total > 0 && displayTotalItems > 0) {
              const newUnits = Math.ceil(displayTotalItems / total);
              setManualUnitsPerBox(Math.max(1, newUnits));
              const impliedLiterage = (96 * 0.95) / newUnits;
              setManualLiterage(impliedLiterage);
              if (manualTotalItems === null) setManualTotalItems(displayTotalItems);
          }
      } else {
          setManualTotalItems(null);
      }
      distributeBoxes(total);
  };

  const handleTotalItemsChange = (newTotalItems) => {
      const items = Math.max(0, parseInt(newTotalItems) || 0);
      setManualTotalItems(items);
      const newBoxes = Math.ceil(items / unitsPerBox);
      setManualTotalBoxes(newBoxes);
      distributeBoxes(newBoxes);
  };

  const handleUnitsPerBoxChange = (newVal) => {
      const newUnits = Math.max(1, parseInt(newVal) || 0);
      setManualUnitsPerBox(newUnits);
      if (anchorMode === 'items' && totalItems > 0) {
          const newBoxes = Math.ceil(totalItems / newUnits);
          setManualTotalBoxes(newBoxes);
          distributeBoxes(newBoxes);
      } else {
          setManualTotalItems(null); 
      }
  };

  const handleLiterageChange = (val) => {
      const num = parseFloat(val);
      setManualLiterage(isNaN(num) ? null : num);
  };

  const toggleClientWarehouse = (id) => {
    setClientSettings(prev => {
        const exists = prev.selectedWhIds.includes(id);
        const newIds = exists 
            ? prev.selectedWhIds.filter(wid => wid !== id) 
            : [...prev.selectedWhIds, id];
        return newIds.length === 0 ? prev : { ...prev, selectedWhIds: newIds };
    });
  };

  const autoDistributeFull = () => {
    const targetTotal = displayTotalBoxes > 0 ? displayTotalBoxes : 15;
    const totalDemand = warehouses.reduce((sum, w) => sum + w.regionDemand, 0);
    const newWarehouses = warehouses.map(w => ({ ...w, boxCount: Math.round(targetTotal * (w.regionDemand / totalDemand)) }));
    const currentSum = newWarehouses.reduce((sum, w) => sum + w.boxCount, 0);
    if (targetTotal - currentSum !== 0) newWarehouses[0].boxCount += (targetTotal - currentSum);
    setWarehouses(newWarehouses);
    setManualTotalBoxes(null);
  };

  const autoDistributeLite = () => {
    const targetTotal = displayTotalBoxes > 0 ? displayTotalBoxes : 15;
    const getScore = (w) => w.logisticCostBox + ((baseWbLogistics * w.wbCoeff * 1.0) * unitsPerBox);

    const newWarehouses = warehouses.map(w => ({ ...w, boxCount: 0 }));
    const selectedWarehouses = [];

    // ЦФО
    const cfoAll = newWarehouses.filter(w => w.region === 'ЦФО');
    const mandatoryCFO = cfoAll.filter(w => [1, 3].includes(w.id)); // Коледино, Электросталь
    const candidatesCFO = cfoAll.filter(w => ![1, 3].includes(w.id)).sort((a, b) => getScore(a) - getScore(b));
    selectedWarehouses.push(...mandatoryCFO, ...candidatesCFO.slice(0, 2));

    // Регионы
    ['СЗФО', 'ПФО', 'ЮФО', 'Урал', 'СФО'].forEach(region => {
        const regionWhs = newWarehouses.filter(w => w.region === region).sort((a, b) => getScore(a) - getScore(b));
        if (regionWhs.length > 0) selectedWarehouses.push(regionWhs[0]);
    });

    const totalSelectedDemand = selectedWarehouses.reduce((sum, w) => sum + w.regionDemand, 0);
    selectedWarehouses.forEach(w => {
        w.boxCount = Math.floor(targetTotal * (w.regionDemand / totalSelectedDemand));
    });

    const currentSum = newWarehouses.reduce((sum, w) => sum + w.boxCount, 0);
    if (targetTotal - currentSum !== 0) {
        const center = newWarehouses.find(w => w.id === 1);
        if (center) center.boxCount += (targetTotal - currentSum);
    }
    setWarehouses(newWarehouses);
    setManualTotalBoxes(null);
  };

  const resetToCentral = () => {
      const sum = displayTotalBoxes || 15; 
      setWarehouses(warehouses.map(w => w.id === 1 ? { ...w, boxCount: sum } : { ...w, boxCount: 0 }));
      setManualTotalBoxes(null);
      setManualTotalItems(null);
  };

  const getRegionColor = (region) => {
    if (isDark) {
        const darkMap = {
            'ЦФО': 'bg-blue-900/40 text-blue-300 border-blue-800/50',
            'СЗФО': 'bg-cyan-900/40 text-cyan-300 border-cyan-800/50',
            'ЮФО': 'bg-orange-900/40 text-orange-300 border-orange-800/50',
            'ПФО': 'bg-emerald-900/40 text-emerald-300 border-emerald-800/50',
            'Урал': 'bg-violet-900/40 text-violet-300 border-violet-800/50',
            'СФО': 'bg-indigo-900/40 text-indigo-300 border-indigo-800/50',
        };
        return darkMap[region] || 'bg-slate-700 text-slate-400 border-slate-600';
    }
    const lightMap = {
        'ЦФО': 'bg-blue-100 text-blue-700 border-blue-200',
        'СЗФО': 'bg-cyan-100 text-cyan-700 border-cyan-200',
        'ЮФО': 'bg-orange-100 text-orange-700 border-orange-200',
        'ПФО': 'bg-emerald-100 text-emerald-700 border-emerald-200',
        'Урал': 'bg-violet-100 text-violet-700 border-violet-200',
        'СФО': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    };
    return lightMap[region] || 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const calculateFFCost = (items, boxes) => {
      const itemsCost = items * (ffRates.processing + ffRates.specification);
      const boxesCost = boxes * (ffRates.boxAssembly + ffRates.boxMaterial);
      return itemsCost + boxesCost;
  };

  // --- СЦЕНАРИИ ---
  const clientScenario = (() => {
    if (totalItems === 0) return { wbLogisticsUnit: 0, ffUnit: 0, totalCost: 0, locIndex: 0, deliveryToWhCost: 0 };
    const selectedWhs = warehouses.filter(w => clientSettings.selectedWhIds.includes(w.id));
    const totalSelDemand = selectedWhs.reduce((sum, w) => sum + w.regionDemand, 0);
    
    let weightedCoeff = 0, weightedLogisticCost = 0;
    if (totalSelDemand > 0) {
        selectedWhs.forEach(w => {
            const share = w.regionDemand / totalSelDemand;
            weightedCoeff += w.wbCoeff * share;
            weightedLogisticCost += w.logisticCostBox * share;
        });
    } else { weightedCoeff = 2.0; weightedLogisticCost = 280; }

    const locIndex = clientSettings.locIndex;
    const wbCostUnit = baseWbLogistics * weightedCoeff * locIndex;
    const deliveryToWhTotal = currentTableBoxes * weightedLogisticCost;
    const ffTotal = calculateFFCost(totalItems, currentTableBoxes) + deliveryToWhTotal;
    const whNames = selectedWhs.length > 3 ? `${selectedWhs.length} складов` : selectedWhs.map(w => w.name).join(', ');

    return { wbLogisticsUnit: wbCostUnit, ffUnit: ffTotal / totalItems, totalCost: (wbCostUnit * totalItems) + ffTotal, locIndex, deliveryToWhCost: deliveryToWhTotal, whNames: whNames || 'Не выбрано' };
  })();

  const distributedScenario = (() => {
    if (totalItems === 0) return { wbLogisticsUnit: 0, ffUnit: 0, totalCost: 0, locIndex: 0, deliveryToWhCost: 0 };
    let weightedWbLogisticsSum = 0, totalDeliveryToWh = 0;
    const locIndex = 0.7; 
    warehouses.forEach(w => {
       if (w.boxCount > 0) {
           const itemsInWh = w.boxCount * unitsPerBox;
           weightedWbLogisticsSum += (baseWbLogistics * w.wbCoeff * locIndex) * itemsInWh;
           totalDeliveryToWh += w.boxCount * w.logisticCostBox;
       }
    });
    const ffServicesAndMaterial = calculateFFCost(totalItems, currentTableBoxes);
    const totalFf = ffServicesAndMaterial + totalDeliveryToWh;
    return { wbLogisticsUnit: weightedWbLogisticsSum / totalItems, ffUnit: totalFf / totalItems, totalCost: weightedWbLogisticsSum + totalFf, locIndex, deliveryToWhCost: totalDeliveryToWh };
  })();

  const profit = clientScenario.totalCost - distributedScenario.totalCost;
  const chartData = [
    { name: 'Как сейчас', 'Логистика ВБ': Math.round(clientScenario.wbLogisticsUnit), 'Фулфилмент (Услуги + Доставка)': Math.round(clientScenario.ffUnit) },
    { name: 'С распределением', 'Логистика ВБ': Math.round(distributedScenario.wbLogisticsUnit), 'Фулфилмент (Услуги + Доставка)': Math.round(distributedScenario.ffUnit) },
  ];

  return (
    <div className={`p-4 min-h-screen font-sans transition-colors duration-200 ${t.mainBg} ${t.mainText}`}>
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className={`text-2xl font-bold flex items-center gap-2 ${t.headerTitle}`}>
                <Truck className={t.iconPrimary} /> Калькулятор выгоды Wildberries FBO
            </h1>
            <p className={`text-sm ${t.subtitleText}`}>Управление Индексом Локализации и логистикой</p>
          </div>
          <div className="flex gap-2">
             <button onClick={resetToCentral} className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-2 ${t.buttonBase}`}>
                <RotateCcw size={16} /> Сброс
             </button>
             <button onClick={toggleTheme} className={`p-2 rounded-lg border transition-colors ${t.buttonBase}`}>
                {isDark ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-indigo-600" />}
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Config */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* 1. Client Settings */}
            <div className={`${t.cardBg} p-4 rounded-xl shadow-sm border ${t.cardBorder} relative overflow-hidden`}>
                <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full -mr-8 -mt-8 opacity-50 ${isDark ? 'bg-orange-900/30' : 'bg-orange-100'}`}></div>
                <h3 className={`font-bold text-sm mb-3 flex items-center gap-2 relative z-10 ${isDark ? 'text-orange-400' : 'text-orange-800'}`}>
                    <Settings size={16} /> Текущая ситуация клиента
                </h3>
                <div className="space-y-3 relative z-10">
                    <div>
                        <label className={`text-[10px] uppercase font-bold mb-1 block ${t.subtitleText}`}>Куда возите сейчас?</label>
                        <div className="relative mb-2">
                            <Search size={14} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${t.subtitleText}`} />
                            <input 
                                type="text"
                                placeholder="Поиск склада..."
                                value={whSearch}
                                onChange={(e) => setWhSearch(e.target.value)}
                                className={`w-full pl-8 p-1.5 text-xs border rounded-md outline-none ${t.inputBg} ${t.inputBorder} ${t.inputText} ${t.focusRing}`}
                            />
                        </div>
                        <div className={`max-h-32 overflow-y-auto border rounded-lg p-1 custom-scrollbar ${t.inputBg} ${t.inputBorder}`}>
                            {filteredClientWarehouses.map(w => {
                                const isSelected = clientSettings.selectedWhIds.includes(w.id);
                                return (
                                    <div key={w.id} onClick={() => setClientSettings(prev => {
                                        const newIds = prev.selectedWhIds.includes(w.id) ? prev.selectedWhIds.filter(id => id !== w.id) : [...prev.selectedWhIds, w.id];
                                        return newIds.length ? { ...prev, selectedWhIds: newIds } : prev;
                                    })} className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded text-xs transition-colors ${isSelected ? (isDark ? 'bg-orange-900/40 text-orange-200' : 'bg-orange-100 text-orange-900 font-medium') : `hover:opacity-70 ${t.inputText} ${isDark ? 'hover:bg-gray-700' : 'hover:bg-slate-200'}`}`}>
                                        {isSelected ? <CheckSquare size={14} className="text-orange-500"/> : <Square size={14} className={isDark ? "text-gray-600" : "text-slate-400"}/>}
                                        <span className="truncate flex-1">{w.name}</span>
                                        {isSelected && <span className={`text-[9px] px-1 rounded ${isDark ? 'bg-black/40 text-orange-400' : 'bg-white/50 text-orange-700'}`}>x{w.wbCoeff}</span>}
                                    </div>
                                );
                            })}
                        </div>
                        <div className={`text-[10px] mt-1 ${t.subtitleText}`}>
                            Выбрано: {clientSettings.selectedWhIds.length}. Усредняем тарифы по спросу.
                        </div>
                    </div>
                    <div className={`pt-2 border-t ${t.cardBorder}`}>
                        <div className="flex justify-between mb-1">
                            <label className={`text-[10px] uppercase font-bold ${t.subtitleText}`}>Индекс Локализации</label>
                            <span className={`text-xs font-bold px-2 rounded ${isDark ? 'text-orange-400 bg-orange-900/30' : 'text-orange-600 bg-orange-50'}`}>{clientSettings.locIndex}</span>
                        </div>
                        <input type="range" min="0.5" max="2.0" step="0.05" value={clientSettings.locIndex} onChange={(e) => setClientSettings({...clientSettings, locIndex: Number(e.target.value)})} className={`w-full accent-orange-500 h-2 rounded-lg appearance-none cursor-pointer ${isDark ? 'bg-gray-700' : 'bg-slate-200'}`} />
                        <div className={`flex justify-between text-[9px] mt-1 ${t.subtitleText}`}><span>0.5 (Идеал)</span><span>1.0 (Норма)</span><span>2.0 (Дорого)</span></div>
                    </div>
                </div>
            </div>

            {/* 2. Product */}
            <div className={`${t.cardBg} p-4 rounded-xl shadow-sm border ${t.cardBorder} transition-opacity ${manualLiterage !== null ? 'opacity-90' : ''}`}>
               <h3 className={`font-semibold text-sm mb-3 flex items-center gap-2 ${t.headerTitle}`}>
                <Box size={16} className={t.iconPrimary} /> Товар (Габариты)
              </h3>
               <div className={`flex items-center gap-2 mb-2 ${manualLiterage !== null ? 'opacity-40 pointer-events-none' : ''}`}>
                  {['length', 'width', 'height'].map(dim => (
                      <div key={dim} className="flex-1">
                         <label className={`text-[10px] uppercase font-bold mb-1 block ${t.subtitleText}`}>{dim === 'length' ? 'Длина' : dim === 'width' ? 'Ширина' : 'Высота'}</label>
                         <input type="number" value={product[dim]} onChange={(e) => setProduct({...product, [dim]: Number(e.target.value)})} className={`w-full p-1 border rounded text-center text-sm outline-none ${t.inputBg} ${t.inputBorder} ${t.inputText} ${t.focusRing}`} />
                      </div>
                  ))}
               </div>
               <div className={`flex items-center gap-3 p-2 rounded border mt-3 ${isDark ? 'bg-indigo-900/20 border-indigo-900/40' : 'bg-indigo-50 border-indigo-100'}`}>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                        <label className={`text-[10px] uppercase font-bold ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>Штук в коробе</label>
                        <button onClick={() => setAnchorMode(prev => prev === 'items' ? 'units' : 'items')} className={`text-[9px] px-1.5 rounded transition-colors ${anchorMode === 'units' ? t.lockActive : t.lockInactive}`}>
                            {anchorMode === 'units' ? <Lock size={10} /> : <Unlock size={10} />}
                        </button>
                    </div>
                    <input type="number" value={unitsPerBox} onChange={(e) => handleUnitsPerBoxChange(e.target.value)} className={`w-full p-1.5 border rounded font-bold text-center outline-none ${t.focusRing} ${manualUnitsPerBox !== null ? (isDark ? 'bg-[#25272c] border-indigo-500 text-indigo-300' : 'bg-white border-indigo-500 text-indigo-700') : `${t.inputBg} ${t.inputBorder} ${t.inputText}`}`} />
                  </div>
                  <div className={`flex-1 border-l pl-3 ${isDark ? 'border-indigo-800/50' : 'border-indigo-200'}`}>
                      <div className={`text-[10px] opacity-80 mb-1 ${isDark ? 'text-indigo-300' : 'text-indigo-400'}`}>Объем товара</div>
                      <div className="flex items-center gap-2">
                          <input type="number" value={currentLiterage.toFixed(2)} onChange={(e) => handleLiterageChange(e.target.value)} className={`w-full p-1 text-sm font-bold border-b border-dashed border-indigo-400 bg-transparent outline-none focus:border-indigo-600 ${isDark ? 'text-indigo-200' : 'text-indigo-900'} ${manualLiterage !== null ? (isDark ? 'bg-indigo-900/20 rounded border-solid border-indigo-500 px-1' : 'bg-white rounded border-solid border-indigo-500 px-2') : ''}`} />
                          <span className={`text-xs font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`}>л</span>
                          {manualLiterage !== null && <button onClick={() => setManualLiterage(null)} className="text-indigo-400 hover:text-red-500"><X size={14}/></button>}
                      </div>
                  </div>
               </div>
            </div>

            {/* 3. Distribution */}
             <div className={`${t.cardBg} p-4 rounded-xl shadow-sm border ${t.cardBorder} flex-grow`}>
               <div className="flex justify-between items-center mb-3">
                  <h3 className={`font-semibold text-sm flex items-center gap-2 ${t.headerTitle}`}>
                    <Truck size={16} className={t.iconPrimary} /> Распределение коробов
                  </h3>
               </div>
               
               <div className="flex gap-2 mb-3">
                   <button onClick={autoDistributeFull} className={`flex-1 text-[11px] border px-2 py-1.5 rounded transition font-medium flex justify-center items-center gap-1 ${t.buttonBase}`}>
                      <Map size={12}/> Все склады (Max)
                   </button>
                   <button onClick={autoDistributeLite} className={`flex-1 text-[11px] bg-indigo-500/10 text-indigo-500 border border-indigo-500/30 px-2 py-1.5 rounded hover:bg-indigo-500/20 transition font-medium flex justify-center items-center gap-1`}>
                      <Zap size={12}/> Lite (1 хаб на округ)
                   </button>
               </div>

               <div className={`border rounded-lg p-3 mb-3 flex gap-3 ${isDark ? 'bg-[#22252b] border-gray-700' : 'bg-slate-50 border-slate-200'}`}>
                   <div className="flex-1">
                       <div className="flex justify-between items-center mb-1">
                           <label className={`text-[10px] uppercase font-bold ${t.subtitleText}`}>Всего коробов</label>
                           {(manualTotalBoxes !== null || manualTotalItems !== null) && <button onClick={() => {setManualTotalBoxes(null); setManualTotalItems(null)}} className="text-gray-400 hover:text-indigo-500"><RefreshCw size={10}/></button>}
                       </div>
                       <input type="number" value={displayTotalBoxes} onChange={(e) => handleTotalBoxesChange(e.target.value)} className={`w-full p-1.5 text-lg font-bold border rounded outline-none ${t.focusRing} ${manualTotalBoxes !== null ? 'border-indigo-500' : t.inputBorder} ${manualTotalBoxes !== null ? t.filledInputBg : t.emptyInputBg} ${manualTotalBoxes !== null ? t.filledInputText : t.inputText}`} />
                   </div>
                   <div className="flex-1 text-right">
                       <div className="flex justify-end items-center mb-1 gap-2">
                           <button onClick={() => setAnchorMode(prev => prev === 'items' ? 'units' : 'items')} className={`text-[9px] px-1.5 rounded transition-colors ${anchorMode === 'items' ? t.lockActive : t.lockInactive}`}>
                                {anchorMode === 'items' ? <Lock size={10} /> : <Unlock size={10} />}
                           </button>
                           <label className={`text-[10px] uppercase font-bold ${t.subtitleText}`}>Товаров в партии</label>
                       </div>
                       <input type="number" value={displayTotalItems} onChange={(e) => handleTotalItemsChange(e.target.value)} className={`w-full p-1.5 text-lg font-bold text-indigo-500 border rounded outline-none text-right ${t.focusRing} ${manualTotalItems !== null ? (isDark ? 'border-indigo-500/50 bg-indigo-900/20' : 'border-indigo-300 bg-indigo-50/20') : `${t.inputBg} ${t.inputBorder}`}`} />
                   </div>
               </div>

               <div className={`overflow-hidden border rounded-lg ${t.cardBorder}`}>
                   <table className="w-full text-xs text-left">
                       <thead className={`${t.tableHeaderBg} ${t.tableHeaderText} font-semibold border-b ${t.cardBorder}`}>
                           <tr>
                               <th className="px-3 py-2 w-full">Склад</th>
                               <th className="px-2 py-2 w-20 text-center">Коробов</th>
                               <th className="px-2 py-2 w-24 text-right">Тариф (₽)</th>
                           </tr>
                       </thead>
                       <tbody className={`divide-y max-h-[400px] overflow-y-auto block w-full custom-scrollbar ${isDark ? 'divide-gray-800' : 'divide-slate-100'}`}>
                           {warehouses.map((w) => (
                               <tr key={w.id} className={`flex w-full table-fixed items-center ${w.boxCount > 0 ? t.ffHighlightBg : t.cardBg} ${t.tableRowHover}`}>
                                   <td className="px-3 py-2 flex-1">
                                       <div className="flex items-center gap-1.5">
                                           <span className={`font-medium truncate ${t.inputText}`} title={w.name}>{w.name}</span>
                                           {w.isHub && <span className={`text-[8px] px-1 rounded flex-shrink-0 ${t.hubBadge}`} title="Хаб LITE стратегии">HUB</span>}
                                       </div>
                                       <div className="flex gap-2 mt-1">
                                           <span className={`text-[9px] px-1.5 py-0.5 rounded border ${getRegionColor(w.region)}`}>{w.region}</span>
                                           <span className={`text-[9px] px-1.5 py-0.5 rounded border ${t.wbBadge}`}>ВБ x{w.wbCoeff}</span>
                                       </div>
                                   </td>
                                   <td className="px-2 py-2 w-20 flex items-center justify-center">
                                       <input 
                                          type="number" 
                                          min="0"
                                          value={w.boxCount} 
                                          onChange={(e) => handleBoxChange(w.id, e.target.value)}
                                          className={`w-14 p-1 text-center border rounded font-bold outline-none ${t.focusRing} 
                                            ${w.boxCount > 0 ? (isDark ? 'bg-indigo-900/20 border-indigo-500/50 text-indigo-300' : 'bg-white border-indigo-300 text-indigo-700') : `${t.emptyInputBg} ${t.emptyInputBorder} ${t.emptyInputText}`}`}
                                       />
                                   </td>
                                   <td className="px-2 py-2 w-24 text-right flex items-center justify-end">
                                       <input 
                                          type="number"
                                          value={w.logisticCostBox}
                                          onChange={(e) => handleLogisticCostChange(w.id, e.target.value)}
                                          className={`w-16 p-1 text-right border border-transparent rounded text-sm font-medium outline-none transition-all bg-transparent ${t.inputText} focus:ring-2 ${t.focusRing} ${isDark ? 'hover:border-gray-600 focus:bg-[#25262b]' : 'hover:border-slate-300 focus:bg-white'}`}
                                       />
                                   </td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
               </div>
            </div>
            
            {/* 4. Rates */}
            <div className={`${t.cardBg} p-3 rounded-xl shadow-sm border ${t.cardBorder}`}>
                <details className="text-sm">
                    <summary className={`font-semibold cursor-pointer flex items-center gap-2 ${t.inputText}`}>
                        <DollarSign size={14} className="text-green-500" /> Настройки тарифов фулфилмента
                    </summary>
                    <div className={`mt-3 space-y-4 pl-2 border-l-2 ${isDark ? 'border-gray-800' : 'border-slate-100'}`}>
                        <div>
                            <div className="text-[10px] font-bold text-indigo-400 uppercase mb-1">За единицу товара (₽/шт)</div>
                            <div className="space-y-1">
                                <div className="flex justify-between items-center"><span className={`text-xs ${t.inputText}`}>Обработка</span> <input className={`w-14 border rounded text-right text-xs p-1 ${t.inputBg} ${t.inputBorder} ${t.inputText}`} value={ffRates.processing} onChange={e => setFfRates({...ffRates, processing: +e.target.value})} /></div>
                                <div className="flex justify-between items-center"><span className={`text-xs ${t.inputText}`}>Спецификация</span> <input className={`w-14 border rounded text-right text-xs p-1 ${t.inputBg} ${t.inputBorder} ${t.inputText}`} value={ffRates.specification} onChange={e => setFfRates({...ffRates, specification: +e.target.value})} /></div>
                            </div>
                        </div>
                        <div>
                             <div className="text-[10px] font-bold text-indigo-400 uppercase mb-1">За короб (₽/кор)</div>
                             <div className="space-y-1">
                                <div className="flex justify-between items-center"><span className={`text-xs ${t.inputText}`}>Сборка и марк.</span> <input className={`w-14 border rounded text-right text-xs p-1 ${t.inputBg} ${t.inputBorder} ${t.inputText}`} value={ffRates.boxAssembly} onChange={e => setFfRates({...ffRates, boxAssembly: +e.target.value})} /></div>
                                <div className="flex justify-between items-center"><span className={`text-xs ${t.inputText}`}>Цена короба</span> <input className={`w-14 border rounded text-right text-xs p-1 ${t.inputBg} ${t.inputBorder} ${t.inputText}`} value={ffRates.boxMaterial} onChange={e => setFfRates({...ffRates, boxMaterial: +e.target.value})} /></div>
                             </div>
                        </div>
                    </div>
                </details>
            </div>
          </div>

          {/* RIGHT: Results */}
          <div className="lg:col-span-7 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`relative overflow-hidden p-4 rounded-xl border ${t.profitBg}`}>
                    <div className="relative z-10">
                        <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${t.subtitleText}`}>Выгода за партию</div>
                        <div className={`text-2xl font-bold ${t.profitText}`}>
                            {profit > 0 ? '+' : ''}{Math.round(profit).toLocaleString()} ₽
                        </div>
                        <div className={`text-xs mt-1 opacity-80 leading-tight ${t.subtitleText}`}>Улучшение Индекса локализации до <span className="font-bold">0.7</span> + экономия на коэф. складов</div>
                    </div>
                </div>
                <div className={`p-4 rounded-xl border ${t.cardBg} ${t.cardBorder}`}>
                     <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${t.subtitleText}`}>Фулфилмент на шт.</div>
                     <div className="flex items-center gap-3">
                         <div className={`text-2xl font-bold ${t.ffHighlightText}`}>{Math.round(distributedScenario.ffUnit)} ₽</div>
                         <div className={`text-xs line-through ${t.subtitleText}`}>{Math.round(clientScenario.ffUnit)} ₽</div>
                     </div>
                     <div className={`text-xs mt-1 ${t.subtitleText}`}>Услуги + Логистика до склада</div>
                </div>
                <div className={`p-4 rounded-xl border ${t.cardBg} ${t.cardBorder}`}>
                     <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${t.subtitleText}`}>Итого затраты на шт.</div>
                     <div className="flex items-center gap-3">
                         <div className={`text-2xl font-bold ${t.inputText}`}>{Math.round(distributedScenario.totalCost / (totalItems || 1))} ₽</div>
                         <div className={`text-xs line-through ${t.subtitleText}`}>{Math.round(clientScenario.totalCost / (totalItems || 1))} ₽</div>
                     </div>
                     <div className="text-xs mt-1 text-green-500 font-medium">Включая тарифы WB</div>
                </div>
            </div>

            <div className={`p-5 rounded-xl shadow-sm border ${t.cardBg} ${t.cardBorder}`}>
                 <h4 className={`font-bold mb-4 text-sm ${t.inputText}`}>Сравнение затрат на единицу</h4>
                 <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }} barSize={30}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={t.chartGrid} />
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={140} tick={{fontSize: 11, fontWeight: 600, fill: isDark ? '#9ca3af' : '#334155'}} />
                            <Tooltip contentStyle={{ backgroundColor: t.chartTooltipBg, border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`, borderRadius: '0.5rem', color: t.chartTooltipText }} />
                            <Legend wrapperStyle={{fontSize: '12px', color: isDark ? '#9ca3af' : '#1f2937'}}/>
                            <Bar name="Фулфилмент + Транзит" dataKey="Фулфилмент (Услуги + Доставка)" stackId="a" fill={t.ffBarColor} radius={[0, 0, 0, 0]} />
                            <Bar name="Тариф Wildberries" dataKey="Логистика ВБ" stackId="a" fill={t.wbBarColor} radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className={`rounded-xl shadow-sm border overflow-hidden text-sm ${t.cardBg} ${t.cardBorder}`}>
                <table className="w-full text-left">
                    <thead className={`text-xs uppercase font-semibold border-b ${t.tableHeaderBg} ${t.tableHeaderText} ${t.cardBorder}`}>
                        <tr>
                            <th className="px-5 py-3">Статья расходов (вся партия)</th>
                            <th className="px-5 py-3 text-right">
                                <div>Как сейчас</div>
                                <div className={`text-[9px] font-normal ${t.subtitleText}`}>Индекс {clientSettings.locIndex}, склад(ы):</div>
                                <div className={`text-[9px] font-medium truncate max-w-[150px] ml-auto ${t.subtitleText}`}>{clientScenario.whNames}</div>
                            </th>
                            <th className={`px-5 py-3 text-right ${t.ffHighlightText} ${isDark ? 'bg-indigo-900/10' : 'bg-indigo-50/50'}`}>
                                <div>Ваше распределение</div>
                                <div className="text-[9px] font-normal opacity-80">Индекс 0.7, вся сеть</div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${t.cardBorder} ${t.inputText}`}>
                        <tr>
                            <td className="px-5 py-3">
                                <div>Логистика Wildberries</div>
                                <div className={`text-xs ${t.subtitleText}`}>Тариф × Коэф. склада × Индекс Лок.</div>
                            </td>
                            <td className="px-5 py-3 text-right font-medium">{Math.round(clientScenario.wbLogisticsUnit * totalItems).toLocaleString()} ₽</td>
                            <td className={`px-5 py-3 text-right font-bold ${isDark ? 'text-green-400' : 'text-green-600'} ${t.ffHighlightBg}`}>{Math.round(distributedScenario.wbLogisticsUnit * totalItems).toLocaleString()} ₽</td>
                        </tr>
                        <tr>
                            <td className="px-5 py-3">
                                <div>Наша логистика</div>
                                <div className={`text-xs ${t.subtitleText}`}>Доставка коробов до складов</div>
                            </td>
                            <td className="px-5 py-3 text-right">{Math.round(clientScenario.deliveryToWhCost).toLocaleString()} ₽</td>
                            <td className={`px-5 py-3 text-right font-bold ${t.ffHighlightText} ${t.ffHighlightBg}`}>{Math.round(distributedScenario.deliveryToWhCost).toLocaleString()} ₽</td>
                        </tr>
                         <tr>
                            <td className="px-5 py-3">
                                <div>Услуги фулфилмента</div>
                                <div className={`text-xs ${t.subtitleText}`}>Складская обработка, спецификация, подготовка</div>
                            </td>
                            <td className="px-5 py-3 text-right">{Math.round(calculateFFCost(totalItems, currentTableBoxes)).toLocaleString()} ₽</td>
                            <td className={`px-5 py-3 text-right ${t.ffHighlightBg}`}>{Math.round(calculateFFCost(totalItems, currentTableBoxes)).toLocaleString()} ₽</td>
                        </tr>
                        <tr className={`font-bold ${t.tableHeaderBg}`}>
                            <td className="px-5 py-3">ИТОГО</td>
                            <td className="px-5 py-3 text-right">{Math.round(clientScenario.totalCost).toLocaleString()} ₽</td>
                            <td className={`px-5 py-3 text-right ${t.ffHighlightText} ${isDark ? 'bg-indigo-900/20' : 'bg-indigo-50'}`}>{Math.round(distributedScenario.totalCost).toLocaleString()} ₽</td>
                        </tr>
                    </tbody>
                </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FboCalculator;
