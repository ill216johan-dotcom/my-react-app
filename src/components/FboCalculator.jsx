import React, { useState, useMemo } from 'react';
import { Truck, Box, TrendingUp, DollarSign, Clock, BarChart3, Calculator, RotateCcw, Package, Info, Edit3, ArrowRight, RefreshCw, Map, Settings, CheckSquare, Square, Moon, Sun } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const FboCalculator = () => {
  // --- STATE: THEME ---
  const [isDarkMode, setIsDarkMode] = useState(false);

  // --- 1. ПАРАМЕТРЫ ТОВАРА ---
  const [product, setProduct] = useState({
    price: 1500, // Цена продажи
    cost: 500, // Себестоимость товара
    width: 20,
    height: 30,
    length: 10,
    weight: 0.5,
  });

  // Ручное переопределение количества штук в коробе
  const [manualUnitsPerBox, setManualUnitsPerBox] = useState(null);

  // --- 2. ТАРИФЫ ФУЛФИЛМЕНТА ---
  const [ffRates, setFfRates] = useState({
    processing: 15,    // Складская обработка (за шт)
    specification: 3,  // Спецификация (за шт)
    boxAssembly: 55,   // Сборка короба и маркировка (за короб)
    boxMaterial: 65,   // Стоимость самого короба (за короб)
    deliveryToRfc: 140, // Наша логистика до склада (по аналогии с Озон)
  });

  // --- 3. НАСТРОЙКИ КЛИЕНТА ---
  const [clientSettings, setClientSettings] = useState({
    locIndex: 1.15, // Индекс локализации клиента (текущая ситуация)
    selectedWhIds: [1], // Выбранные склады для текущей ситуации
  });

  // --- 4. СКЛАДЫ (АКТУАЛЬНЫЕ НАПРАВЛЕНИЯ WB) ---
  const initialWarehouses = [
    // ЦФО
    { id: 1, name: 'Коледино', region: 'ЦФО', logisticCostBox: 280, wbCoeff: 2.00, boxCount: 15, regionDemand: 25, isHub: true },
    { id: 2, name: 'Подольск', region: 'ЦФО', logisticCostBox: 280, wbCoeff: 2.00, boxCount: 0, regionDemand: 8, isHub: true },
    { id: 3, name: 'Электросталь', region: 'ЦФО', logisticCostBox: 390, wbCoeff: 1.75, boxCount: 0, regionDemand: 10, isHub: true },
    // СЗФО
    { id: 12, name: 'СПб (Шушары)', region: 'СЗФО', logisticCostBox: 650, wbCoeff: 2.20, boxCount: 0, regionDemand: 6, isHub: true },
    // ПФО
    { id: 14, name: 'Казань', region: 'ПФО', logisticCostBox: 600, wbCoeff: 2.20, boxCount: 0, regionDemand: 8, isHub: true },
    // ЮФО
    { id: 19, name: 'Краснодар', region: 'ЮФО', logisticCostBox: 650, wbCoeff: 1.65, boxCount: 0, regionDemand: 8, isHub: true },
    // Урал
    { id: 22, name: 'Екатеринбург', region: 'Урал', logisticCostBox: 900, wbCoeff: 2.25, boxCount: 0, regionDemand: 5, isHub: true },
    // СФО
    { id: 24, name: 'Новосибирск', region: 'СФО', logisticCostBox: 1200, wbCoeff: 4.45, boxCount: 0, regionDemand: 4, isHub: true },
  ];

  const [warehouses, setWarehouses] = useState(initialWarehouses);

  // --- ВЫЧИСЛЕНИЯ ПАРТИИ ---

  const itemLiterage = (product.width * product.height * product.length) / 1000;
  const calculatedUnitsPerBox = useMemo(() => {
    if (itemLiterage <= 0) return 0;
    return Math.floor((96 / itemLiterage) * 0.95) || 1;
  }, [itemLiterage]);
  const unitsPerBox = manualUnitsPerBox !== null ? manualUnitsPerBox : calculatedUnitsPerBox;
  
  // Текущая сумма коробов в таблице (фактическая)
  const currentTableBoxes = useMemo(() => {
    return warehouses.reduce((sum, w) => sum + (w.boxCount || 0), 0);
  }, [warehouses]);

  const [manualTotalItems, setManualTotalItems] = useState(null);
  
  // Эффективное значение товаров
  const totalItems = manualTotalItems !== null ? manualTotalItems : (currentTableBoxes * unitsPerBox);
  
  // Базовая логистика WB (фиксированный тариф + за литраж свыше 5л)
  // Взято из оригинального WB2.py: 50 + Math.max(0, itemLiterage - 5) * 5
  const baseWbLogistics = 50 + Math.max(0, itemLiterage - 5) * 5;

  // --- УПРАВЛЕНИЕ ---

  const handleBoxChange = (id, count) => {
    const val = Math.max(0, parseInt(count) || 0);
    setWarehouses(warehouses.map(w => w.id === id ? { ...w, boxCount: val } : w));
    setManualTotalItems(null);
  };

  const distributeBoxes = (targetTotal, strategy = 'current_ratio') => {
      let newWarehouses = [...warehouses];
      if (strategy === 'demand_full') {
          // Распределение по спросу (полное)
          const totalDemand = warehouses.reduce((sum, w) => sum + w.regionDemand, 0);
          newWarehouses = warehouses.map(w => ({
              ...w,
              boxCount: Math.round(targetTotal * (w.regionDemand / totalDemand))
          }));

      } else if (strategy === 'demand_lite') {
          // Распределение по спросу (лайт) - только хабы
          const activeHubs = warehouses.filter(w => w.isHub);
          const totalHubDemand = activeHubs.reduce((sum, w) => sum + w.regionDemand, 0);
          
          newWarehouses = warehouses.map(w => ({ ...w, boxCount: 0 }));
          
          activeHubs.forEach(hub => {
             const boxes = Math.round(targetTotal * (hub.regionDemand / totalHubDemand));
             const targetWh = newWarehouses.find(w => w.id === hub.id);
             if (targetWh) targetWh.boxCount = boxes;
          });
      } else {
           // Распределение пропорционально текущим (для ручного изменения итогов)
          if (currentTableBoxes > 0) {
              const ratio = targetTotal / currentTableBoxes;
              let remainder = targetTotal;
              newWarehouses = warehouses.map(w => {
                  const newCount = Math.floor(w.boxCount * ratio);
                  remainder -= newCount;
                  return { ...w, boxCount: newCount };
              });
              if (remainder > 0) {
                 const activeWh = newWarehouses.find(w => w.boxCount > 0) || newWarehouses.find(w => w.id === 1);
                 if (activeWh) activeWh.boxCount += remainder;
              }
          } else {
              // Если коробов не было, кладем все в Коледино
              newWarehouses = warehouses.map(w => w.id === 1 ? { ...w, boxCount: targetTotal } : { ...w, boxCount: 0 });
          }
      }
      
      // Коррекция итогов (из-за округления)
      const currentSum = newWarehouses.reduce((sum, w) => sum + w.boxCount, 0);
      const diff = targetTotal - currentSum;
      const center = newWarehouses.find(w => w.id === 1);
      if (center) center.boxCount += diff;

      setWarehouses(newWarehouses);
      setManualTotalItems(null);
  };

  const handleTotalBoxesChange = (newTotal) => {
      const total = Math.max(0, parseInt(newTotal) || 0);
      distributeBoxes(total, 'current_ratio');
  };

  const handleTotalItemsChange = (newTotalItems) => {
      const items = Math.max(0, parseInt(newTotalItems) || 0);
      setManualTotalItems(items);
      
      const newBoxes = Math.ceil(items / unitsPerBox);
      distributeBoxes(newBoxes, 'current_ratio');
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

  const resetToCentral = () => {
      const sum = currentTableBoxes > 0 ? currentTableBoxes : 15; 
      setWarehouses(warehouses.map(w => w.id === 1 ? { ...w, boxCount: sum } : { ...w, boxCount: 0 }));
      setManualTotalItems(null);
  };

  const calculateFFCost = (items, boxes) => {
      const itemsCost = items * (ffRates.processing + ffRates.specification);
      const boxesCost = boxes * (ffRates.boxAssembly + ffRates.boxMaterial);
      return itemsCost + boxesCost + (boxes * ffRates.deliveryToRfc);
  };

  // --- РАСЧЕТЫ СЦЕНАРИЕВ ---

  // Сценарий 1: Текущая ситуация клиента
  const clientScenario = useMemo(() => {
    if (totalItems === 0) return { wbLogisticsUnit: 0, ffUnit: 0, totalCost: 0, locIndex: 0, deliveryToWhCost: 0 };

    const selectedWarehouses = warehouses.filter(w => clientSettings.selectedWhIds.includes(w.id));
    const totalSelectedDemand = selectedWarehouses.reduce((sum, w) => sum + w.regionDemand, 0);
    
    let weightedCoeff = 0;
    
    if (totalSelectedDemand > 0) {
        selectedWarehouses.forEach(w => {
            const share = w.regionDemand / totalSelectedDemand; 
            weightedCoeff += w.wbCoeff * share;
        });
    } else {
        weightedCoeff = 2.0;
    }

    const locIndex = clientSettings.locIndex;
    const wbCostUnit = baseWbLogistics * weightedCoeff * locIndex;
    const ffTotal = calculateFFCost(totalItems, currentTableBoxes);

    const whNames = selectedWarehouses.length > 3 ? `${selectedWarehouses.length} складов` : selectedWarehouses.map(w => w.name).join(', ');

    return {
      wbLogisticsUnit: wbCostUnit,
      ffUnit: ffTotal / totalItems,
      totalCost: (wbCostUnit * totalItems) + ffTotal,
      locIndex: locIndex,
      whNames: whNames || 'Не выбрано'
    };
  }, [totalItems, clientSettings, warehouses, currentTableBoxes, baseWbLogistics]);

  // Сценарий 2: Распределенная поставка (как предлагает фулфилмент)
  const distributedScenario = useMemo(() => {
    if (totalItems === 0) return { wbLogisticsUnit: 0, ffUnit: 0, totalCost: 0, locIndex: 0, deliveryToWhCost: 0 };

    let weightedWbLogisticsSum = 0;
    const locIndex = 0.7; // Идеал локализации (0.7)
    
    warehouses.forEach(w => {
       if (w.boxCount > 0) {
           const itemsInWh = w.boxCount * unitsPerBox;
           const unitWbLog = baseWbLogistics * w.wbCoeff * locIndex; // Считаем по идеальному индексу и реальному коэф. склада
           weightedWbLogisticsSum += unitWbLog * itemsInWh;
       }
    });
    
    const totalFf = calculateFFCost(totalItems, currentTableBoxes);
    
    return {
      wbLogisticsUnit: weightedWbLogisticsSum / totalItems,
      ffUnit: totalFf / totalItems,
      totalCost: weightedWbLogisticsSum + totalFf,
      locIndex: locIndex,
    };
  }, [totalItems, warehouses, currentTableBoxes, baseWbLogistics, unitsPerBox]);

  const profit = clientScenario.totalCost - distributedScenario.totalCost;

  // --- РАСЧЕТ ЗАТРАТ НА ЕДИНИЦУ ---
  const unitCostCurrent = totalItems > 0 ? clientScenario.totalCost / totalItems : 0;
  const unitCostTarget = totalItems > 0 ? distributedScenario.totalCost / totalItems : 0;

  const unitFfCost = (ffRates.processing + ffRates.specification) + 
                     ((ffRates.boxAssembly + ffRates.boxMaterial + ffRates.deliveryToRfc) / unitsPerBox);

  const chartData = [
    {
      name: `Текущая ситуация`,
      'Фулфилмент + Логистика': Math.round(unitFfCost),
      'Тариф Wildberries': Math.round(clientScenario.wbLogisticsUnit),
    },
    {
      name: 'Оптимальное решение',
      'Фулфилмент + Логистика': Math.round(unitFfCost),
      'Тариф Wildberries': Math.round(distributedScenario.wbLogisticsUnit),
    },
  ];

  // --- Стили для светлой/темной темы ---
  const theme = {
    bg: isDarkMode ? 'bg-zinc-950' : 'bg-slate-50',
    card: isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200',
    text: isDarkMode ? 'text-zinc-200' : 'text-slate-800',
    inputBg: isDarkMode ? 'bg-zinc-950 border-zinc-700 text-zinc-200' : 'bg-white border-slate-200 text-slate-700',
    primary: isDarkMode ? 'text-indigo-400' : 'text-indigo-700',
    secondary: isDarkMode ? 'text-slate-400' : 'text-slate-500',
    highlight: isDarkMode ? 'bg-indigo-950 border-indigo-900' : 'bg-indigo-50 border-indigo-100',
    tableHeaderBg: isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-200',
    tableRowActive: isDarkMode ? 'bg-indigo-950' : 'bg-indigo-50',
    profitPositive: isDarkMode ? 'bg-emerald-950 border-emerald-900 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-700',
    profitNegative: isDarkMode ? 'bg-orange-950 border-orange-900 text-orange-400' : 'bg-orange-50 border-orange-100 text-orange-700',
  };

  return (
    <div className={isDarkMode ? 'dark' : ''}>
    <div className={`p-4 ${theme.bg} min-h-screen font-sans ${theme.text} transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className={`text-2xl font-bold ${theme.primary} flex items-center gap-2`}>
                <Truck className={theme.primary} /> Калькулятор выгоды Wildberries FBO
            </h1>
            <p className={`text-sm ${theme.secondary}`}>Оптимизация Индекса Локализации и логистических затрат</p>
          </div>
          <div className="flex gap-2">
             <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`bg-white dark:bg-zinc-900 px-3 py-2 rounded-lg text-sm font-medium border ${theme.card} hover:bg-slate-50 dark:hover:bg-zinc-800 ${theme.secondary} transition-colors`}
             >
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
             </button>
             <button 
                onClick={resetToCentral}
                className={`bg-white dark:bg-zinc-900 px-4 py-2 rounded-lg text-sm font-medium border ${theme.card} hover:bg-slate-50 dark:hover:bg-zinc-800 ${theme.secondary} flex items-center gap-2 transition-colors`}
             >
                <RotateCcw size={16} /> Сброс
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Configuration (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* 1. Блок "Текущая ситуация клиента" */}
            <div className={`p-4 rounded-xl border ${theme.card} relative overflow-hidden`}>
                <h3 className={`font-bold text-sm ${theme.primary} mb-3 flex items-center gap-2 relative z-10`}>
                    <Settings size={16} /> Текущая ситуация клиента (Сравнение)
                </h3>
                
                <div className="space-y-3 relative z-10">
                    <div>
                        <label className={`text-[10px] uppercase font-bold ${theme.secondary} mb-1 block`}>Куда возите сейчас? (выберите склады)</label>
                        <div className={`max-h-32 overflow-y-auto border ${theme.card} rounded-lg ${theme.secondary} p-1`}>
                            {warehouses.map(w => {
                                const isSelected = clientSettings.selectedWhIds.includes(w.id);
                                return (
                                    <div 
                                        key={w.id} 
                                        onClick={() => toggleClientWarehouse(w.id)}
                                        className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded text-xs transition-colors ${isSelected ? 'bg-orange-100 dark:bg-orange-950 text-orange-900 dark:text-orange-300 font-medium' : 'hover:bg-slate-200 dark:hover:bg-zinc-800'}`}
                                    >
                                        {isSelected ? <CheckSquare size={14} className="text-orange-600 dark:text-orange-400"/> : <Square size={14} className="text-slate-400 dark:text-zinc-600"/>}
                                        <span className="truncate flex-1">{w.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    <div className={`pt-2 border-t ${theme.card}`}>
                        <div className="flex justify-between items-center mb-1">
                            <label className={`text-[10px] uppercase font-bold ${theme.secondary}`}>Текущий Индекс Локализации</label>
                            <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950 px-2 rounded">{clientSettings.locIndex}</span>
                        </div>
                        <input 
                            type="range" 
                            min="0.1" 
                            max="3.0" 
                            step="0.05"
                            value={clientSettings.locIndex}
                            onChange={(e) => setClientSettings({...clientSettings, locIndex: Number(e.target.value)})}
                            className="w-full accent-orange-500 h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-slate-400 dark:text-zinc-500 mt-1">
                            <span>0.7 (Идеал)</span>
                            <span>1.0 (Норма)</span>
                            <span>1.5+ (Дорого)</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Товар */}
            <div className={`p-4 rounded-xl border ${theme.card}`}>
               <h3 className={`font-semibold text-sm ${theme.primary} mb-3 flex items-center gap-2`}>
                <Box size={16} /> Товар (Габариты и Цена)
              </h3>
               <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1">
                     <label className={`text-[10px] uppercase font-bold ${theme.secondary}`}>Длина</label>
                     <input type="number" value={product.length} onChange={(e) => setProduct({...product, length: Number(e.target.value)})} className={`w-full p-1 border rounded text-center text-sm ${theme.inputBg}`} />
                  </div>
                  <div className="flex-1">
                     <label className={`text-[10px] uppercase font-bold ${theme.secondary}`}>Ширина</label>
                     <input type="number" value={product.width} onChange={(e) => setProduct({...product, width: Number(e.target.value)})} className={`w-full p-1 border rounded text-center text-sm ${theme.inputBg}`} />
                  </div>
                   <div className="flex-1">
                     <label className={`text-[10px] uppercase font-bold ${theme.secondary}`}>Высота</label>
                     <input type="number" value={product.height} onChange={(e) => setProduct({...product, height: Number(e.target.value)})} className={`w-full p-1 border rounded text-center text-sm ${theme.inputBg}`} />
                  </div>
               </div>
               
                <div className="mb-2">
                   <label className={`text-[10px] uppercase font-bold ${theme.secondary}`}>Цена товара</label>
                   <div className="relative">
                        <input type="number" value={product.price} onChange={(e) => setProduct({...product, price: Number(e.target.value)})} className={`w-full p-1.5 border rounded pl-8 font-bold ${theme.text} ${theme.inputBg}`} />
                        <span className={`absolute left-2 top-1.5 ${theme.secondary}`}>₽</span>
                   </div>
               </div>
               
               {/* Units Per Box Manual Override */}
               <div className={`flex items-center gap-3 p-2 rounded border ${theme.highlight} mt-3`}>
                  <div className="flex-1">
                    <label className={`text-[10px] uppercase font-bold ${theme.primary} mb-1 block`}>Штук в коробе</label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            value={unitsPerBox} 
                            onChange={(e) => setManualUnitsPerBox(Number(e.target.value))}
                            className={`w-full p-1.5 border rounded font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500 ${theme.inputBg} ${manualUnitsPerBox !== null ? 'border-indigo-400 dark:border-indigo-700' : ''}`}
                        />
                        {manualUnitsPerBox !== null && (
                            <button 
                                onClick={() => setManualUnitsPerBox(null)}
                                title="Вернуть авторасчет"
                                className={`p-1.5 border rounded hover:bg-slate-50 ${theme.inputBg} ${theme.secondary}`}
                            >
                                <RefreshCw size={14} />
                            </button>
                        )}
                    </div>
                  </div>
                  <div className={`flex-1 border-l ${theme.highlight} pl-3`}>
                      <div className={`text-[10px] ${theme.primary} opacity-70`}>Объем товара</div>
                      <div className="font-semibold text-sm">{itemLiterage.toFixed(2)} л</div>
                  </div>
               </div>
            </div>

            {/* 3. Распределение (Таблица) */}
             <div className={`p-4 rounded-xl border ${theme.card} flex-grow flex flex-col h-[500px]`}>
               <div className="flex justify-between items-center mb-3">
                  <h3 className={`font-semibold text-sm ${theme.primary} flex items-center gap-2`}>
                    <Map size={16} /> Распределение коробов (Ваш план)
                  </h3>
               </div>
               
               {/* Кнопки распределения */}
               <div className="flex gap-2 mb-3">
                   <button onClick={() => distributeBoxes(currentTableBoxes > 0 ? currentTableBoxes : 15, 'demand_full')} className={`flex-1 text-[11px] bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border ${theme.card} px-2 py-1.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 transition font-medium flex justify-center items-center gap-1`}>
                      <Map size={12}/> Все склады (Max)
                   </button>
                   <button onClick={() => distributeBoxes(currentTableBoxes > 0 ? currentTableBoxes : 15, 'demand_lite')} className={`flex-1 text-[11px] ${theme.highlight} text-indigo-700 dark:text-indigo-300 px-2 py-1.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900 transition font-medium flex justify-center items-center gap-1`}>
                      <Truck size={12}/> Hubs Only (Lite)
                   </button>
               </div>

               {/* Редактируемые итоги */}
               <div className={`border ${theme.card} rounded-lg p-3 mb-3 flex gap-3 ${theme.highlight}`}>
                   <div className="flex-1">
                       <label className={`text-[10px] uppercase font-bold ${theme.secondary} mb-1 block`}>Всего коробов</label>
                       <input 
                           type="number" 
                           value={currentTableBoxes} 
                           onChange={(e) => handleTotalBoxesChange(e.target.value)}
                           className={`w-full p-1.5 text-lg font-bold ${theme.text} bg-white dark:bg-zinc-900 border rounded outline-none focus:ring-2 focus:ring-indigo-500 ${theme.inputBg}`}
                       />
                   </div>
                   <div className="flex-1 text-right">
                       <label className={`text-[10px] uppercase font-bold ${theme.secondary} mb-1 block`}>Товаров в партии</label>
                       <div className="relative">
                           <input 
                               type="number" 
                               value={totalItems}
                               onChange={(e) => handleTotalItemsChange(e.target.value)} 
                               className={`w-full p-1.5 text-lg font-bold text-indigo-600 dark:text-indigo-400 border rounded outline-none text-right focus:ring-2 focus:ring-indigo-500 ${theme.inputBg}`}
                           />
                           {manualTotalItems !== null && <span className="absolute right-12 top-2.5 text-[10px] text-indigo-300 pointer-events-none">фиксир.</span>}
                       </div>
                   </div>
               </div>
               
               <div className={`overflow-y-auto custom-scrollbar border ${theme.card} rounded-lg flex-1`}>
                   <table className="w-full text-xs text-left">
                       <thead className={`text-slate-50 dark:text-zinc-400 font-semibold border-b ${theme.tableHeaderBg} sticky top-0 z-10`}>
                           <tr>
                               <th className="px-3 py-2">Склад</th>
                               <th className="px-2 py-2 text-right">Тариф WB x Коэф</th>
                               <th className="px-2 py-2 text-center">Коробов</th>
                           </tr>
                       </thead>
                       <tbody className={`divide-y ${isDarkMode ? 'divide-zinc-800' : 'divide-slate-100'}`}>
                           {warehouses.map((w) => (
                               <tr key={w.id} className={`${w.boxCount > 0 ? theme.tableRowActive : 'bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800'} border-b ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
                                   <td className="px-3 py-2">
                                       <div className="flex items-center gap-1.5">
                                           <span className={`font-medium ${theme.text} truncate`}>{w.name}</span>
                                       </div>
                                       <div className="flex gap-2 mt-1">
                                           <span className={`text-[9px] px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-900 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300`}>WB x{w.wbCoeff}</span>
                                       </div>
                                   </td>
                                   <td className="px-2 py-2 text-right">
                                        <div className="font-medium">{baseWbLogistics * w.wbCoeff} ₽</div>
                                   </td>
                                   <td className="px-2 py-2 text-center w-20">
                                       <input 
                                          type="number" 
                                          min="0"
                                          value={w.boxCount} 
                                          onChange={(e) => handleBoxChange(w.id, e.target.value)}
                                          className={`w-14 p-1 text-center border rounded font-bold outline-none focus:ring-2 focus:ring-indigo-500 ${theme.inputBg} ${w.boxCount > 0 ? 'border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-zinc-900' : 'border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-600'}`}
                                       />
                                   </td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
               </div>
            </div>
            
            {/* 4. Тарифы (Свернутые) */}
            <div className={`p-3 rounded-xl border ${theme.card}`}>
                <details className="text-sm">
                    <summary className={`font-semibold ${theme.secondary} cursor-pointer flex items-center gap-2`}>
                        <DollarSign size={14} /> Настройки тарифов
                    </summary>
                    <div className="mt-3 space-y-3 pl-2 border-l-2 border-slate-100 dark:border-zinc-800">
                        
                        {/* Фулфилмент */}
                        <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 mb-1">Фулфилмент (Наши услуги)</div>
                        <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-zinc-400 text-xs">Доставка до склада WB (за короб)</span> <input className={`w-16 border rounded text-right text-xs p-1 font-bold ${theme.inputBg}`} value={ffRates.deliveryToRfc} onChange={e => setFfRates({...ffRates, deliveryToRfc: +e.target.value})} /></div>
                        <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-zinc-400 text-xs">Обработка (шт)</span> <input className={`w-14 border rounded text-right text-xs p-1 ${theme.inputBg}`} value={ffRates.processing} onChange={e => setFfRates({...ffRates, processing: +e.target.value})} /></div>
                        <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-zinc-400 text-xs">Спецификация (шт)</span> <input className={`w-14 border rounded text-right text-xs p-1 ${theme.inputBg}`} value={ffRates.specification} onChange={e => setFfRates({...ffRates, specification: +e.target.value})} /></div>
                        <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-zinc-400 text-xs">Сборка (кор)</span> <input className={`w-14 border rounded text-right text-xs p-1 ${theme.inputBg}`} value={ffRates.boxAssembly} onChange={e => setFfRates({...ffRates, boxAssembly: +e.target.value})} /></div>
                        <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-zinc-400 text-xs">Короб (материал)</span> <input className={`w-14 border rounded text-right text-xs p-1 ${theme.inputBg}`} value={ffRates.boxMaterial} onChange={e => setFfRates({...ffRates, boxMaterial: +e.target.value})} /></div>
                        
                        {/* Разделитель */}
                        <div className="my-2 border-t-2 border-dashed border-indigo-100 dark:border-indigo-900 relative">
                             <span className={`absolute -top-2.5 left-0 bg-white dark:bg-zinc-900 pr-2 text-[10px] font-bold text-indigo-500 uppercase`}>WB (Маркетплейс)</span>
                        </div>

                         {/* WB */}
                        <div className="pt-1">
                             <div className="flex justify-between items-center"><span className="text-indigo-800 dark:text-indigo-300 text-xs">База логистики WB (до 5л)</span> <input className={`w-16 border border-indigo-200 dark:border-indigo-900 rounded text-right text-xs p-1 text-indigo-700 dark:text-indigo-300 ${theme.inputBg}`} value={50} disabled /></div>
                             <div className="flex justify-between items-center mt-1"><span className="text-indigo-800 dark:text-indigo-300 text-xs">За каждый доп. литр (свыше 5)</span> <input className={`w-16 border border-indigo-200 dark:border-indigo-900 rounded text-right text-xs p-1 text-indigo-700 dark:text-indigo-300 ${theme.inputBg}`} value={5} disabled /></div>
                        </div>
                    </div>
                </details>
            </div>

          </div>

          {/* RIGHT: Results (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Profit Card */}
                <div className={`relative overflow-hidden p-4 rounded-xl border ${profit >= 0 ? theme.profitPositive : theme.profitNegative}`}>
                    <div className="relative z-10">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">Выгода за партию</div>
                        <div className="text-2xl font-bold">
                            {profit > 0 ? '+' : ''}{Math.round(profit).toLocaleString()} ₽
                        </div>
                        <div className="text-[10px] mt-1 opacity-80 leading-tight">
                            Снижение Индекса локализации до 0.7 + экономия на коэф. складов
                        </div>
                    </div>
                </div>

                {/* 2. FF Unit Cost Card */}
                <div className={`p-4 rounded-xl border ${theme.card}`}>
                     <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">Фулфилмент + Логистика на шт.</div>
                     <div className="flex items-center gap-3">
                         <div className={`text-2xl font-bold ${theme.primary}`}>{Math.round(unitFfCost)} ₽</div>
                     </div>
                     <div className="text-xs mt-1 text-slate-500 dark:text-zinc-400">
                        Услуги + Доставка до склада WB
                     </div>
                </div>

                {/* 3. Total Unit Cost Card */}
                <div className={`p-4 rounded-xl border ${theme.card}`}>
                     <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">Итого затраты на шт.</div>
                     <div className="flex flex-col">
                        <div className="text-2xl font-bold">{Math.round(unitCostTarget)} ₽</div>
                        <div className="text-[10px] text-slate-400 dark:text-zinc-500 line-through">{Math.round(unitCostCurrent)} ₽</div>
                     </div>
                     <div className="text-xs mt-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        Включая тарифы WB
                     </div>
                </div>
            </div>

            {/* Analysis Chart */}
            <div className={`p-5 rounded-xl border ${theme.card}`}>
                 <h4 className={`font-bold ${theme.secondary} mb-4 text-sm`}>Сравнение затрат на единицу</h4>
                 <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{ top: 0, right: 30, left: 20, bottom: 0 }}
                            barSize={30}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDarkMode ? '#27272a' : '#e2e8f0'} />
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={120} tick={{fontSize: 11, fontWeight: 600, fill: isDarkMode ? '#a1a1aa' : '#475569'}} />
                            <Tooltip 
                                contentStyle={{
                                    backgroundColor: isDarkMode ? '#18181b' : '#fff', 
                                    borderColor: isDarkMode ? '#27272a' : '#e2e8f0', 
                                    color: isDarkMode ? '#f4f4f5' : '#000'
                                }}
                                cursor={{fill: 'transparent'}}
                            />
                            <Legend wrapperStyle={{fontSize: '12px', color: isDarkMode ? '#a1a1aa' : '#475569'}}/>
                            <Bar name="Фулфилмент + Логистика" dataKey="Фулфилмент + Логистика" stackId="a" fill={isDarkMode ? '#52525b' : '#94a3b8'} radius={[0, 0, 0, 0]} />
                            <Bar name="Тариф Wildberries" dataKey="Тариф Wildberries" stackId="a" fill={isDarkMode ? '#60a5fa' : '#3b82f6'} radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detailed Table */}
            <div className={`rounded-xl border ${theme.card} overflow-hidden text-sm`}>
                <table className="w-full text-left">
                    <thead className={`text-xs uppercase ${theme.secondary} font-semibold border-b ${theme.tableHeaderBg}`}>
                        <tr>
                            <th className="px-5 py-3">Показатель</th>
                            <th className="px-5 py-3 text-right">Текущая ситуация</th>
                            <th className={`px-5 py-3 text-right ${theme.primary} ${theme.highlight}`}>
                                Оптимальное решение
                            </th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-zinc-800' : 'divide-slate-100'} ${theme.text}`}>
                        <tr>
                            <td className="px-5 py-3 font-medium">Индекс Локализации</td>
                            <td className="px-5 py-3 text-right font-bold text-red-600 dark:text-red-400">{clientScenario.locIndex}</td>
                            <td className={`px-5 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 ${theme.highlight}`}>0.7 (Идеал)</td>
                        </tr>
                        <tr>
                            <td className="px-5 py-3">
                                <div>Фулфилмент + Наша Логистика</div>
                                <div className={`text-xs ${theme.secondary}`}>Услуги, материалы, доставка до WB</div>
                            </td>
                            <td className="px-5 py-3 text-right">{Math.round(calculateFFCost(totalItems, currentTableBoxes)).toLocaleString()} ₽</td>
                            <td className={`px-5 py-3 text-right ${theme.highlight}`}>{Math.round(calculateFFCost(totalItems, currentTableBoxes)).toLocaleString()} ₽</td>
                        </tr>
                        <tr>
                            <td className="px-5 py-3">
                                <div>Логистика Wildberries (Итого)</div>
                                <div className={`text-xs ${theme.secondary}`}>Тариф × Коэф. склада × Индекс Лок.</div>
                            </td>
                            <td className="px-5 py-3 text-right">{Math.round(clientScenario.wbLogisticsUnit * totalItems).toLocaleString()} ₽</td>
                            <td className={`px-5 py-3 text-right font-bold text-indigo-600 dark:text-indigo-400 ${theme.highlight}`}>{Math.round(distributedScenario.wbLogisticsUnit * totalItems).toLocaleString()} ₽</td>
                        </tr>
                        <tr className={`${theme.tableHeaderBg} font-bold`}>
                            <td className="px-5 py-3">ИТОГО ПАРТИЯ</td>
                            <td className="px-5 py-3 text-right">{Math.round(clientScenario.totalCost).toLocaleString()} ₽</td>
                            <td className={`px-5 py-3 text-right ${theme.highlight}`}>{Math.round(distributedScenario.totalCost).toLocaleString()} ₽</td>
                        </tr>
                        <tr className={`font-bold ${theme.highlight}`}>
                            <td className="px-5 py-3 text-xs uppercase tracking-wider">Затраты на 1 шт.</td>
                            <td className="px-5 py-3 text-right">{Math.round(unitCostCurrent).toLocaleString()} ₽</td>
                            <td className={`px-5 py-3 text-right font-extrabold text-lg`}>{Math.round(unitCostTarget).toLocaleString()} ₽</td>
                        </tr>
                    </tbody>
                </table>
            </div>

          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default FboCalculator;