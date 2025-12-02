import React, { useState, useMemo, useEffect } from 'react';
import { Truck, Box, TrendingUp, DollarSign, BarChart3, Calculator, RotateCcw, Package, Info, Zap, Map, Settings, CheckSquare, Square, RefreshCw, AlertTriangle, Clock, Edit3, Moon, Sun, Lock, Unlock, X, ShieldAlert, ShieldCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const OzonCalculator = () => {
  // --- STATE: THEME ---
  const [isDarkMode, setIsDarkMode] = useState(false);

  // --- 1. ПАРАМЕТРЫ ТОВАРА ---
  const [product, setProduct] = useState({
    price: 1800, // Цена продажи
    cost: 600,   // Себестоимость
    width: 20,
    height: 30,
    length: 10,
    weight: 0.5,
  });

  // Ручное переопределение количества штук в коробе и объема
  const [manualUnitsPerBox, setManualUnitsPerBox] = useState(null);
  const [manualLiterage, setManualLiterage] = useState(null);
  
  // Режим фиксации: 'units' (короба/вложения) или 'items' (итого штук)
  const [anchorMode, setAnchorMode] = useState('items');

  // Режим риска: 'normal' (обычный спрос) или 'high' (стресс-тест дальними заказами)
  const [riskMode, setRiskMode] = useState('normal');

  // --- 2. ТАРИФЫ ФУЛФИЛМЕНТА И ДОСТАВКИ ---
  const [ffRates, setFfRates] = useState({
    processing: 15,    // Складская обработка (за шт)
    specification: 3,  // Спецификация (за шт)
    boxAssembly: 55,   // Сборка короба и маркировка (за короб)
    boxMaterial: 65,   // Стоимость самого короба (за короб)
    deliveryToRfc: 140, // Фиксированная доставка до РФЦ за короб
  });

  // --- 3. ТАРИФЫ ОЗОН ---
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
    { id: 'dv', name: 'Дальний Восток', vrdcBoxRate: 450, demandShare: 2, enabled: false, remoteHours: 150, boxCount: 0 }, // Самый дальний для стресс-теста
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
  
  // Состояние: какие кластеры клиент использует СЕЙЧАС (для расчета "До")
  const [clientSelectedClusters, setClientSelectedClusters] = useState(['msk']);

  // --- ВЫЧИСЛЕНИЯ ПАРТИИ ---
  const itemLiterage = (product.width * product.height * product.length) / 1000;
  const currentLiterage = manualLiterage !== null ? manualLiterage : itemLiterage;

  const calculatedUnitsPerBox = useMemo(() => {
    if (currentLiterage <= 0) return 0;
    return Math.floor((96 / currentLiterage) * 0.95) || 1;
  }, [currentLiterage]);
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

  const handleUnitsPerBoxChange = (val) => {
      setManualUnitsPerBox(Number(val));
  };

  const handleLiterageChange = (val) => {
      const lit = parseFloat(val);
      setManualLiterage(isNaN(lit) ? null : lit);
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

  const toggleClientCluster = (id) => {
      setClientSelectedClusters(prev => {
          if (prev.includes(id)) {
              return prev.filter(item => item !== id);
          } else {
              return [...prev, id];
          }
      });
  };

  useEffect(() => {
      if (anchorMode === 'items' && displayTotalItems > 0) {
          const newBoxes = Math.ceil(displayTotalItems / (unitsPerBox || 1));
          if (newBoxes !== currentTotalBoxes) {
              distributeBoxes(newBoxes, 'current_ratio');
          }
      } else {
          setManualTotalItems(null);
      }
  }, [unitsPerBox]);

  // --- РАСЧЕТ МЕТРИК ---
  const distribution = useMemo(() => {
    let totalWeightedTimeCurrent = 0;
    let totalWeightedTimeTarget = 0;
    
    // Эмуляция риска: если риск высокий, мы "подмешиваем" заказы с Дальнего Востока (id: 'dv')
    // Допустим, 10% заказов внезапно идут с ДВ (150ч), если товара там нет.
    let riskFactor = 0; // 0 = нет риска
    if (riskMode === 'high') riskFactor = 0.1; // 10% заказов это "выбросы" с ДВ

    // Нормализация долей спроса с учетом риск-фактора
    const totalGlobalDemand = clusters.reduce((sum, c) => sum + c.demandShare, 0);
    
    // Находим "проблемный" кластер для стресс-теста (Дальний Восток)
    const riskyCluster = clusters.find(c => c.id === 'dv');
    const riskyTime = riskyCluster ? riskyCluster.remoteHours : 150;

    let accumulatedWeight = 0;

    clusters.forEach(c => {
        // Базовый вес региона
        let weight = c.demandShare / totalGlobalDemand;
        
        // В режиме риска мы "разбавляем" нормальные веса, добавляя вес к "плохому" сценарию
        if (riskMode === 'high') {
            weight = weight * (1 - riskFactor); 
        }
        accumulatedWeight += weight;

        // Сценарий 1 (Текущий): Проверяем, возит ли клиент в этот кластер
        const isClientStock = clientSelectedClusters.includes(c.id);
        const timeCurrent = isClientStock ? 28 : c.remoteHours; 
        totalWeightedTimeCurrent += timeCurrent * weight;

        // Сценарий 2 (Целевой): Проверяем, есть ли короба в распределении
        const hasStock = c.boxCount > 0;
        const timeTarget = hasStock ? 28 : c.remoteHours; 
        totalWeightedTimeTarget += timeTarget * weight;
    });

    // Добавляем влияние риска (отдельно 10% заказов с ДВ)
    if (riskMode === 'high') {
        // Для "Текущего": если клиент не возит на ДВ, он получает 150ч за эти 10% заказов
        const clientHasRiskCover = clientSelectedClusters.includes('dv');
        const timeRiskCurrent = clientHasRiskCover ? 28 : riskyTime;
        totalWeightedTimeCurrent += timeRiskCurrent * riskFactor;

        // Для "Целевого": если мы распределили на ДВ, мы получаем 28ч, иначе 150ч
        const targetHasRiskCover = clusters.find(c => c.id === 'dv' && c.boxCount > 0);
        const timeRiskTarget = targetHasRiskCover ? 28 : riskyTime;
        totalWeightedTimeTarget += timeRiskTarget * riskFactor;
    }

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
  }, [clusters, clientSelectedClusters, riskMode]);

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
      if (currentLiterage > 5) base += (currentLiterage - 5) * ozonTariffs.logisticsLiter;
      
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

  // --- Theme Helpers ---
  const theme = {
    bg: isDarkMode ? 'bg-zinc-950' : 'bg-slate-50',
    card: isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200',
    text: isDarkMode ? 'text-zinc-200' : 'text-slate-800',
    inputBg: isDarkMode ? 'bg-zinc-950 border-zinc-700 text-zinc-200' : 'bg-white border-slate-200 text-slate-700',
    primary: isDarkMode ? 'text-blue-400' : 'text-blue-700',
    secondary: isDarkMode ? 'text-slate-400' : 'text-slate-500',
    highlight: isDarkMode ? 'bg-blue-900 border-blue-900' : 'bg-blue-50 border-blue-100',
    tableHeaderBg: isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-200',
    tableRowActive: isDarkMode ? 'bg-blue-950' : 'bg-blue-50',
    profitPositive: isDarkMode ? 'bg-emerald-950 border-emerald-900 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-700',
    profitNegative: isDarkMode ? 'bg-orange-950 border-orange-900 text-orange-400' : 'bg-orange-50 border-orange-100 text-orange-700',
  };

  const t = {
      cardBg: isDarkMode ? 'bg-zinc-900' : 'bg-white',
      cardBorder: isDarkMode ? 'border-zinc-800' : 'border-slate-200',
      headerTitle: isDarkMode ? 'text-blue-300' : 'text-blue-900',
      subtitleText: isDarkMode ? 'text-zinc-500' : 'text-slate-400',
      inputBg: isDarkMode ? 'bg-zinc-950' : 'bg-white',
      inputBorder: isDarkMode ? 'border-zinc-700' : 'border-slate-200',
      inputText: isDarkMode ? 'text-zinc-200' : 'text-slate-700',
      focusRing: 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
  };

  // --- LOGIC FOR COLORED BLOCK ---
  const isTargetBetter = distribution.target.svd < distribution.current.svd;
  
  const targetBlockStyles = isTargetBetter
    ? (isDarkMode ? 'bg-emerald-950 border-emerald-900 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
    : (isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-slate-50 border-slate-200 text-slate-600');

  const targetValueStyles = isTargetBetter
    ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600')
    : (isDarkMode ? 'text-zinc-200' : 'text-slate-800');

  return (
    <div className={isDarkMode ? 'dark' : ''}>
    <div className={`p-4 ${theme.bg} min-h-screen font-sans ${theme.text} transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className={`text-2xl font-bold ${theme.primary} flex items-center gap-2`}>
                <Truck className="fill-yellow-400 text-blue-700 dark:text-blue-500" /> Калькулятор выгоды Ozon FBO
            </h1>
            <p className={`text-sm ${theme.secondary}`}>Учитываем СВД (Среднее Время Доставки) и штрафы</p>
          </div>
          <div className="flex gap-2">
             <button onClick={() => setIsDarkMode(!isDarkMode)} className={`bg-white dark:bg-zinc-900 px-3 py-2 rounded-lg text-sm font-medium border ${theme.card} hover:bg-slate-50 dark:hover:bg-zinc-800 ${theme.secondary} transition-colors`}>
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
             </button>
             <button onClick={() => {setClusters(initialClusters); setManualTotalItems(null); setManualLiterage(null); setManualUnitsPerBox(null); setRiskMode('normal');}} className={`bg-white dark:bg-zinc-900 px-4 py-2 rounded-lg text-sm font-medium border ${theme.card} hover:bg-slate-50 dark:hover:bg-zinc-800 ${theme.secondary} flex items-center gap-2 transition-colors`}>
                <RotateCcw size={16} /> Сброс
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* 1. БЛОК ВЫБОРА */}
            <div className={`p-4 rounded-xl border ${theme.card} relative overflow-hidden transition-colors`}>
                <h3 className={`font-bold text-sm ${theme.primary} mb-3 flex items-center gap-2`}>
                    <Settings size={16} /> Текущая ситуация (Выбор складов)
                </h3>
                
                <div className="space-y-3">
                    <div>
                        <label className={`text-[10px] uppercase font-bold ${theme.secondary} mb-1 block`}>Куда возите сейчас?</label>
                        <div className={`max-h-32 overflow-y-auto border ${theme.card} rounded-lg p-1 custom-scrollbar`}>
                            {clusters.map(c => {
                                const isSelected = clientSelectedClusters.includes(c.id);
                                return (
                                    <div 
                                        key={c.id} 
                                        onClick={() => toggleClientCluster(c.id)}
                                        className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded text-xs transition-colors ${isSelected ? 'bg-orange-100 dark:bg-orange-900 text-orange-900 dark:text-orange-300 font-medium' : 'hover:bg-slate-200 dark:hover:bg-zinc-800'}`}
                                    >
                                        {isSelected ? <CheckSquare size={14} className="text-orange-600 dark:text-orange-400"/> : <Square size={14} className="text-slate-400 dark:text-zinc-600"/>}
                                        <span className="truncate flex-1">{c.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className={`text-[10px] ${theme.secondary} mt-1`}>
                            Выбрано: {clientSelectedClusters.length}. Влияет на "Только Центр".
                        </div>
                    </div>
                </div>
            </div>

            {/* 1.5. СТАТИСТИКА ВРЕМЕНИ + СИМУЛЯТОР */}
            <div className={`p-4 rounded-xl border ${theme.card} relative overflow-hidden transition-colors`}>
                <h3 className={`font-bold text-sm ${theme.primary} mb-3 flex items-center justify-between relative z-10`}>
                    <span className="flex items-center gap-2"><Clock size={16} /> СВД (Среднее время доставки)</span>
                </h3>
                
                <div className="grid grid-cols-2 gap-4 relative z-10 mb-4">
                    <div className={`bg-slate-50 dark:bg-zinc-950 p-3 rounded-lg border ${isDarkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                        <div className={`text-[10px] uppercase font-bold ${theme.secondary} mb-1`}>Сейчас (Выбранное)</div>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{Math.round(distribution.current.svd)} ч</div>
                        <div className="text-xs mt-1 space-y-0.5">
                             <div className={`flex justify-between ${isDarkMode ? 'text-zinc-400' : ''}`}><span>Коэфф:</span> <b>x{currentScenario.params.coeff}</b></div>
                             <div className="flex justify-between text-red-600 dark:text-red-400"><span>Штраф:</span> <b>{currentScenario.params.commission}%</b></div>
                        </div>
                    </div>
                    {/* CONDITIONAL STYLING */}
                    <div className={`p-3 rounded-lg border ${targetBlockStyles}`}>
                        <div className="text-[10px] uppercase font-bold mb-1 opacity-80">С распределением</div>
                        <div className={`text-2xl font-bold ${targetValueStyles}`}>{Math.round(distribution.target.svd)} ч</div>
                        <div className="text-xs mt-1 space-y-0.5 opacity-90">
                             <div className="flex justify-between"><span>Коэфф:</span> <b>x{targetScenario.params.coeff}</b></div>
                             <div className="flex justify-between"><span>Штраф:</span> <b>{targetScenario.params.commission}%</b></div>
                        </div>
                    </div>
                </div>

                {/* Блок Симулятора Рисков */}
                <div className={`pt-3 border-t ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-zinc-300">
                            {riskMode === 'high' ? <ShieldAlert size={14} className="text-red-500"/> : <ShieldCheck size={14} className="text-emerald-500"/>}
                            Симулятор рисков (Дальние заказы)
                        </div>
                        <div className="flex bg-slate-100 dark:bg-zinc-800 rounded p-0.5">
                            <button 
                                onClick={() => setRiskMode('normal')}
                                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${riskMode === 'normal' ? 'bg-white dark:bg-zinc-600 shadow-sm font-bold text-slate-800 dark:text-zinc-100' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700'}`}
                            >
                                Норма
                            </button>
                            <button 
                                onClick={() => setRiskMode('high')}
                                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${riskMode === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-bold' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700'}`}
                            >
                                Риск (7 дней)
                            </button>
                        </div>
                    </div>
                    {riskMode === 'high' && (
                        <div className={`text-[10px] p-2 rounded bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 leading-tight`}>
                            ⚠️ <b>Стресс-тест:</b> Моделируем 10% случайных заказов с Дальнего Востока (150 часов). Если товара там нет, СВД резко ухудшится.
                        </div>
                    )}
                </div>
            </div>

            {/* 2. ТОВАР */}
            <div className={`${t.cardBg} p-4 rounded-xl border ${t.cardBorder}`}>
               <h3 className={`font-semibold text-sm ${t.headerTitle} mb-3 flex items-center gap-2`}>
                <Box size={16} /> Товар (Габариты и Цена)
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
                  <div className="flex-1">
                     <label className={`text-[10px] uppercase font-bold ${t.subtitleText}`}>Высота</label>
                     <input type="number" value={product.height} onChange={(e) => setProduct({...product, height: Number(e.target.value)})} className={`w-full p-1 border rounded text-center text-sm ${t.inputBg} ${t.inputBorder} ${t.inputText} ${t.focusRing}`} />
                  </div>
               </div>
               
               <div className="mb-2">
                   <label className={`text-[10px] uppercase font-bold ${t.subtitleText}`}>Цена товара</label>
                   <div className="relative">
                        <input type="number" value={product.price} onChange={(e) => setProduct({...product, price: Number(e.target.value)})} className={`w-full p-1.5 border rounded pl-8 font-bold ${t.inputText} ${t.inputBg} ${t.inputBorder} ${t.focusRing}`} />
                        <span className={`absolute left-2 top-1.5 ${t.subtitleText}`}>₽</span>
                   </div>
               </div>
               
               {/* Ручной ввод штук в коробе */}
               <div className={`flex items-center gap-3 ${isDarkMode ? 'bg-blue-950 border-blue-900' : 'bg-blue-50 border-blue-100'} p-2 rounded border mt-2`}>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                        <label className={`text-[10px] uppercase font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>Штук в коробе</label>
                        <button 
                            onClick={() => setAnchorMode('units')}
                            className={`text-[9px] px-1.5 rounded transition-colors ${anchorMode === 'units' ? 'bg-blue-600 text-white' : `text-blue-400 hover:bg-blue-100 ${isDarkMode ? 'hover:bg-blue-900' : ''}`}`}
                            title={anchorMode === 'units' ? 'Режим: Вложения зафиксированы' : 'Включить режим фиксированных вложений'}
                        >
                            {anchorMode === 'units' ? <Lock size={10} /> : <Unlock size={10} />}
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            value={unitsPerBox} 
                            onChange={(e) => handleUnitsPerBoxChange(e.target.value)}
                            className={`w-full p-1.5 border rounded font-bold text-center outline-none ${t.focusRing} 
                            ${manualUnitsPerBox !== null ? `${t.cardBg} border-blue-500 text-blue-700 ${isDarkMode ? 'text-blue-400 border-blue-700' : ''}` : `${t.inputBg} ${t.inputBorder} ${t.inputText}`}`}
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
                  <div className={`flex-1 border-l pl-3 ${isDarkMode ? 'border-blue-800' : 'border-blue-200'}`}>
                      <div className={`text-[10px] ${isDarkMode ? 'text-blue-300' : 'text-blue-800'} opacity-70 mb-1`}>Объем товара</div>
                      <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            value={currentLiterage.toFixed(2)}
                            onChange={(e) => handleLiterageChange(e.target.value)}
                            className={`w-full p-1 text-sm font-bold text-blue-900 dark:text-blue-200 border-b border-dashed border-blue-300 dark:border-blue-700 bg-transparent outline-none focus:border-blue-600 ${manualLiterage !== null ? 'bg-white dark:bg-zinc-800 rounded border-solid border-blue-500 px-2' : ''}`}
                          />
                          <span className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-800'} font-bold`}>л</span>
                          {manualLiterage !== null && (
                              <button onClick={() => setManualLiterage(null)} className="text-blue-400 hover:text-red-500">
                                  <X size={14}/>
                              </button>
                          )}
                      </div>
                  </div>
               </div>
            </div>

            {/* 3. КЛАСТЕРЫ */}
            <div className={`p-4 rounded-xl border ${theme.card} flex-grow flex flex-col h-[500px] transition-colors`}>
               <div className="flex justify-between items-center mb-3">
                  <h3 className={`font-semibold text-sm ${theme.primary} flex items-center gap-2`}>
                    <Map size={16} /> Кластеры (vRDC)
                  </h3>
               </div>
               
               {/* Кнопки распределения */}
               <div className="flex gap-2 mb-3">
                   <button onClick={handleAutoMax} className={`flex-1 text-[11px] bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border ${theme.card} px-2 py-1.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 transition font-medium flex justify-center items-center gap-1`}>
                      <Map size={12}/> Все регионы (Max)
                   </button>
                   <button onClick={handleAutoLite} className={`flex-1 text-[11px] bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900 px-2 py-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900 transition font-medium flex justify-center items-center gap-1`}>
                      <Zap size={12}/> Популярные (Lite)
                   </button>
               </div>

               {/* Редактируемые итоги */}
               <div className={`bg-slate-50 dark:bg-zinc-950 border ${t.inputBorder} rounded-lg p-3 mb-3 flex gap-3`}>
                   <div className="flex-1">
                       <label className={`text-[10px] uppercase font-bold ${t.subtitleText} mb-1 block`}>Всего коробов</label>
                       <input 
                           type="number" 
                           value={currentTotalBoxes} 
                           onChange={(e) => handleTotalBoxesChange(e.target.value)}
                           className={`w-full p-1.5 text-lg font-bold ${t.inputText} ${t.inputBg} border rounded outline-none ${t.focusRing} ${t.inputBorder}`}
                       />
                   </div>
                   <div className="flex-1 text-right">
                       <div className="flex justify-end items-center mb-1 gap-2">
                           <button 
                               onClick={() => setAnchorMode('items')}
                               className={`text-[9px] px-1.5 rounded transition-colors ${anchorMode === 'items' ? 'bg-blue-600 text-white' : `text-blue-400 hover:bg-blue-100 ${isDarkMode ? 'hover:bg-blue-900' : ''}`}`}
                               title={anchorMode === 'items' ? 'Режим: Товары зафиксированы (Якорь)' : 'Включить режим фиксированных товаров'}
                           >
                               {anchorMode === 'items' ? <Lock size={10} /> : <Unlock size={10} />}
                           </button>
                           <label className={`text-[10px] uppercase font-bold ${t.subtitleText} block`}>Товаров в партии</label>
                       </div>
                       <div className="relative">
                           <input 
                               type="number" 
                               value={displayTotalItems}
                               onChange={(e) => handleTotalItemsChange(e.target.value)} 
                               className={`w-full p-1.5 text-lg font-bold text-blue-600 dark:text-blue-400 ${t.inputBg} border ${t.inputBorder} rounded outline-none text-right ${t.focusRing} ${manualTotalItems !== null ? 'border-blue-500/50 ring-1 ring-blue-500/20' : ''}`}
                           />
                       </div>
                   </div>
               </div>
               
               <div className={`overflow-y-auto custom-scrollbar border ${theme.card} rounded-lg flex-1`}>
                   <table className="w-full text-xs text-left">
                       <thead className={`text-slate-50 dark:text-zinc-400 font-semibold border-b ${theme.tableHeaderBg} sticky top-0 z-10`}>
                           <tr>
                               <th className={`px-3 py-2 ${theme.tableHeaderBg}`}>Кластер</th>
                               <th className={`px-2 py-2 text-right ${theme.tableHeaderBg}`}>vRDC</th>
                               <th className={`px-2 py-2 text-center ${theme.tableHeaderBg}`}>Коробов</th>
                           </tr>
                       </thead>
                       <tbody className={`divide-y ${isDarkMode ? 'divide-zinc-800' : 'divide-slate-100'}`}>
                           {clusters.map((c) => {
                               return (
                               <tr key={c.id} className={`group ${c.enabled || c.isBase ? 'bg-blue-50/20 dark:bg-blue-900/10' : 'bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800'}`}>
                                   <td className={`px-3 py-2 border-b ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
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
                                   <td className={`px-2 py-2 text-right border-b ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
                                       <input 
                                          type="number" 
                                          value={c.vrdcBoxRate}
                                          onChange={(e) => updateRate(c.id, e.target.value)}
                                          disabled={c.isBase}
                                          className={`w-12 text-right bg-transparent border-b border-dashed border-slate-300 dark:border-zinc-700 outline-none text-slate-600 dark:text-zinc-400 ${!c.enabled && !c.isBase && 'text-slate-300 dark:text-zinc-600'}`}
                                       />
                                   </td>
                                   <td className={`px-2 py-2 text-center w-20 border-b ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
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
            <div className={`p-3 rounded-xl border ${theme.card} transition-colors`}>
                <details className="text-sm">
                    <summary className={`font-semibold ${theme.secondary} cursor-pointer flex items-center gap-2`}>
                        <DollarSign size={14} /> Настройки тарифов
                    </summary>
                    <div className={`mt-3 space-y-3 pl-2 border-l-2 ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
                        {/* Фулфилмент */}
                        <div className={`text-[10px] uppercase font-bold ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'} mb-1`}>Фулфилмент (Мы)</div>
                        <div className="flex justify-between items-center"><span className={`${theme.secondary} text-xs`}>Доставка до РФЦ (за короб)</span> <input className={`w-16 border rounded text-right text-xs p-1 font-bold ${t.inputBg} ${t.inputBorder} ${t.inputText}`} value={ffRates.deliveryToRfc} onChange={e => setFfRates({...ffRates, deliveryToRfc: +e.target.value})} /></div>
                        <div className="flex justify-between items-center"><span className={`${theme.secondary} text-xs`}>Обработка (шт)</span> <input className={`w-14 border rounded text-right text-xs p-1 ${t.inputBg} ${t.inputBorder} ${t.inputText}`} value={ffRates.processing} onChange={e => setFfRates({...ffRates, processing: +e.target.value})} /></div>
                        <div className="flex justify-between items-center"><span className={`${theme.secondary} text-xs`}>Спецификация (шт)</span> <input className={`w-14 border rounded text-right text-xs p-1 ${t.inputBg} ${t.inputBorder} ${t.inputText}`} value={ffRates.specification} onChange={e => setFfRates({...ffRates, specification: +e.target.value})} /></div>
                        <div className="flex justify-between items-center"><span className={`${theme.secondary} text-xs`}>Сборка (кор)</span> <input className={`w-14 border rounded text-right text-xs p-1 ${t.inputBg} ${t.inputBorder} ${t.inputText}`} value={ffRates.boxAssembly} onChange={e => setFfRates({...ffRates, boxAssembly: +e.target.value})} /></div>
                        <div className="flex justify-between items-center"><span className={`${theme.secondary} text-xs`}>Короб (материал)</span> <input className={`w-14 border rounded text-right text-xs p-1 ${t.inputBg} ${t.inputBorder} ${t.inputText}`} value={ffRates.boxMaterial} onChange={e => setFfRates({...ffRates, boxMaterial: +e.target.value})} /></div>
                        
                        {/* Разделитель */}
                        <div className={`my-2 border-t-2 border-dashed ${isDarkMode ? 'border-blue-900' : 'border-blue-100'} relative`}>
                             <span className={`absolute -top-2.5 left-0 ${theme.bg} pr-2 text-[10px] font-bold text-blue-500 uppercase`}>Озон (Маркетплейс)</span>
                        </div>
                        
                        {/* Озон */}
                        <div className="pt-1">
                             <div className="flex justify-between items-center"><span className={`text-blue-800 dark:text-blue-300 text-xs`}>База логистики (до 5л)</span> <input className={`w-16 border rounded text-right text-xs p-1 text-blue-700 dark:text-blue-300 ${t.inputBg} ${isDarkMode ? 'border-blue-900' : 'border-blue-200'}`} value={ozonTariffs.logisticsBase} onChange={e => setOzonTariffs({...ozonTariffs, logisticsBase: +e.target.value})} /></div>
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
                <div className={`relative overflow-hidden p-4 rounded-xl border ${profit >= 0 ? theme.profitPositive : theme.profitNegative}`}>
                    <div className="relative z-10">
                        <div className={`text-xs font-bold uppercase tracking-wider ${theme.secondary} mb-1`}>Выгода за партию</div>
                        <div className={`text-2xl font-bold ${profit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-orange-700 dark:text-orange-400'}`}>
                            {profit > 0 ? '+' : ''}{Math.round(profit).toLocaleString()} ₽
                        </div>
                        <div className={`text-[10px] mt-1 opacity-80 ${theme.secondary} leading-tight`}>
                            Улучшение СВД на {Math.round(distribution.current.svd - distribution.target.svd)}ч убирает штраф {currentScenario.params.commission}%
                        </div>
                    </div>
                </div>

                {/* 2. vRDC Cost */}
                <div className={`p-4 rounded-xl border ${theme.card} transition-colors`}>
                     <div className={`text-xs font-bold uppercase tracking-wider ${theme.secondary} mb-1`}>Затраты на vRDC</div>
                     <div className="flex items-center gap-3">
                         <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{Math.round(distribution.target.vrdcCost).toLocaleString()} ₽</div>
                     </div>
                     <div className={`text-xs mt-1 ${theme.secondary}`}>
                        Оплата Озону за развоз
                     </div>
                </div>

                {/* 3. Ozon Logistics Total */}
                <div className={`p-4 rounded-xl border ${theme.card} transition-colors`}>
                     <div className={`text-xs font-bold uppercase tracking-wider ${theme.secondary} mb-1`}>Итого (Партия)</div>
                     <div className="flex flex-col">
                         <div className={`text-2xl font-bold ${theme.primary}`}>
                             {Math.round(totalCostTarget).toLocaleString()} ₽
                         </div>
                         <div className={`text-[10px] ${theme.secondary} line-through`}>
                             {Math.round(totalCostCurrent).toLocaleString()} ₽
                         </div>
                     </div>
                </div>
            </div>

            {/* Analysis Chart */}
            <div className={`p-5 rounded-xl border ${theme.card} transition-colors`}>
                 <h4 className={`font-bold ${theme.secondary} mb-4 text-sm`}>Структура затрат</h4>
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
            <div className={`rounded-xl border ${theme.card} overflow-hidden text-sm transition-colors`}>
                <table className="w-full text-left">
                    <thead className={`text-xs uppercase ${theme.secondary} font-semibold border-b ${theme.tableHeaderBg}`}>
                        <tr>
                            <th className="px-5 py-3">Показатель</th>
                            <th className="px-5 py-3 text-right">Только Центр</th>
                            <th className={`px-5 py-3 text-right ${theme.primary} ${theme.tableRowActive}`}>
                                Распределение
                            </th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-zinc-800' : 'divide-slate-100'} ${theme.text}`}>
                        <tr>
                            <td className="px-5 py-3 font-medium">Среднее время доставки (СВД)</td>
                            <td className="px-5 py-3 text-right font-bold text-red-600 dark:text-red-400">{Math.round(distribution.current.svd)} ч</td>
                            <td className={`px-5 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 ${theme.tableRowActive}`}>{Math.round(distribution.target.svd)} ч</td>
                        </tr>
                        <tr>
                            <td className="px-5 py-3">
                                <div>Фулфилмент + Логистика до РФЦ</div>
                                <div className={`text-xs ${theme.secondary}`}>Услуги, материалы, доставка коробов</div>
                            </td>
                            <td className="px-5 py-3 text-right">{Math.round(ffServicesCost + ourDeliveryCost).toLocaleString()} ₽</td>
                            <td className={`px-5 py-3 text-right ${theme.tableRowActive}`}>{Math.round(ffServicesCost + ourDeliveryCost).toLocaleString()} ₽</td>
                        </tr>
                        <tr>
                            <td className="px-5 py-3">
                                <div>Логистика Озон (База × Коэфф)</div>
                                <div className={`text-xs ${theme.secondary}`}>Коэфф: {currentScenario.params.coeff} vs {targetScenario.params.coeff}</div>
                            </td>
                            <td className="px-5 py-3 text-right">{Math.round(currentScenario.logistics).toLocaleString()} ₽</td>
                            <td className={`px-5 py-3 text-right ${theme.tableRowActive}`}>{Math.round(targetScenario.logistics).toLocaleString()} ₽</td>
                        </tr>
                        <tr>
                            <td className="px-5 py-3">
                                <div className="flex items-center gap-1">Штрафная комиссия <AlertTriangle size={12} className="text-red-500 dark:text-red-400"/></div>
                                <div className={`text-xs ${theme.secondary}`}>{currentScenario.params.commission}% от цены товара</div>
                            </td>
                            <td className="px-5 py-3 text-right text-red-600 dark:text-red-400 font-bold">{Math.round(currentScenario.commission).toLocaleString()} ₽</td>
                            <td className={`px-5 py-3 text-right text-red-600 dark:text-red-400 font-bold ${theme.tableRowActive}`}>{Math.round(targetScenario.commission).toLocaleString()} ₽</td>
                        </tr>
                        <tr>
                            <td className="px-5 py-3">vRDC (Кросс-докинг)</td>
                            <td className={`px-5 py-3 text-right ${theme.secondary}`}>-</td>
                            <td className={`px-5 py-3 text-right font-medium text-orange-600 dark:text-orange-400 ${theme.tableRowActive}`}>{Math.round(distribution.target.vrdcCost).toLocaleString()} ₽</td>
                        </tr>
                        <tr className={`${isDarkMode ? 'bg-zinc-800 text-zinc-100' : 'bg-slate-50 text-slate-900'} font-bold border-t-2 ${isDarkMode ? 'border-zinc-700' : 'border-slate-100'}`}>
                            <td className="px-5 py-3">ИТОГО ПАРТИЯ</td>
                            <td className="px-5 py-3 text-right">{Math.round(totalCostCurrent).toLocaleString()} ₽</td>
                            <td className={`px-5 py-3 text-right ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>{Math.round(totalCostTarget).toLocaleString()} ₽</td>
                        </tr>
                        <tr className={`${isDarkMode ? 'bg-blue-900/5 text-blue-300' : 'bg-blue-50/10 text-blue-900'} font-bold border-t ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
                            <td className="px-5 py-3 text-xs uppercase tracking-wider">Затраты на 1 шт.</td>
                            <td className="px-5 py-3 text-right">{Math.round(unitCostCurrent).toLocaleString()} ₽</td>
                            <td className={`px-5 py-3 text-right ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-100/50'}`}>{Math.round(unitCostTarget).toLocaleString()} ₽</td>
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
