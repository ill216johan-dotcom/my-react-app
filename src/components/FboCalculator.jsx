import React, { useState, useEffect, useMemo } from 'react';
import { Truck, Box, DollarSign, RotateCcw, Map, Settings, CheckSquare, Square, Zap, Sun, Moon, RefreshCw, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const FboCalculator = () => {
  const [theme, setTheme] = useState('light');
  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  // --- Theme Classes (Light Theme Only) ---
  const t = {
      mainBg: 'bg-slate-50', mainText: 'text-slate-800', headerTitle: 'text-indigo-900',
      cardBg: 'bg-white', cardBorder: 'border-slate-200',
      inputBg: 'bg-white', inputBorder: 'border-slate-200', inputText: 'text-slate-800',
      focusRing: 'focus:ring-indigo-500',
      ffBarColor: '#6366f1', wbBarColor: '#cbd5e1', 
      tableHeaderBg: 'bg-slate-50', tableHeaderText: 'text-slate-500', tableRowBg: 'bg-white',
      ffHighlightBg: 'bg-indigo-50/30', ffHighlightText: 'text-indigo-600',
      profitBg: 'bg-emerald-50 border-emerald-100', profitText: 'text-emerald-700',
      lossBg: 'bg-orange-50 border-orange-100', lossText: 'text-orange-700',
      subtitleText: 'text-slate-500',
  };

  // --- 1. ПАРАМЕТРЫ ТОВАРА ---
  const [product, setProduct] = useState({
    price: 1500,
    cost: 500,
    width: 20,
    height: 30,
    length: 10,
    weight: 0.5,
  });

  const [manualLiterage, setManualLiterage] = useState(null);
  const [manualUnitsPerBox, setManualUnitsPerBox] = useState(null);

  // --- 2. ТАРИФЫ ФУЛФИЛМЕНТА ---
  const [ffRates, setFfRates] = useState({
    processing: 15,
    specification: 3,
    boxAssembly: 55,
    boxMaterial: 65,
  });

  // --- 3. НАСТРОЙКИ КЛИЕНТА ---
  const [clientSettings, setClientSettings] = useState({
    locIndex: 1.15, 
    selectedWhIds: [1], 
  });

  // --- 4. СКЛАДЫ (24 АКТУАЛЬНЫХ НАПРАВЛЕНИЯ) ---
  const initialWarehouses = [
    // ЦФО
    { id: 1, name: 'Коледино', region: 'ЦФО', logisticCostBox: 280, wbCoeff: 2.00, boxCount: 15, localSpeed: 24, remoteSpeed: 24, regionDemand: 25, isHub: true },
    { id: 2, name: 'Подольск', region: 'ЦФО', logisticCostBox: 280, wbCoeff: 2.00, boxCount: 0, localSpeed: 26, remoteSpeed: 28, regionDemand: 8, isHub: true },
    { id: 3, name: 'Электросталь', region: 'ЦФО', logisticCostBox: 390, wbCoeff: 1.75, boxCount: 0, localSpeed: 26, remoteSpeed: 30, regionDemand: 10, isHub: true },
    { id: 4, name: 'Тула', region: 'ЦФО', logisticCostBox: 470, wbCoeff: 1.60, boxCount: 0, localSpeed: 28, remoteSpeed: 36, regionDemand: 4, isHub: false },
    { id: 5, name: 'Рязань', region: 'ЦФО', logisticCostBox: 550, wbCoeff: 1.40, boxCount: 0, localSpeed: 28, remoteSpeed: 36, regionDemand: 2, isHub: false },
    { id: 6, name: 'Белые столбы', region: 'ЦФО', logisticCostBox: 280, wbCoeff: 2.80, boxCount: 0, localSpeed: 26, remoteSpeed: 30, regionDemand: 2, isHub: false },
    { id: 7, name: 'Котовск', region: 'ЦФО', logisticCostBox: 550, wbCoeff: 1.20, boxCount: 0, localSpeed: 30, remoteSpeed: 40, regionDemand: 1, isHub: false },
    { id: 8, name: 'Владимир (Воршинское)', region: 'ЦФО', logisticCostBox: 450, wbCoeff: 1.30, boxCount: 0, localSpeed: 28, remoteSpeed: 36, regionDemand: 2, isHub: false },
    { id: 9, name: 'Софьино', region: 'ЦФО', logisticCostBox: 350, wbCoeff: 1.00, boxCount: 0, localSpeed: 26, remoteSpeed: 30, regionDemand: 3, isHub: false },
    { id: 10, name: 'Ярославль', region: 'ЦФО', logisticCostBox: 500, wbCoeff: 1.60, boxCount: 0, localSpeed: 28, remoteSpeed: 38, regionDemand: 2, isHub: false },
    { id: 11, name: 'Воронеж', region: 'ЦФО', logisticCostBox: 550, wbCoeff: 0.75, boxCount: 0, localSpeed: 28, remoteSpeed: 40, regionDemand: 2, isHub: false },
    // СЗФО
    { id: 12, name: 'СПб (СЦ Шушары)', region: 'СЗФО', logisticCostBox: 650, wbCoeff: 2.20, boxCount: 0, localSpeed: 24, remoteSpeed: 48, regionDemand: 6, isHub: true },
    { id: 13, name: 'СПб (Уткина Заводь)', region: 'СЗФО', logisticCostBox: 650, wbCoeff: 3.00, boxCount: 0, localSpeed: 24, remoteSpeed: 48, regionDemand: 3, isHub: false },
    // ПФО
    { id: 14, name: 'Казань', region: 'ПФО', logisticCostBox: 600, wbCoeff: 2.20, boxCount: 0, localSpeed: 24, remoteSpeed: 55, regionDemand: 8, isHub: true },
    { id: 15, name: 'Новосемейкино', region: 'ПФО', logisticCostBox: 750, wbCoeff: 0.85, boxCount: 0, localSpeed: 24, remoteSpeed: 60, regionDemand: 3, isHub: false },
    { id: 16, name: 'Сарапул', region: 'ПФО', logisticCostBox: 800, wbCoeff: 0.85, boxCount: 0, localSpeed: 26, remoteSpeed: 65, regionDemand: 1, isHub: false },
    { id: 17, name: 'Пенза', region: 'ПФО', logisticCostBox: 600, wbCoeff: 1.00, boxCount: 0, localSpeed: 26, remoteSpeed: 50, regionDemand: 1, isHub: false },
    { id: 18, name: 'Нижний Новгород', region: 'ПФО', logisticCostBox: 550, wbCoeff: 1.00, boxCount: 0, localSpeed: 26, remoteSpeed: 40, regionDemand: 2, isHub: false },
    // ЮФО
    { id: 19, name: 'Краснодар', region: 'ЮФО', logisticCostBox: 650, wbCoeff: 1.65, boxCount: 0, localSpeed: 24, remoteSpeed: 52, regionDemand: 8, isHub: true },
    { id: 20, name: 'Волгоград', region: 'ЮФО', logisticCostBox: 800, wbCoeff: 1.10, boxCount: 0, localSpeed: 26, remoteSpeed: 48, regionDemand: 2, isHub: false },
    { id: 21, name: 'Невинномысск', region: 'ЮФО', logisticCostBox: 700, wbCoeff: 1.05, boxCount: 0, localSpeed: 26, remoteSpeed: 56, regionDemand: 2, isHub: false },
    // Урал
    { id: 22, name: 'Екатеринбург (Исп.)', region: 'Урал', logisticCostBox: 900, wbCoeff: 2.25, boxCount: 0, localSpeed: 24, remoteSpeed: 72, regionDemand: 5, isHub: true },
    { id: 23, name: 'Екатеринбург (Персп.)', region: 'Урал', logisticCostBox: 900, wbCoeff: 1.20, boxCount: 0, localSpeed: 24, remoteSpeed: 72, regionDemand: 2, isHub: false },
    // СФО
    { id: 24, name: 'Новосибирск', region: 'СФО', logisticCostBox: 1200, wbCoeff: 4.45, boxCount: 0, localSpeed: 24, remoteSpeed: 96, regionDemand: 4, isHub: true },
  ];

  const [warehouses, setWarehouses] = useState(initialWarehouses);

  // --- ВЫЧИСЛЕНИЯ ПАРТИИ ---

  const itemLiterage = (product.width * product.height * product.length) / 1000;
  // Литраж: либо ручной, либо расчетный
  const calcLiterage = (product.width * product.height * product.length) / 1000;
  const currentLiterage = manualLiterage !== null ? manualLiterage : calcLiterage;

  const calculatedUnitsPerBox = useMemo(() => {
    if (currentLiterage <= 0) return 0;
    return Math.floor((96 / currentLiterage) * 0.95) || 1;
  }, [currentLiterage]);
  const unitsPerBox = manualUnitsPerBox !== null ? manualUnitsPerBox : calculatedUnitsPerBox;
  
  const currentTableBoxes = useMemo(() => {
    return warehouses.reduce((sum, w) => sum + (w.boxCount || 0), 0);
  }, [warehouses]);

  const [manualTotalBoxes, setManualTotalBoxes] = useState(null);
  const [manualTotalItems, setManualTotalItems] = useState(null);
  
  const displayTotalBoxes = manualTotalBoxes !== null ? manualTotalBoxes : currentTableBoxes;
  const displayTotalItems = manualTotalItems !== null ? manualTotalItems : (displayTotalBoxes * unitsPerBox);
  
  const baseWbLogistics = 50 + Math.max(0, currentLiterage - 5) * 5;
  const totalItems = displayTotalItems;

  // --- УПРАВЛЕНИЕ ---

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

  const handleTotalBoxesChange = (newTotal) => {
      const total = Math.max(0, parseInt(newTotal) || 0);
      setManualTotalBoxes(total);
      setManualTotalItems(null);
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
      if (totalItems > 0) {
          const newBoxes = Math.ceil(totalItems / newUnits);
          setManualTotalBoxes(newBoxes);
          distributeBoxes(newBoxes);
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
    const newWarehouses = warehouses.map(w => {
      const share = w.regionDemand / totalDemand;
      const boxes = Math.round(targetTotal * share);
      return { ...w, boxCount: boxes };
    });
    const newSum = newWarehouses.reduce((sum, w) => sum + w.boxCount, 0);
    const diff = targetTotal - newSum;
    if (diff !== 0) {
      const center = newWarehouses.find(w => w.id === 1);
      if (center) center.boxCount += diff;
    }
    setWarehouses(newWarehouses);
    setManualTotalBoxes(null);
  };

  const autoDistributeLite = () => {
    const targetTotal = displayTotalBoxes > 0 ? displayTotalBoxes : 15;
    const regionDemands = {};
    let totalDemandAll = 0;
    warehouses.forEach(w => {
        if (!regionDemands[w.region]) regionDemands[w.region] = 0;
        regionDemands[w.region] += w.regionDemand;
        totalDemandAll += w.regionDemand;
    });
    const newWarehouses = warehouses.map(w => ({ ...w, boxCount: 0 }));
    const cfoDemand = regionDemands['ЦФО'] || 0;
    const cfoShare = cfoDemand / totalDemandAll;
    const cfoBoxes = Math.floor(targetTotal * cfoShare);
    const cfoWarehouses = newWarehouses.filter(w => w.region === 'ЦФО');
    const cfoInternalDemand = cfoWarehouses.reduce((sum, w) => sum + w.regionDemand, 0);
    cfoWarehouses.forEach(w => {
        const internalShare = w.regionDemand / cfoInternalDemand;
        w.boxCount = Math.floor(cfoBoxes * internalShare);
    });
    Object.keys(regionDemands).forEach(region => {
        if (region === 'ЦФО') return;
        const regDemand = regionDemands[region];
        const regShare = regDemand / totalDemandAll;
        const regBoxes = Math.round(targetTotal * regShare);
        const hub = newWarehouses.find(w => w.region === region && w.isHub) || newWarehouses.find(w => w.region === region);
        if (hub) hub.boxCount = regBoxes;
    });
    const currentSum = newWarehouses.reduce((sum, w) => sum + w.boxCount, 0);
    const diff = targetTotal - currentSum;
    if (diff !== 0) {
        const center = newWarehouses.find(w => w.id === 1);
        if (center) center.boxCount += diff;
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
      const map = {
          'ЦФО': 'bg-blue-100 text-blue-700 border-blue-200',
          'СЗФО': 'bg-cyan-100 text-cyan-700 border-cyan-200',
          'ЮФО': 'bg-orange-100 text-orange-700 border-orange-200',
          'ПФО': 'bg-emerald-100 text-emerald-700 border-emerald-200',
          'Урал': 'bg-violet-100 text-violet-700 border-violet-200',
          'СФО': 'bg-indigo-100 text-indigo-700 border-indigo-200',
          'ДВФО': 'bg-rose-100 text-rose-700 border-rose-200',
      };
      return map[region] || 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const calculateFFCost = (items, boxes) => {
      const itemsCost = items * (ffRates.processing + ffRates.specification);
      const boxesCost = boxes * (ffRates.boxAssembly + ffRates.boxMaterial);
      return itemsCost + boxesCost;
  };

  // --- РАСЧЕТЫ СЦЕНАРИЕВ ---

  const clientScenario = (() => {
    if (totalItems === 0) return { wbLogisticsUnit: 0, ffUnit: 0, avgSpeed: 0, totalCost: 0, locIndex: 0, deliveryToWhCost: 0 };

    const selectedWarehouses = warehouses.filter(w => clientSettings.selectedWhIds.includes(w.id));
    const totalSelectedDemand = selectedWarehouses.reduce((sum, w) => sum + w.regionDemand, 0);
    
    let weightedCoeff = 0;
    let weightedLogisticCost = 0;
    
    if (totalSelectedDemand > 0) {
        selectedWarehouses.forEach(w => {
            const share = w.regionDemand / totalSelectedDemand; 
            weightedCoeff += w.wbCoeff * share;
            weightedLogisticCost += w.logisticCostBox * share;
        });
    } else {
        weightedCoeff = 2.0;
        weightedLogisticCost = 280;
    }

    const locIndex = clientSettings.locIndex;
    const wbCostUnit = baseWbLogistics * weightedCoeff * locIndex;
    const deliveryToWhTotal = currentTableBoxes * weightedLogisticCost;
    const ffTotal = calculateFFCost(totalItems, currentTableBoxes) + deliveryToWhTotal;

    const whNames = selectedWarehouses.length > 3 ? `${selectedWarehouses.length} складов` : selectedWarehouses.map(w => w.name).join(', ');

    return {
      wbLogisticsUnit: wbCostUnit,
      ffUnit: ffTotal / totalItems,
      avgSpeed: 76, 
      totalCost: (wbCostUnit * totalItems) + ffTotal,
      locIndex: locIndex,
      deliveryToWhCost: deliveryToWhTotal,
      whNames: whNames || 'Не выбрано'
    };
  })();

  const distributedScenario = (() => {
    if (totalItems === 0) return { wbLogisticsUnit: 0, ffUnit: 0, avgSpeed: 0, totalCost: 0, locIndex: 0, deliveryToWhCost: 0 };

    let weightedWbLogisticsSum = 0;
    let totalDeliveryToWh = 0;
    const locIndex = 0.7; 
    let weightedSpeedSum = 0;
    let totalDemandCalc = 0;

    warehouses.forEach(w => {
       const hasStock = w.boxCount > 0;
       const speed = hasStock ? w.localSpeed : w.remoteSpeed;
       weightedSpeedSum += speed * w.regionDemand;
       totalDemandCalc += w.regionDemand;

       if (hasStock) {
           const itemsInWh = w.boxCount * unitsPerBox;
           const unitWbLog = baseWbLogistics * w.wbCoeff * locIndex;
           weightedWbLogisticsSum += unitWbLog * itemsInWh;
           totalDeliveryToWh += w.boxCount * w.logisticCostBox;
       }
    });
    
    const ffServicesAndMaterial = calculateFFCost(totalItems, currentTableBoxes);
    const totalFf = ffServicesAndMaterial + totalDeliveryToWh;
    
    return {
      wbLogisticsUnit: weightedWbLogisticsSum / totalItems,
      ffUnit: totalFf / totalItems,
      avgSpeed: weightedSpeedSum / (totalDemandCalc || 1),
      totalCost: weightedWbLogisticsSum + totalFf,
      locIndex: locIndex,
      deliveryToWhCost: totalDeliveryToWh
    };
  })();

  const profit = clientScenario.totalCost - distributedScenario.totalCost;

  const chartData = [
    {
      name: `Как сейчас (Микс)`,
      'Логистика ВБ': Math.round(clientScenario.wbLogisticsUnit),
      'Фулфилмент (Услуги + Доставка)': Math.round(clientScenario.ffUnit),
    },
    {
      name: 'С распределением (Вы)',
      'Логистика ВБ': Math.round(distributedScenario.wbLogisticsUnit),
      'Фулфилмент (Услуги + Доставка)': Math.round(distributedScenario.ffUnit),
    },
  ];

  return (
    <div className={`p-4 min-h-screen font-sans ${t.mainBg} ${t.mainText}`}>
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className={`text-2xl font-bold ${t.headerTitle} flex items-center gap-2`}>
                <Truck className="text-indigo-600" /> Калькулятор выгоды Wildberries FBO
            </h1>
            <p className={`text-sm ${t.subtitleText}`}>Управление Индексом Локализации и логистикой</p>
          </div>
          <div className="flex gap-2">
             <button 
                onClick={resetToCentral}
                className={`px-4 py-2 rounded-lg text-sm font-medium border ${t.cardBg} ${t.inputText} ${t.cardBorder} hover:bg-opacity-90 flex items-center gap-2`}
             >
                <RotateCcw size={16} /> Сброс
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Configuration (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* 1. Блок "Текущая ситуация клиента" */}
            <div className={`${t.cardBg} p-4 rounded-xl shadow-sm border ${t.cardBorder} relative overflow-hidden`}>
                <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full -mr-8 -mt-8 opacity-50 bg-orange-100`}></div>
                <h3 className={`font-bold text-sm text-orange-800 mb-3 flex items-center gap-2 relative z-10`}>
                    <Settings size={16} /> Текущая ситуация клиента
                </h3>
                
                <div className="space-y-3 relative z-10">
                    <div>
                        <label className={`text-[10px] uppercase font-bold ${t.subtitleText} mb-1 block`}>Куда возите сейчас? (выберите)</label>
                        <div className={`max-h-32 overflow-y-auto border ${t.cardBorder} rounded-lg bg-slate-50 p-1 custom-scrollbar`}>
                            {warehouses.map(w => {
                                const isSelected = clientSettings.selectedWhIds.includes(w.id);
                                return (
                                    <div 
                                        key={w.id} 
                                        onClick={() => toggleClientWarehouse(w.id)}
                                        className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded text-xs transition-colors ${isSelected 
                                            ? 'bg-orange-100 text-orange-900 font-medium'
                                            : `hover:bg-opacity-70 ${t.inputText} hover:bg-slate-200`}`}
                                    >
                                        {isSelected ? <CheckSquare size={14} className="text-orange-400"/> : <Square size={14} className="text-slate-500"/>}
                                        <span className="truncate flex-1">{w.name}</span>
                                        {isSelected && <span className="text-[9px] bg-black/10 px-1 rounded text-orange-400">x{w.wbCoeff}</span>}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                            Выбрано: {clientSettings.selectedWhIds.length}. Мы усредним тарифы по спросу.
                        </div>
                    </div>
                    
                    <div className={`pt-2 border-t ${t.cardBorder}`}>
                        <div className="flex justify-between items-center mb-1">
                            <label className={`text-[10px] uppercase font-bold ${t.subtitleText}`}>Текущий Индекс Локализации</label>
                            <span className={`text-xs font-bold text-orange-600 bg-orange-50 px-2 rounded`}>{clientSettings.locIndex}</span>
                        </div>
                        <input 
                            type="range" 
                            min="0.5" 
                            max="2.0" 
                            step="0.05"
                            value={clientSettings.locIndex}
                            onChange={(e) => setClientSettings({...clientSettings, locIndex: Number(e.target.value)})}
                            className={`w-full accent-orange-500 h-2 rounded-lg appearance-none cursor-pointer bg-slate-200`}
                        />
                        <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                            <span>0.5 (Идеал)</span>
                            <span>1.0 (Норма)</span>
                            <span>2.0 (Дорого)</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Товар */}
            <div className={`${t.cardBg} p-4 rounded-xl shadow-sm border ${t.cardBorder}`}>
               <h3 className={`font-semibold text-sm ${t.headerTitle} mb-3 flex items-center gap-2`}>
                <Box size={16} className="text-indigo-500" /> Товар (Габариты)
              </h3>
               <div className={`flex items-center gap-2 mb-2 ${manualLiterage !== null ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex-1">
                     <label className={`text-[10px] uppercase font-bold ${t.subtitleText}`}>Длина</label>
                     <input type="number" value={product.length} onChange={(e) => setProduct({...product, length: Number(e.target.value)})} className={`w-full p-1 border rounded text-center text-sm ${t.inputBg} ${t.inputBorder} ${t.inputText} ${t.focusRing}`} />
                  </div>
                  <span className={`mt-4 ${t.subtitleText}`}>x</span>
                  <div className="flex-1">
                     <label className={`text-[10px] uppercase font-bold ${t.subtitleText}`}>Ширина</label>
                     <input type="number" value={product.width} onChange={(e) => setProduct({...product, width: Number(e.target.value)})} className={`w-full p-1 border rounded text-center text-sm ${t.inputBg} ${t.inputBorder} ${t.inputText} ${t.focusRing}`} />
                  </div>
                   <span className={`mt-4 ${t.subtitleText}`}>x</span>
                  <div className="flex-1">
                     <label className={`text-[10px] uppercase font-bold ${t.subtitleText}`}>Высота</label>
                     <input type="number" value={product.height} onChange={(e) => setProduct({...product, height: Number(e.target.value)})} className={`w-full p-1 border rounded text-center text-sm ${t.inputBg} ${t.inputBorder} ${t.inputText} ${t.focusRing}`} />
                  </div>
               </div>
               
               {/* Units Per Box Manual Override */}
               <div className={`flex items-center gap-3 bg-indigo-50 p-2 rounded border border-indigo-100 mt-3`}>
                  <div className="flex-1">
                    <label className={`text-[10px] uppercase font-bold text-indigo-800 mb-1 block`}>Штук в коробе</label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            value={unitsPerBox} 
                            onChange={(e) => handleUnitsPerBoxChange(e.target.value)}
                            className={`w-full p-1.5 border rounded font-bold text-center outline-none ${t.focusRing} 
                            ${manualUnitsPerBox !== null ? `${t.cardBg} border-indigo-500 text-indigo-700` : `${t.inputBg} ${t.inputBorder} ${t.inputText}`}`}
                        />
                        {manualUnitsPerBox !== null && (
                            <button 
                                onClick={() => setManualUnitsPerBox(null)}
                                title="Вернуть авторасчет"
                                className={`p-1.5 ${t.cardBg} border ${t.inputBorder} rounded hover:bg-opacity-80 text-slate-400`}
                            >
                                <RefreshCw size={14} />
                            </button>
                        )}
                    </div>
                  </div>
                  <div className={`flex-1 border-l pl-3 border-indigo-200`}>
                      <div className="text-[10px] text-indigo-400 opacity-70 mb-1">Объем товара</div>
                      <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            value={currentLiterage.toFixed(2)}
                            onChange={(e) => handleLiterageChange(e.target.value)}
                            className={`w-full p-1 text-sm font-bold text-indigo-900 border-b border-dashed border-indigo-300 bg-transparent outline-none focus:border-indigo-600 ${manualLiterage !== null ? 'bg-white rounded border-solid border-indigo-500 px-2' : ''}`}
                          />
                          <span className="text-xs text-indigo-800 font-bold">л</span>
                          {manualLiterage !== null && (
                              <button onClick={() => setManualLiterage(null)} className="text-indigo-400 hover:text-red-500">
                                  <X size={14}/>
                              </button>
                          )}
                      </div>
                  </div>
               </div>
            </div>

            {/* 3. Распределение (Таблица) */}
             <div className={`${t.cardBg} p-4 rounded-xl shadow-sm border ${t.cardBorder} flex-grow`}>
               <div className="flex justify-between items-center mb-3">
                  <h3 className={`font-semibold text-sm ${t.headerTitle} flex items-center gap-2`}>
                    <Truck size={16} className="text-indigo-500" /> Распределение коробов
                  </h3>
               </div>
               
               {/* Кнопки распределения */}
               <div className="flex gap-2 mb-3">
                   <button onClick={autoDistributeFull} className={`flex-1 text-[11px] ${t.inputBg} ${t.inputText} border ${t.inputBorder} px-2 py-1.5 rounded hover:bg-opacity-80 transition font-medium flex justify-center items-center gap-1`}>
                      <Map size={12}/> Все склады (Max)
                   </button>
                   <button onClick={autoDistributeLite} className={`flex-1 text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1.5 rounded hover:bg-indigo-100 transition font-medium flex justify-center items-center gap-1`}>
                      <Zap size={12}/> Lite (1 хаб на округ)
                   </button>
               </div>

               {/* Редактируемые итоги */}
               <div className={`bg-slate-50 border ${t.inputBorder} rounded-lg p-3 mb-3 flex gap-3`}>
                   <div className="flex-1">
                       <div className="flex justify-between items-center mb-1">
                           <label className={`text-[10px] uppercase font-bold ${t.subtitleText}`}>Всего коробов</label>
                           {(manualTotalBoxes !== null || manualTotalItems !== null) && (
                               <button onClick={() => {setManualTotalBoxes(null); setManualTotalItems(null);}} title="Сбросить на авто-сумму" className="text-slate-400 hover:text-indigo-600">
                                   <RefreshCw size={10} />
                               </button>
                           )}
                       </div>
                       <input 
                           type="number" 
                           value={displayTotalBoxes} 
                           onChange={(e) => handleTotalBoxesChange(e.target.value)}
                           className={`w-full p-1.5 text-lg font-bold ${t.inputText} ${t.inputBg} border rounded outline-none ${t.focusRing} ${t.inputBorder}`}
                       />
                   </div>
                   <div className="flex-1 text-right">
                       <label className={`text-[10px] uppercase font-bold ${t.subtitleText} mb-1 block`}>Товаров в партии</label>
                       <div className="relative">
                           <input 
                               type="number" 
                               value={displayTotalItems}
                               onChange={(e) => handleTotalItemsChange(e.target.value)} 
                               className={`w-full p-1.5 text-lg font-bold text-indigo-600 ${t.inputBg} border ${t.inputBorder} rounded outline-none text-right ${t.focusRing} ${manualTotalItems !== null ? 'border-indigo-500/50 ring-1 ring-indigo-500/20' : ''}`}
                           />
                       </div>
                   </div>
               </div>

               <div className={`overflow-hidden border ${t.cardBorder} rounded-lg`}>
                   <div className={`flex ${t.tableHeaderBg} ${t.tableHeaderText} font-semibold border-b ${t.cardBorder} text-xs`}>
                       <div className="px-3 py-2 flex-1">Склад</div>
                       <div className="px-2 py-2 w-20 text-center">Коробов</div>
                       <div className="px-2 py-2 w-24 text-right">Тариф (₽)</div>
                   </div>
                   <div className={`divide-y ${t.cardBorder} max-h-[400px] overflow-y-auto block w-full custom-scrollbar`}>
                       {warehouses.map((w) => (
                           <div key={w.id} className={`flex w-full items-center ${w.boxCount > 0 ? t.ffHighlightBg : t.cardBg}`}>
                               <div className="px-3 py-2 flex-1 min-w-0">
                                   <div className="flex items-center gap-1.5">
                                       <span className={`font-medium ${t.inputText} truncate`} title={w.name}>{w.name}</span>
                                       {w.isHub && <span className={`text-[8px] bg-slate-200 text-slate-600 px-1 rounded flex-shrink-0`} title="Хаб LITE стратегии">HUB</span>}
                                   </div>
                                   <div className="flex gap-2 mt-1">
                                       <span className={`text-[9px] px-1.5 py-0.5 rounded border ${getRegionColor(w.region)}`}>{w.region}</span>
                                       <span className={`text-[9px] bg-slate-100 px-1.5 py-0.5 rounded ${t.subtitleText} border ${t.inputBorder}`}>ВБ x{w.wbCoeff}</span>
                                   </div>
                               </div>
                               <div className="px-2 py-2 w-20 flex items-center justify-center">
                                   <input 
                                      type="number" 
                                      min="0"
                                      value={w.boxCount} 
                                      onChange={(e) => handleBoxChange(w.id, e.target.value)}
                                      className={`w-14 p-1 text-center border rounded font-bold outline-none ${t.focusRing} 
                                        ${w.boxCount > 0 ? 'border-indigo-500/50 text-indigo-700' : `${t.inputBorder} ${t.subtitleText}`} ${t.inputBg}`}
                                   />
                               </div>
                               <div className="px-2 py-2 w-24 text-right flex items-center justify-end">
                                   <input 
                                      type="number"
                                      value={w.logisticCostBox}
                                      onChange={(e) => handleLogisticCostChange(w.id, e.target.value)}
                                      className={`w-16 p-1 text-right border border-transparent hover:border-slate-300 focus:border-indigo-300 rounded text-sm font-medium ${t.inputText} focus:ring-2 ${t.focusRing} outline-none transition-all bg-transparent focus:bg-white/10`}
                                   />
                               </div>
                           </div>
                       ))}
                   </div>
               </div>
            </div>
            
            {/* 4. Тарифы (Свернутые) */}
            <div className={`${t.cardBg} p-3 rounded-xl shadow-sm border ${t.cardBorder}`}>
                <details className="text-sm">
                    <summary className={`font-semibold ${t.inputText} cursor-pointer flex items-center gap-2`}>
                        <DollarSign size={14} className="text-green-500" /> Настройки тарифов фулфилмента
                    </summary>
                    <div className={`mt-3 space-y-4 pl-2 border-l-2 ${t.cardBorder}`}>
                        {/* Группа 1: За штуку */}
                        <div>
                            <div className="text-[10px] font-bold text-indigo-400 uppercase mb-1">За единицу товара (₽/шт)</div>
                            <div className="space-y-1">
                                <div className="flex justify-between items-center"><span className={`${t.inputText} text-xs`}>Обработка</span> <input className={`w-14 border rounded text-right text-xs p-1 ${t.inputBg} ${t.inputBorder} ${t.inputText}`} value={ffRates.processing} onChange={e => setFfRates({...ffRates, processing: +e.target.value})} /></div>
                                <div className="flex justify-between items-center"><span className={`${t.inputText} text-xs`}>Спецификация</span> <input className={`w-14 border rounded text-right text-xs p-1 ${t.inputBg} ${t.inputBorder} ${t.inputText}`} value={ffRates.specification} onChange={e => setFfRates({...ffRates, specification: +e.target.value})} /></div>
                            </div>
                        </div>
                        
                        {/* Группа 2: За короб */}
                        <div>
                             <div className="text-[10px] font-bold text-indigo-400 uppercase mb-1">За короб (₽/кор)</div>
                             <div className="space-y-1">
                                <div className="flex justify-between items-center"><span className={`${t.inputText} text-xs`}>Сборка и марк.</span> <input className={`w-14 border rounded text-right text-xs p-1 ${t.inputBg} ${t.inputBorder} ${t.inputText}`} value={ffRates.boxAssembly} onChange={e => setFfRates({...ffRates, boxAssembly: +e.target.value})} /></div>
                                <div className="flex justify-between items-center"><span className={`${t.inputText} text-xs`}>Цена короба</span> <input className={`w-14 border rounded text-right text-xs p-1 ${t.inputBg} ${t.inputBorder} ${t.inputText}`} value={ffRates.boxMaterial} onChange={e => setFfRates({...ffRates, boxMaterial: +e.target.value})} /></div>
                             </div>
                        </div>
                    </div>
                </details>
            </div>

          </div>

          {/* RIGHT: Results (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Profit Card (Unchanged) */}
                <div className={`relative overflow-hidden p-4 rounded-xl border ${profit >= 0 ? t.profitBg : t.lossBg}`}>
                    <div className="relative z-10">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Выгода за партию</div>
                        <div className={`text-2xl font-bold ${profit >= 0 ? t.profitText : t.lossText}`}>
                            {profit > 0 ? '+' : ''}{Math.round(profit).toLocaleString()} ₽
                        </div>
                        <div className="text-xs mt-1 opacity-80 ${t.subtitleText} leading-tight">
                            Улучшение Индекса локализации до <span className="font-bold">0.7</span> + экономия на коэф. складов
                        </div>
                    </div>
                </div>

                {/* 2. FF Unit Cost Card (New position) */}
                <div className={`p-4 rounded-xl border ${t.cardBg} ${t.cardBorder}`}>
                     <div className="text-xs font-bold uppercase tracking-wider ${t.subtitleText} mb-1">Фулфилмент на шт.</div>
                     <div className="flex items-center gap-3">
                         <div className={`text-2xl font-bold ${t.ffHighlightText}`}>{Math.round(distributedScenario.ffUnit)} ₽</div>
                         <div className="text-xs text-slate-500 line-through">{Math.round(clientScenario.ffUnit)} ₽</div>
                     </div>
                     <div className="text-xs mt-1 text-slate-400">
                        Услуги + Логистика до склада
                     </div>
                </div>

                {/* 3. Total Unit Cost Card (Old 2nd position) */}
                <div className={`p-4 rounded-xl border ${t.cardBg} ${t.cardBorder}`}>
                     <div className="text-xs font-bold uppercase tracking-wider ${t.subtitleText} mb-1">Итого затраты на шт.</div>
                     <div className="flex items-center gap-3">
                         <div className={`text-2xl font-bold ${t.inputText}`}>{Math.round(distributedScenario.totalCost / (totalItems || 1))} ₽</div>
                         <div className="text-xs text-slate-500 line-through">{Math.round(clientScenario.totalCost / (totalItems || 1))} ₽</div>
                     </div>
                     <div className="text-xs mt-1 text-green-400 font-medium">
                        Включая тарифы WB
                     </div>
                </div>
            </div>

            {/* Analysis Chart */}
            <div className={`${t.cardBg} p-5 rounded-xl shadow-sm border ${t.cardBorder}`}>
                 <h4 className={`font-bold ${t.inputText} mb-4 text-sm`}>Сравнение затрат на единицу</h4>
                 <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{ top: 0, right: 30, left: 20, bottom: 0 }}
                            barSize={30}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={140} tick={{fontSize: 11, fontWeight: 600, fill: '#334155'}} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }} 
                                labelStyle={{ color: '#1f2937' }}
                            />
                            <Legend wrapperStyle={{fontSize: '12px', color: '#1f2937'}}/>
                            <Bar name="Фулфилмент + Транзит" dataKey="Фулфилмент (Услуги + Доставка)" stackId="a" fill={t.ffBarColor} radius={[0, 0, 0, 0]} />
                            <Bar name="Тариф Wildberries" dataKey="Логистика ВБ" stackId="a" fill={t.wbBarColor} radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detailed Table */}
            <div className={`${t.cardBg} rounded-xl shadow-sm border ${t.cardBorder} overflow-hidden text-sm`}>
                <table className="w-full text-left">
                    <thead className={`${t.tableHeaderBg} text-xs uppercase ${t.tableHeaderText} font-semibold border-b ${t.cardBorder}`}>
                        <tr>
                            <th className="px-5 py-3">Статья расходов (вся партия)</th>
                            <th className="px-5 py-3 text-right">
                                <div>Как сейчас</div>
                                <div className="text-[9px] font-normal text-slate-400">Индекс {clientSettings.locIndex}, склад(ы):</div>
                                <div className="text-[9px] font-medium text-slate-500 truncate max-w-[150px] ml-auto">{clientScenario.whNames}</div>
                            </th>
                            <th className={`px-5 py-3 text-right ${t.ffHighlightText} bg-indigo-50/50`}>
                                <div>Ваше распределение</div>
                                <div className="text-[9px] font-normal text-indigo-400">Индекс 0.7, вся сеть</div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${t.cardBorder} ${t.inputText}`}>
                        <tr>
                            <td className="px-5 py-3">
                                <div>Логистика Wildberries</div>
                                <div className="text-xs text-slate-400">Тариф × Коэф. склада × Индекс Лок.</div>
                            </td>
                            <td className="px-5 py-3 text-right font-medium">{Math.round(clientScenario.wbLogisticsUnit * totalItems).toLocaleString()} ₽</td>
                            <td className={`px-5 py-3 text-right font-bold text-green-600 ${t.ffHighlightBg}`}>{Math.round(distributedScenario.wbLogisticsUnit * totalItems).toLocaleString()} ₽</td>
                        </tr>
                        <tr>
                            <td className="px-5 py-3">
                                <div>Наша логистика</div>
                                <div className="text-xs text-slate-400">Доставка коробов до складов</div>
                            </td>
                            <td className="px-5 py-3 text-right">{Math.round(clientScenario.deliveryToWhCost).toLocaleString()} ₽</td>
                            <td className={`px-5 py-3 text-right font-bold ${t.ffHighlightText} ${t.ffHighlightBg}`}>{Math.round(distributedScenario.deliveryToWhCost).toLocaleString()} ₽</td>
                        </tr>
                         <tr>
                            <td className="px-5 py-3">
                                <div>Услуги фулфилмента</div>
                                <div className="text-xs text-slate-400">Складская обработка, спецификация, подготовка</div>
                            </td>
                            <td className="px-5 py-3 text-right">{Math.round(calculateFFCost(totalItems, currentTableBoxes)).toLocaleString()} ₽</td>
                            <td className={`px-5 py-3 text-right ${t.ffHighlightBg}`}>{Math.round(calculateFFCost(totalItems, currentTableBoxes)).toLocaleString()} ₽</td>
                        </tr>
                        <tr className={`font-bold bg-slate-50 text-slate-900`}>
                            <td className="px-5 py-3">ИТОГО</td>
                            <td className="px-5 py-3 text-right">{Math.round(clientScenario.totalCost).toLocaleString()} ₽</td>
                            <td className={`px-5 py-3 text-right ${t.ffHighlightText} bg-indigo-50`}>{Math.round(distributedScenario.totalCost).toLocaleString()} ₽</td>
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