import React, { useState, useMemo } from 'react';
import { Truck, Box, TrendingUp, DollarSign, BarChart3, Calculator, RotateCcw, Package, Info, Zap, Map, Settings, CheckSquare, Square, RefreshCw, AlertTriangle, Clock, Edit3, Moon, Sun } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const OzonCalculator = () => {
  // --- STATE: THEME ---
  const [isDarkMode, setIsDarkMode] = useState(false);

  // --- 1. ПАРАМЕТРЫ ТОВАРА ---
  const [product, setProduct] = useState({
    price: 1800, // Цена продажи (важно для комиссии!)
    cost: 600,   // Себестоимость
    width: 20,   // см
    height: 30,  // см
    length: 10,  // см
    weight: 0.5, // кг
  });

  // Ручное переопределение количества штук в коробе
  const [manualUnitsPerBox, setManualUnitsPerBox] = useState(null);

  // --- 2. ТАРИФЫ ФУЛФИЛМЕНТА И ДОСТАВКИ ---
  const [ffRates, setFfRates] = useState({
    processing: 15,    // Складская обработка (за шт)
    specification: 3,  // Спецификация (за шт)
    boxAssembly: 55,   // Сборка короба и маркировка (за короб)
    boxMaterial: 65,   // Стоимость самого короба (за короб)
    deliveryToRfc: 140, // Фиксированная доставка до РФЦ за короб
  });

  // --- 3. ТАРИФЫ ОЗОН (НОВЫЕ ПРАВИЛА 2025) ---
  const [ozonTariffs, setOzonTariffs] = useState({
    logisticsBase: 63, // База за 5 литров
    logisticsLiter: 7, // За каждый лишний литр
  });

  // --- 4. КЛАСТЕРЫ (С REMOTE TIME) ---
  const initialClusters = [
    { id: 'msk', name: 'Москва, МО и Дальние регионы', vrdcBoxRate: 0, demandShare: 35, enabled: true, isBase: true, remoteHours: 28, boxCount: 15 }, 
    { id: 'spb', name: 'Санкт-Петербург и СЗО', vrdcBoxRate: 170, demandShare: 12, enabled: false, remoteHours: 45, boxCount: 0 },
    { id: 'krasnodar', name: 'Краснодар', vrdcBoxRate: 210, demandShare: 8, enabled: false, remoteHours: 55, boxCount: 0 },
    { id: 'ekb', name: 'Екатеринбург', vrdcBoxRate: 230, demandShare: 7, enabled: false, remoteHours: 65, boxCount: 0 },
    { id: 'kazan', name: 'Казань', vrdcBoxRate: 180, demandShare: 6, enabled: false, remoteHours: 45, boxCount: 0 },
    { id: 'rostov', name: 'Ростов-на-Дону', vrdcBoxRate: 200, demandShare: 5, enabled: false, remoteHours: 50, boxCount: 0 },
    { id: 'novosib', name: 'Новосибирск', vrdcBoxRate: 290, demandShare: 5, enabled: false, remoteHours: 90, boxCount: 0 },
    { id: 'samara', name: 'Самара', vrdcBoxRate: 190, demandShare: 4, enabled: false, remoteHours: 50, boxCount: 0 },
    { id: 'voronezh', name: 'Воронеж', vrdcBoxRate: 160, demandShare: 3, enabled: false, remoteHours: 40, boxCount: 0 },
    { id: 'belarus', name: 'Беларусь', vrdcBoxRate: 350, demandShare: 2, enabled: false, remoteHours: 72, boxCount: 0 },
    { id: 'kazakhstan', name: 'Казахстан', vrdcBoxRate: 400, demandShare: 2, enabled: false, remoteHours: 96, boxCount: 0 },
    { id: 'dv', name: 'Дальний Восток', vrdcBoxRate: 450, demandShare: 2, enabled: false, remoteHours: 150, boxCount: 0 },
    { id: 'krasnoyarsk', name: 'Красноярск', vrdcBoxRate: 320, demandShare: 2, enabled: false, remoteHours: 100, boxCount: 0 },
    { id: 'ufa', name: 'Уфа', vrdcBoxRate: 200, demandShare: 2, enabled: false, remoteHours: 60, boxCount: 0 },
    { id: 'tyumen', name: 'Тюмень', vrdcBoxRate: 250, demandShare: 1, enabled: false, remoteHours: 75, boxCount: 0 },
    { id: 'omsk', name: 'Омск', vrdcBoxRate: 280, demandShare: 1, enabled: false, remoteHours: 85, boxCount: 0 },
    { id: 'perm', name: 'Пермь', vrdcBoxRate: 220, demandShare: 1, enabled: false, remoteHours: 65, boxCount: 0 },
    { id: 'saratov', name: 'Саратов', vrdcBoxRate: 190, demandShare: 1, enabled: false, remoteHours: 55, boxCount: 0 },
    { id: 'yaroslavl', name: 'Ярославль', vrdcBoxRate: 150, demandShare: 1, enabled: false, remoteHours: 35, boxCount: 0 },
    { id: 'tver', name: 'Тверь', vrdcBoxRate: 140, demandShare: 1, enabled: false, remoteHours: 35, boxCount: 0 },
    { id: 'oren', name: 'Оренбург', vrdcBoxRate: 230, demandShare: 1, enabled: false, remoteHours: 65, boxCount: 0 },
    { id: 'kaliningrad', name: 'Калининград', vrdcBoxRate: 300, demandShare: 0.5, enabled: false, remoteHours: 120, boxCount: 0 },
    { id: 'kavkaz', name: 'Кавказ', vrdcBoxRate: 210, demandShare: 0.5, enabled: false, remoteHours: 70, boxCount: 0 },
  ];

  const [clusters, setClusters] = useState(initialClusters);
  
  // --- ВЫЧИСЛЕНИЯ ПАРТИИ ---
  const itemLiterage = (product.width * product.height * product.length) / 1000;
  const calculatedUnitsPerBox = useMemo(() => {
    if (itemLiterage <= 0) return 0;
    return Math.floor((96 / itemLiterage) * 0.95) || 1;
  }, [itemLiterage]);
  const unitsPerBox = manualUnitsPerBox !== null ? manualUnitsPerBox : calculatedUnitsPerBox;

  const currentTotalBoxes = useMemo(() => clusters.reduce((sum, c) => sum + c.boxCount, 0), [clusters]);
  const [manualTotalItems, setManualTotalItems] = useState(null);
  const displayTotalItems = manualTotalItems !== null ? manualTotalItems : (currentTotalBoxes * unitsPerBox);

  // --- ЛОГИКА РАСПРЕДЕЛЕНИЯ ---
  const handleBoxChange = (id, val) => {
      const newCount = Math.max(0, parseInt(val) || 0);
      setClusters(clusters.map(c => c.id === id ? { ...c, boxCount: newCount } : c));
      setManualTotalItems(null); 
  };

  const distributeBoxes = (targetTotal, strategy = 'current_ratio') => {
      if (strategy === 'demand_max') {
          const totalDemand = clusters.reduce((sum, c) => sum + c.demandShare, 0);
          const newClusters = clusters.map(c => ({
              ...c,
              enabled: true,
              boxCount: Math.round(targetTotal * (c.demandShare / totalDemand))
          }));
          const currentSum = newClusters.reduce((sum, c) => sum + c.boxCount, 0);
          const diff = targetTotal - currentSum;
          const msk = newClusters.find(c => c.id === 'msk');
          if (msk) msk.boxCount += diff;
          setClusters(newClusters);
      } else if (strategy === 'demand_lite') {
          const newClusters = clusters.map(c => ({ ...c, boxCount: 0 }));
          const activeClusters = newClusters.filter(c => c.demandShare >= 4 || c.isBase);
          const activeDemand = activeClusters.reduce((sum, c) => sum + c.demandShare, 0);
          
          activeClusters.forEach(c => {
              c.enabled = true;
              c.boxCount = Math.round(targetTotal * (c.demandShare / activeDemand));
          });
          const currentSum = newClusters.reduce((sum, c) => sum + c.boxCount, 0);
          const diff = targetTotal - currentSum;
          const msk = newClusters.find(c => c.id === 'msk');
          if (msk) msk.boxCount += diff;
          setClusters(newClusters);
      } else {
          if (currentTotalBoxes > 0) {
              const ratio = targetTotal / currentTotalBoxes;
              let remainder = targetTotal;
              const newClusters = clusters.map(c => {
                  const newCount = Math.floor(c.boxCount * ratio);
                  remainder -= newCount;
                  return { ...c, boxCount: newCount };
              });
              if (remainder > 0) {
                  const target = newClusters.find(c => c.boxCount > 0) || newClusters.find(c => c.id === 'msk');
                  if (target) target.boxCount += remainder;
              }
              setClusters(newClusters);
          } else {
              setClusters(clusters.map(c => c.id === 'msk' ? { ...c, boxCount: targetTotal } : c));
          }
      }
  };

  const handleTotalBoxesChange = (val) => {
      const newTotal = Math.max(0, parseInt(val) || 0);
      distributeBoxes(newTotal, 'current_ratio');
      setManualTotalItems(null);
  };

  const handleTotalItemsChange = (val) => {
      const items = Math.max(0, parseInt(val) || 0);
      setManualTotalItems(items);
      const newTotalBoxes = Math.ceil(items / unitsPerBox);
      distributeBoxes(newTotalBoxes, 'current_ratio');
  };

  const handleAutoMax = () => distributeBoxes(currentTotalBoxes > 0 ? currentTotalBoxes : 15, 'demand_max');
  const handleAutoLite = () => distributeBoxes(currentTotalBoxes > 0 ? currentTotalBoxes : 15, 'demand_lite');

  const updateRate = (id, newRate) => {
    setClusters(clusters.map(c => c.id === id ? { ...c, vrdcBoxRate: Number(newRate) } : c));
  };
  
  const toggleCluster = (id) => {
      if (id === 'msk') return;
      setClusters(clusters.map(c => {
          if (c.id === id) {
              const isEnabled = !c.enabled;
              return { ...c, enabled: isEnabled, boxCount: isEnabled ? c.boxCount : 0 };
          }
          return c;
      }));
  };

  // --- РАСЧЕТ МЕТРИК ---
  const distribution = useMemo(() => {
    let totalWeightedTimeCurrent = 0;
    let totalWeightedTimeTarget = 0;
    const totalGlobalDemand = clusters.reduce((sum, c) => sum + c.demandShare, 0);

    clusters.forEach(c => {
        const weight = c.demandShare / totalGlobalDemand;
        const timeCurrent = c.id === 'msk' ? 28 : c.remoteHours;
        totalWeightedTimeCurrent += timeCurrent * weight;
        const hasStock = c.boxCount > 0;
        const timeTarget = hasStock ? 28 : c.remoteHours;
        totalWeightedTimeTarget += timeTarget * weight;
    });

    let vrdcTotalCost = 0;
    clusters.forEach(c => {
        if (c.id !== 'msk' && c.boxCount > 0) {
            vrdcTotalCost += c.boxCount * c.vrdcBoxRate;
        }
    });

    return { 
        current: { svd: totalWeightedTimeCurrent },
        target: { svd: totalWeightedTimeTarget, vrdcCost: vrdcTotalCost }
    };
  }, [clusters]);

  const getTariffParams = (hours) => {
      if (hours <= 29) return { coeff: 1.0, commission: 0 };
      if (hours <= 35) return { coeff: 1.32, commission: 1.6 };
      if (hours <= 40) return { coeff: 1.51, commission: 2.55 };
      if (hours <= 45) return { coeff: 1.66, commission: 3.3 };
      if (hours <= 50) return { coeff: 1.76, commission: 3.8 };
      if (hours <= 60) return { coeff: 1.79, commission: 3.99 };
      return { coeff: 1.8, commission: 4.0 };
  };

  const ffServicesCost = (ffRates.processing * displayTotalItems) + 
                         (ffRates.specification * displayTotalItems) + 
                         (ffRates.boxAssembly * currentTotalBoxes) + 
                         (ffRates.boxMaterial * currentTotalBoxes);
  const ourDeliveryCost = currentTotalBoxes * ffRates.deliveryToRfc;

  const calculateOzonLogistics = (svd) => {
      const { coeff, commission } = getTariffParams(svd);
      let base = ozonTariffs.logisticsBase;
      if (itemLiterage > 5) base += (itemLiterage - 5) * ozonTariffs.logisticsLiter;
      
      const logisticsCost = (base * coeff * displayTotalItems);
      const commissionCost = displayTotalItems * (product.price * (commission / 100));

      return { total: logisticsCost + commissionCost, logistics: logisticsCost, commission: commissionCost, params: { coeff, commission } };
  };

  const currentScenario = calculateOzonLogistics(distribution.current.svd);
  const targetScenario = calculateOzonLogistics(distribution.target.svd);

  const totalCostCurrent = ffServicesCost + ourDeliveryCost + currentScenario.total;
  const totalCostTarget = ffServicesCost + ourDeliveryCost + targetScenario.total + distribution.target.vrdcCost;
  const profit = totalCostCurrent - totalCostTarget;

  const unitCostCurrent = displayTotalItems > 0 ? totalCostCurrent / displayTotalItems : 0;
  const unitCostTarget = displayTotalItems > 0 ? totalCostTarget / displayTotalItems : 0;

  const chartData = [
    {
      name: `Только Центр`,
      'Фулфилмент + РФЦ': Math.round(ffServicesCost + ourDeliveryCost),
      'Логистика': Math.round(currentScenario.logistics),
      'Штраф (% от цены)': Math.round(currentScenario.commission),
      'vRDC': 0,
    },
    {
      name: 'Распределение',
      'Фулфилмент + РФЦ': Math.round(ffServicesCost + ourDeliveryCost),
      'Логистика': Math.round(targetScenario.logistics),
      'Штраф (% от цены)': Math.round(targetScenario.commission),
      'vRDC': Math.round(distribution.target.vrdcCost),
    },
  ];

  return (
    <div className={isDarkMode ? 'dark' : ''}>
    <div className="p-4 bg-slate-50 dark:bg-zinc-950 min-h-screen font-sans text-slate-800 dark:text-zinc-200 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-900 dark:text-blue-400 flex items-center gap-2">
                <Zap className="fill-yellow-400 text-blue-700 dark:text-blue-500" /> Ozon FBO: Калькулятор выгоды vRDC
            </h1>
            <p className="text-slate-500 dark:text-zinc-400 text-sm">Новые правила 2025: Учитываем СВД (Среднее Время Доставки) и штрафы</p>
          </div>
          <div className="flex gap-2">
             <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="bg-white dark:bg-zinc-900 px-3 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors"
             >
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
             </button>
             <button 
                onClick={() => {setClusters(initialClusters); setManualTotalItems(null);}}
                className="bg-white dark:bg-zinc-900 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 flex items-center gap-2 transition-colors"
             >
                <RotateCcw size={16} /> Сброс
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* 1. СТАТИСТИКА ВРЕМЕНИ */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-blue-100 dark:border-blue-900/30 ring-1 ring-blue-50 dark:ring-blue-900/10 relative overflow-hidden transition-colors">
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-bl-full -mr-8 -mt-8 opacity-50"></div>
                <h3 className="font-bold text-sm text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2 relative z-10">
                    <Clock size={16} /> СВД (Среднее время доставки)
                </h3>
                
                <div className="grid grid-cols-2 gap-4 relative z-10">
                    <div className="bg-slate-50 dark:bg-zinc-950 p-3 rounded-lg border border-slate-200 dark:border-zinc-800">
                        <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-500 mb-1">Только Москва</div>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{Math.round(distribution.current.svd)} ч</div>
                        <div className="text-xs mt-1 space-y-0.5">
                             <div className="flex justify-between dark:text-zinc-400"><span>Коэфф:</span> <b>x{currentScenario.params.coeff}</b></div>
                             <div className="flex justify-between text-red-600 dark:text-red-400"><span>Штраф:</span> <b>{currentScenario.params.commission}%</b></div>
                        </div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/30">
                        <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 mb-1">С распределением</div>
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{Math.round(distribution.target.svd)} ч</div>
                        <div className="text-xs mt-1 space-y-0.5 text-emerald-800 dark:text-emerald-300">
                             <div className="flex justify-between"><span>Коэфф:</span> <b>x{targetScenario.params.coeff}</b></div>
                             <div className="flex justify-between"><span>Штраф:</span> <b>{targetScenario.params.commission}%</b></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. ТОВАР */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800 transition-colors">
               <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
                <Box size={16} /> Товар (Габариты и Цена)
              </h3>
               <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1">
                     <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500">Длина</label>
                     <input type="number" value={product.length} onChange={(e) => setProduct({...product, length: Number(e.target.value)})} className="w-full p-1 border rounded text-center text-sm bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-700 dark:text-zinc-200" />
                  </div>
                  <div className="flex-1">
                     <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500">Ширина</label>
                     <input type="number" value={product.width} onChange={(e) => setProduct({...product, width: Number(e.target.value)})} className="w-full p-1 border rounded text-center text-sm bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-700 dark:text-zinc-200" />
                  </div>
                  <div className="flex-1">
                     <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500">Высота</label>
                     <input type="number" value={product.height} onChange={(e) => setProduct({...product, height: Number(e.target.value)})} className="w-full p-1 border rounded text-center text-sm bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-700 dark:text-zinc-200" />
                  </div>
               </div>
               
               <div className="mb-2">
                   <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500">Цена товара</label>
                   <div className="relative">
                        <input type="number" value={product.price} onChange={(e) => setProduct({...product, price: Number(e.target.value)})} className="w-full p-1.5 border rounded pl-8 font-bold text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-700" />
                        <span className="absolute left-2 top-1.5 text-slate-400 dark:text-zinc-500">₽</span>
                   </div>
               </div>
               
               {/* Ручной ввод штук в коробе */}
               <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-100 dark:border-blue-900/30 mt-2">
                  <div className="flex-1">
                    <label className="text-[10px] uppercase font-bold text-blue-800 dark:text-blue-300 mb-1 block">Штук в коробе</label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            value={unitsPerBox} 
                            onChange={(e) => setManualUnitsPerBox(Number(e.target.value))}
                            className={`w-full p-1.5 border rounded font-bold text-center outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-950 ${manualUnitsPerBox !== null ? 'bg-white border-blue-400 text-blue-700 dark:text-blue-400 dark:border-blue-700' : 'bg-slate-50 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400'}`}
                        />
                        {manualUnitsPerBox !== null && (
                            <button 
                                onClick={() => setManualUnitsPerBox(null)}
                                title="Вернуть авторасчет"
                                className="p-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400"
                            >
                                <RefreshCw size={14} />
                            </button>
                        )}
                    </div>
                  </div>
                  <div className="flex-1 border-l border-blue-200 dark:border-blue-800 pl-3">
                      <div className="text-[10px] text-blue-800 dark:text-blue-300 opacity-70">Объем товара</div>
                      <div className="font-semibold text-sm text-blue-900 dark:text-blue-200">{itemLiterage.toFixed(2)} л</div>
                  </div>
               </div>
            </div>

            {/* 3. КЛАСТЕРЫ */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800 flex-grow flex flex-col h-[500px] transition-colors">
               <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-300 flex items-center gap-2">
                    <Map size={16} /> Кластеры (vRDC)
                  </h3>
               </div>
               
               {/* Кнопки распределения */}
               <div className="flex gap-2 mb-3">
                   <button onClick={handleAutoMax} className="flex-1 text-[11px] bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 px-2 py-1.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 transition font-medium flex justify-center items-center gap-1">
                      <Map size={12}/> Все регионы (Max)
                   </button>
                   <button onClick={handleAutoLite} className="flex-1 text-[11px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40 px-2 py-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition font-medium flex justify-center items-center gap-1">
                      <Zap size={12}/> Популярные (Lite)
                   </button>
               </div>

               {/* Редактируемые итоги */}
               <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg p-3 mb-3 flex gap-3">
                   <div className="flex-1">
                       <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-500 mb-1 block">Всего коробов</label>
                       <input 
                           type="number" 
                           value={currentTotalBoxes} 
                           onChange={(e) => handleTotalBoxesChange(e.target.value)}
                           className="w-full p-1.5 text-lg font-bold text-slate-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded outline-none focus:ring-2 focus:ring-blue-500"
                       />
                   </div>
                   <div className="flex-1 text-right">
                       <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-500 mb-1 block">Товаров в партии</label>
                       <div className="relative">
                           <input 
                               type="number" 
                               value={displayTotalItems}
                               onChange={(e) => handleTotalItemsChange(e.target.value)} 
                               className={`w-full p-1.5 text-lg font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded outline-none text-right focus:ring-2 focus:ring-blue-500 ${manualTotalItems !== null ? 'border-blue-300 ring-1 ring-blue-100 dark:ring-blue-900/50 dark:border-blue-800 bg-blue-50/20' : ''}`}
                           />
                           {manualTotalItems !== null && <span className="absolute right-12 top-2.5 text-[10px] text-blue-300 pointer-events-none">фиксир.</span>}
                       </div>
                   </div>
               </div>
               
               <div className="overflow-y-auto custom-scrollbar border border-slate-200 dark:border-zinc-800 rounded-lg flex-1">
                   <table className="w-full text-xs text-left">
                       <thead className="bg-slate-50 dark:bg-zinc-950 text-slate-500 dark:text-zinc-400 font-semibold border-b border-slate-200 dark:border-zinc-800 sticky top-0 z-10">
                           <tr>
                               <th className="px-3 py-2 bg-slate-50 dark:bg-zinc-950">Кластер</th>
                               <th className="px-2 py-2 text-right bg-slate-50 dark:bg-zinc-950">vRDC</th>
                               <th className="px-2 py-2 text-center bg-slate-50 dark:bg-zinc-950">Коробов</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                           {clusters.map((c) => {
                               return (
                               <tr key={c.id} className={`group ${c.enabled || c.isBase ? 'bg-blue-50/20 dark:bg-blue-900/10' : 'bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800'}`}>
                                   <td className="px-3 py-2">
                                       <div className="flex items-center gap-2">
                                           <button onClick={() => toggleCluster(c.id)} disabled={c.isBase} className={c.isBase ? 'text-blue-400 dark:text-blue-600 cursor-not-allowed' : c.enabled ? 'text-blue-600 dark:text-blue-400' : 'text-slate-300 dark:text-zinc-600'}>
                                               {c.enabled || c.isBase ? <CheckSquare size={16}/> : <Square size={16}/>}
                                           </button>
                                           <div className="flex flex-col">
                                               <span className={`font-medium ${c.enabled || c.isBase ? 'text-slate-700 dark:text-zinc-300' : 'text-slate-400 dark:text-zinc-500'}`}>{c.name}</span>
                                               <span className="text-[9px] text-slate-400 dark:text-zinc-500">Удал. {c.remoteHours}ч</span>
                                           </div>
                                       </div>
                                   </td>
                                   <td className="px-2 py-2 text-right">
                                       <input 
                                          type="number" 
                                          value={c.vrdcBoxRate}
                                          onChange={(e) => updateRate(c.id, e.target.value)}
                                          disabled={c.isBase}
                                          className={`w-12 text-right bg-transparent border-b border-dashed border-slate-300 dark:border-zinc-700 outline-none text-slate-600 dark:text-zinc-400 ${!c.enabled && !c.isBase && 'text-slate-300 dark:text-zinc-600'}`}
                                       />
                                   </td>
                                   <td className="px-2 py-2 text-center w-20">
                                       <input 
                                          type="number" 
                                          min="0"
                                          value={c.boxCount}
                                          onChange={(e) => handleBoxChange(c.id, e.target.value)}
                                          className={`w-14 p-1 text-center border rounded font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-transparent ${c.boxCount > 0 ? 'border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 bg-white dark:bg-zinc-900' : 'border-slate-200 dark:border-zinc-700 text-slate-300 dark:text-zinc-600'}`}
                                       />
                                   </td>
                               </tr>
                           )})}
                       </tbody>
                   </table>
               </div>
            </div>

            {/* 4. ТАРИФЫ (Свернутые + Разделенные) */}
            <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800 transition-colors">
                <details className="text-sm">
                    <summary className="font-semibold text-slate-600 dark:text-zinc-400 cursor-pointer flex items-center gap-2">
                        <DollarSign size={14} /> Настройки тарифов
                    </summary>
                    <div className="mt-3 space-y-3 pl-2 border-l-2 border-slate-100 dark:border-zinc-800">
                        {/* Фулфилмент */}
                        <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 mb-1">Фулфилмент (Мы)</div>
                        <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-zinc-400 text-xs">Доставка до РФЦ (за короб)</span> <input className="w-16 border rounded text-right text-xs p-1 font-bold text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-700" value={ffRates.deliveryToRfc} onChange={e => setFfRates({...ffRates, deliveryToRfc: +e.target.value})} /></div>
                        <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-zinc-400 text-xs">Обработка (шт)</span> <input className="w-14 border rounded text-right text-xs p-1 bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-700 dark:text-zinc-300" value={ffRates.processing} onChange={e => setFfRates({...ffRates, processing: +e.target.value})} /></div>
                        <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-zinc-400 text-xs">Спецификация (шт)</span> <input className="w-14 border rounded text-right text-xs p-1 bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-700 dark:text-zinc-300" value={ffRates.specification} onChange={e => setFfRates({...ffRates, specification: +e.target.value})} /></div>
                        <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-zinc-400 text-xs">Сборка (кор)</span> <input className="w-14 border rounded text-right text-xs p-1 bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-700 dark:text-zinc-300" value={ffRates.boxAssembly} onChange={e => setFfRates({...ffRates, boxAssembly: +e.target.value})} /></div>
                        <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-zinc-400 text-xs">Короб (материал)</span> <input className="w-14 border rounded text-right text-xs p-1 bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-700 dark:text-zinc-300" value={ffRates.boxMaterial} onChange={e => setFfRates({...ffRates, boxMaterial: +e.target.value})} /></div>
                        
                        {/* Разделитель */}
                        <div className="my-2 border-t-2 border-dashed border-blue-100 dark:border-blue-900/30 relative">
                             <span className="absolute -top-2.5 left-0 bg-white dark:bg-zinc-900 pr-2 text-[10px] font-bold text-blue-500 uppercase">Озон (Маркетплейс)</span>
                        </div>
                        
                        {/* Озон */}
                        <div className="pt-1">
                             <div className="flex justify-between items-center"><span className="text-blue-800 dark:text-blue-300 text-xs">База логистики (до 5л)</span> <input className="w-16 border border-blue-200 dark:border-blue-900 rounded text-right text-xs p-1 text-blue-700 dark:text-blue-300 bg-white dark:bg-zinc-950" value={ozonTariffs.logisticsBase} onChange={e => setOzonTariffs({...ozonTariffs, logisticsBase: +e.target.value})} /></div>
                        </div>
                    </div>
                </details>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Profit Card */}
                <div className={`relative overflow-hidden p-4 rounded-xl border ${profit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30' : 'bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/30'}`}>
                    <div className="relative z-10">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">Выгода за партию</div>
                        <div className={`text-2xl font-bold ${profit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-orange-700 dark:text-orange-400'}`}>
                            {profit > 0 ? '+' : ''}{Math.round(profit).toLocaleString()} ₽
                        </div>
                        <div className="text-[10px] mt-1 opacity-80 text-slate-700 dark:text-zinc-300 leading-tight">
                            Улучшение СВД на {Math.round(distribution.current.svd - distribution.target.svd)}ч убирает штраф {currentScenario.params.commission}%
                        </div>
                    </div>
                </div>

                {/* 2. vRDC Cost */}
                <div className="p-4 rounded-xl border bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 transition-colors">
                     <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">Затраты на vRDC</div>
                     <div className="flex items-center gap-3">
                         <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{Math.round(distribution.target.vrdcCost).toLocaleString()} ₽</div>
                     </div>
                     <div className="text-xs mt-1 text-slate-500 dark:text-zinc-400">
                        Оплата Озону за развоз
                     </div>
                </div>

                {/* 3. Ozon Logistics Total */}
                <div className="p-4 rounded-xl border bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 transition-colors">
                     <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">Итого (Партия)</div>
                     <div className="flex flex-col">
                         <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                             {Math.round(totalCostTarget).toLocaleString()} ₽
                         </div>
                         <div className="text-[10px] text-slate-400 dark:text-zinc-500 line-through">
                             {Math.round(totalCostCurrent).toLocaleString()} ₽
                         </div>
                     </div>
                </div>
            </div>

            {/* Analysis Chart */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800 transition-colors">
                 <h4 className="font-bold text-slate-700 dark:text-zinc-300 mb-4 text-sm">Структура затрат</h4>
                 <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{ top: 0, right: 30, left: 20, bottom: 0 }}
                            barSize={30}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDarkMode ? '#3f3f46' : '#e2e8f0'} />
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
                            <Bar name="Фулфилмент + РФЦ" dataKey="Фулфилмент + РФЦ" stackId="a" fill={isDarkMode ? '#52525b' : '#94a3b8'} radius={[0, 0, 0, 0]} />
                            <Bar name="vRDC" dataKey="vRDC" stackId="a" fill={isDarkMode ? '#fb923c' : '#f97316'} radius={[0, 0, 0, 0]} />
                            <Bar name="Логистика" dataKey="Логистика" stackId="a" fill={isDarkMode ? '#60a5fa' : '#3b82f6'} />
                            <Bar name="Штраф (% от цены)" dataKey="Штраф (% от цены)" stackId="a" fill={isDarkMode ? '#f87171' : '#ef4444'} radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden text-sm transition-colors">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-zinc-950 text-xs uppercase text-slate-500 dark:text-zinc-400 font-semibold border-b border-slate-100 dark:border-zinc-800">
                        <tr>
                            <th className="px-5 py-3">Показатель</th>
                            <th className="px-5 py-3 text-right">Только Центр</th>
                            <th className="px-5 py-3 text-right text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-900/20">
                                Распределение
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-slate-600 dark:text-zinc-300">
                        <tr>
                            <td className="px-5 py-3 font-medium text-slate-700 dark:text-zinc-200">Среднее время доставки (СВД)</td>
                            <td className="px-5 py-3 text-right font-bold text-red-600 dark:text-red-400">{Math.round(distribution.current.svd)} ч</td>
                            <td className="px-5 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 bg-blue-50/20 dark:bg-blue-900/10">{Math.round(distribution.target.svd)} ч</td>
                        </tr>
                        <tr>
                            <td className="px-5 py-3">
                                <div>Фулфилмент + Логистика до РФЦ</div>
                                <div className="text-xs text-slate-400 dark:text-zinc-500">Услуги, материалы, доставка коробов</div>
                            </td>
                            <td className="px-5 py-3 text-right">{Math.round(ffServicesCost + ourDeliveryCost).toLocaleString()} ₽</td>
                            <td className="px-5 py-3 text-right bg-blue-50/20 dark:bg-blue-900/10">{Math.round(ffServicesCost + ourDeliveryCost).toLocaleString()} ₽</td>
                        </tr>
                        <tr>
                            <td className="px-5 py-3">
                                <div>Логистика Озон (База × Коэфф)</div>
                                <div className="text-xs text-slate-400 dark:text-zinc-500">Коэфф: {currentScenario.params.coeff} vs {targetScenario.params.coeff}</div>
                            </td>
                            <td className="px-5 py-3 text-right">{Math.round(currentScenario.logistics).toLocaleString()} ₽</td>
                            <td className="px-5 py-3 text-right bg-blue-50/20 dark:bg-blue-900/10">{Math.round(targetScenario.logistics).toLocaleString()} ₽</td>
                        </tr>
                        <tr>
                            <td className="px-5 py-3">
                                <div className="flex items-center gap-1">Штрафная комиссия <AlertTriangle size={12} className="text-red-500 dark:text-red-400"/></div>
                                <div className="text-xs text-slate-400 dark:text-zinc-500">{currentScenario.params.commission}% от цены товара</div>
                            </td>
                            <td className="px-5 py-3 text-right text-red-600 dark:text-red-400 font-bold">{Math.round(currentScenario.commission).toLocaleString()} ₽</td>
                            <td className="px-5 py-3 text-right text-red-600 dark:text-red-400 font-bold bg-blue-50/20 dark:bg-blue-900/10">{Math.round(targetScenario.commission).toLocaleString()} ₽</td>
                        </tr>
                        <tr>
                            <td className="px-5 py-3">vRDC (Кросс-докинг)</td>
                            <td className="px-5 py-3 text-right text-slate-300 dark:text-zinc-600">-</td>
                            <td className="px-5 py-3 text-right font-medium text-orange-600 dark:text-orange-400 bg-blue-50/20 dark:bg-blue-900/10">{Math.round(distribution.target.vrdcCost).toLocaleString()} ₽</td>
                        </tr>
                        <tr className="bg-slate-50 dark:bg-zinc-800 font-bold text-slate-900 dark:text-zinc-100 border-t-2 border-slate-100 dark:border-zinc-700">
                            <td className="px-5 py-3">ИТОГО ПАРТИЯ</td>
                            <td className="px-5 py-3 text-right">{Math.round(totalCostCurrent).toLocaleString()} ₽</td>
                            <td className="px-5 py-3 text-right bg-blue-50 dark:bg-blue-900/20">{Math.round(totalCostTarget).toLocaleString()} ₽</td>
                        </tr>
                        <tr className="bg-blue-50/10 dark:bg-blue-900/5 font-bold text-blue-900 dark:text-blue-300 border-t border-slate-100 dark:border-zinc-800">
                            <td className="px-5 py-3 text-xs uppercase tracking-wider">Затраты на 1 шт.</td>
                            <td className="px-5 py-3 text-right">{Math.round(unitCostCurrent).toLocaleString()} ₽</td>
                            <td className="px-5 py-3 text-right bg-blue-100/50 dark:bg-blue-900/20">{Math.round(unitCostTarget).toLocaleString()} ₽</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            {/* Warning Box */}
            <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg text-xs text-red-800 dark:text-red-300">
                <AlertTriangle className="shrink-0 mt-0.5" size={16} />
                <div>
                    <span className="font-bold">Внимание:</span> Если ваше СВД превышает 60 часов, Озон берет дополнительную комиссию до 4% от цены товара! Это может быть дороже, чем сама логистика. Распределяйте товары, чтобы держать СВД ниже 29 часов.
                </div>
            </div>

          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default OzonCalculator;