
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, PlayerStats, Talent, Weather, NPC, Dialogue, Achievement, Notification } from './types';
import { ITEMS, WEATHERS, QUIZ_QUESTIONS, NPCS, PROLOGUE_TEXTS, ACHIEVEMENTS, FLAVOR_TEXTS, MARKET_RUMORS, DAILY_MEAL_TEXTS } from './constants';
import { useInput } from './hooks/useInput';
import { getDynamicEvent, getNpcDialogue } from './services/geminiService';

const DAILY_COST = 20;

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [prologueStep, setPrologueStep] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [stats, setStats] = useState<PlayerStats>({
    silver: Math.floor(Math.random() * 41) + 60, // 初始拥有 60-100 两之间的随机数
    reputation: 50,
    cunning: 10,
    inventory: {},
    talent: null,
    day: 14,
    npcRelationships: NPCS.reduce((acc, npc) => ({ ...acc, [npc.id]: npc.baseAffinity }), {}),
    hungerLevel: 0
  });
  
  const [currentWeather, setCurrentWeather] = useState<Weather>(Weather.SUNNY);
  const [ap, setAp] = useState(0); 
  const [event, setEvent] = useState<any>(null);
  const [eventLoading, setEventLoading] = useState(false);
  const [activeNpc, setActiveNpc] = useState<NPC | null>(null);
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [dialogueLoading, setDialogueLoading] = useState(false);
  const [dialogueResult, setDialogueResult] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  
  // 焦点控制系统
  const [activeZone, setActiveZone] = useState<'market' | 'inventory'>('market');
  const [selectedIndex, setSelectedIndex] = useState(0); // 集市区焦点索引
  const [inventoryIndex, setInventoryIndex] = useState(0); // 背篓区焦点索引

  // 连续购买优化：记录上一次购买的物品 ID
  const [lastBoughtItemId, setLastBoughtItemId] = useState<string | null>(null);

  const [activeRumor, setActiveRumor] = useState<string>("青石镇一片祥和，商贩们都在暗暗内卷。");
  const [priceMultipliers, setPriceMultipliers] = useState<Record<string, number>>({});

  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [isRolling, setIsRolling] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [diceFace, setDiceFace] = useState(1);
  const [daySummary, setDaySummary] = useState("");

  const marketScrollRef = useRef<HTMLDivElement>(null);
  const lastInputTime = useRef<number>(0);

  // 自动滚动逻辑：确保当前选中的元素在视口内
  useEffect(() => {
    if (gameState === GameState.PLAYING && activeZone === 'market' && marketScrollRef.current) {
      const activeElement = marketScrollRef.current.querySelector('.selected-glow');
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedIndex, activeZone, gameState]);

  const colors = {
    almond: '#F0D9C0',
    gold: '#EBB559',
    burntOrange: '#B24425',
    terracotta: '#CF743C',
    darkBrown: '#4A3728',
    ink: '#1A130F',
    white: '#FFFFFF'
  };

  const backpackItems = Object.entries(stats.inventory).filter(([_, count]) => (count as number) > 0);

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 8));

  useEffect(() => {
    ACHIEVEMENTS.forEach(ach => {
      if (!unlockedAchievementIds.has(ach.id) && ach.check(stats)) {
        setUnlockedAchievementIds(prev => new Set(prev).add(ach.id));
        setStats(s => ({
          ...s,
          silver: s.silver + (ach.reward.silver || 0),
          reputation: s.reputation + (ach.reward.reputation || 0),
          cunning: s.cunning + (ach.reward.cunning || 0)
        }));
        const newNotif = { id: Math.random().toString(), title: `达成：${ach.name}`, message: ach.description };
        setNotifications(prev => [...prev, newNotif]);
        setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== newNotif.id)), 4000);
      }
    });
  }, [stats, unlockedAchievementIds]);

  const rollDice = () => {
    setIsRolling(true);
    setIsRevealing(false);
    setLastBoughtItemId(null); // 新的一天重置购买记录
    let rolls = 0;
    const maxRolls = 12;
    const interval = setInterval(() => {
      setDiceFace(Math.floor(Math.random() * 6) + 1);
      rolls++;
      if (rolls >= maxRolls) {
        clearInterval(interval);
        const finalResult = Math.floor(Math.random() * 6) + 1;
        setDiceFace(finalResult);
        setIsRolling(false);
        setIsRevealing(true);
        
        const hasRumor = Math.random() > 0.4;
        if (hasRumor) {
          const rumor = MARKET_RUMORS[Math.floor(Math.random() * MARKET_RUMORS.length)];
          setActiveRumor(rumor.text);
          setPriceMultipliers({ [rumor.target]: rumor.multiplier });
        } else {
          setActiveRumor("今天集市风平浪静，没有新鲜事。");
          setPriceMultipliers({});
        }

        setTimeout(() => {
          setAp(finalResult);
          addLog(`新的一天，得 ${finalResult} 点体力。`);
          addLog(FLAVOR_TEXTS[Math.floor(Math.random() * FLAVOR_TEXTS.length)]);
          setCurrentWeather(WEATHERS[Math.floor(Math.random() * WEATHERS.length)]);
          setTimeout(() => {
            setIsRevealing(false);
            setDaySummary("");
          }, 1500);
        }, 200);
      }
    }, 80);
  };

  const nextDay = () => {
    let summaryText = "";
    if (stats.day === 14) {
      summaryText = "初来乍到，你在青石镇寻了个避风的草垛。掌柜见你可怜，第一宿伙食便免了。";
    } else {
      if (stats.silver >= DAILY_COST) {
        summaryText = DAILY_MEAL_TEXTS[Math.floor(Math.random() * DAILY_MEAL_TEXTS.length)];
      } else {
        summaryText = "囊中羞涩，你只能就着雪水啃了半块硬邦邦的干饼。饥肠辘辘，此夜难熬。";
      }
    }
    setDaySummary(summaryText);

    setStats(prev => {
      let newSilver = prev.silver;
      let newHunger = prev.hungerLevel;
      if (prev.day < 14) {
        if (newSilver >= DAILY_COST) {
          newSilver -= DAILY_COST;
          newHunger = 0;
          addLog(`结算：饱餐消费 20 两。`);
        } else {
          newHunger += 1;
          addLog(`结算：饥肠辘辘，命在旦夕！`);
        }
      }
      return { ...prev, silver: Math.max(0, newSilver), hungerLevel: newHunger, day: Math.max(0, prev.day - 1) };
    });

    rollDice();
  };

  useEffect(() => {
    if (stats.hungerLevel >= 2 || stats.day === 0) {
      if (!isRolling && !isRevealing && gameState === GameState.PLAYING) {
        setGameState(GameState.GAMEOVER);
      }
    }
  }, [stats.hungerLevel, stats.day, isRolling, isRevealing, gameState]);

  const handleAction = async (actionType: string, payload?: any) => {
    if (actionType === 'BUY') {
      const item = payload;
      const multiplier = priceMultipliers[item.id] || 1.0;
      const actualPrice = Math.round(item.basePrice * multiplier);

      if (stats.silver < actualPrice) {
        addLog("银两不够，老板的脸色很难看。");
        return;
      }

      // 连续买入逻辑：如果购买的物品 ID 与上一次相同，不扣 AP
      if (item.id !== lastBoughtItemId) {
        if (ap <= 0) {
          addLog("气力不足，歇歇吧。");
          return;
        }
        setAp(prev => prev - 1);
        setLastBoughtItemId(item.id);
      }

      setStats(prev => ({
        ...prev,
        silver: Math.max(0, prev.silver - actualPrice),
        inventory: { ...prev.inventory, [item.id]: ((prev.inventory[item.id] as number) || 0) + 1 }
      }));
      addLog(`买入 1 件 ${item.name}。`);
    } else {
      // 卖出或打盹时，消耗 AP 且重置连续购买记录
      if (ap <= 0) {
        addLog("气力不足，歇歇吧。");
        return;
      }

      if (actionType === 'SELL') {
        const item = payload;
        if (((stats.inventory[item.id] as number) || 0) > 0) {
          const weatherBonus = currentWeather === Weather.SNOWY ? 1.4 : 1.0;
          const cunningBonus = 1 + (stats.cunning / 100);
          const multiplier = priceMultipliers[item.id] || 1.0;
          const profit = Math.round(item.basePrice * multiplier * weatherBonus * cunningBonus * (1.1 + Math.random() * 0.4));
          setStats(prev => ({
            ...prev,
            silver: prev.silver + profit,
            inventory: { ...prev.inventory, [item.id]: (prev.inventory[item.id] as number) - 1 }
          }));
          setAp(prev => prev - 1);
          setLastBoughtItemId(null); // 重置连续购买
          addLog(`买卖：脱手 ${item.name}，获银 ${profit} 两。`);
        } else {
          addLog("没货卖，建议你去对面王掌柜那进点货。");
          return;
        }
      } else if (actionType === 'REST') {
        setAp(prev => prev - 1);
        setLastBoughtItemId(null); // 重置连续购买
        addLog("你坐在路边思考人生，除了浪费体力一无所获。");
      }
    }

    if (Math.random() > 0.6) {
      setEventLoading(true);
      const dynEvent = await getDynamicEvent(`离线模式`);
      setEventLoading(false);
      if (dynEvent) { 
        setEvent(dynEvent); 
        setGameState(GameState.EVENT); 
        setSelectedIndex(0); 
      }
    }
  };

  const handleInput = useCallback((key: string) => {
    // 基础防抖，防止手柄连点或自动跳转
    const now = Date.now();
    if (now - lastInputTime.current < 200) return;
    lastInputTime.current = now;

    if (isRolling || isRevealing || eventLoading || dialogueLoading) return;
    
    if (gameState === GameState.START && key === 'Enter') {
      setGameState(GameState.PROLOGUE);
      setPrologueStep(0);
    }
    else if (gameState === GameState.PROLOGUE && key === 'Enter') {
      if (prologueStep < PROLOGUE_TEXTS.length - 1) {
        setPrologueStep(prev => prev + 1);
      } else {
        setGameState(GameState.QUIZ);
        setSelectedIndex(0);
      }
    } else if (gameState === GameState.QUIZ) {
      if (key === 'ArrowUp') setSelectedIndex(p => Math.max(0, p - 1));
      if (key === 'ArrowDown') setSelectedIndex(p => Math.min(QUIZ_QUESTIONS[quizIndex].options.length - 1, p + 1));
      if (key === 'Enter') selectQuizOption(selectedIndex);
    } else if (gameState === GameState.PLAYING) {
      const gridCols = 4;
      const marketItemsCount = ITEMS.length;
      const actionsCount = 4;
      const totalMarket = marketItemsCount + actionsCount;

      if (activeZone === 'market') {
        if (key === 'ArrowLeft' && selectedIndex % gridCols === 0) {
          if (backpackItems.length > 0) {
            setActiveZone('inventory');
            setInventoryIndex(0);
            return;
          }
        }
        if (key === 'ArrowRight') setSelectedIndex(p => Math.min(p + 1, totalMarket - 1));
        if (key === 'ArrowLeft') setSelectedIndex(p => Math.max(0, p - 1));
        if (key === 'ArrowDown') setSelectedIndex(p => Math.min(p + gridCols, totalMarket - 1));
        if (key === 'ArrowUp') setSelectedIndex(p => Math.max(0, p - gridCols));
        
        if (key === 'Enter') {
          if (selectedIndex < marketItemsCount) handleAction('BUY', ITEMS[selectedIndex]);
          else if (selectedIndex === marketItemsCount) handleAction('REST');
          else if (selectedIndex === marketItemsCount + 1) { // 走关系逻辑
            if (ap <= 0) {
              addLog("气力不足，歇歇吧。");
            } else if (stats.silver <= 0) {
              setAp(prev => prev - 1);
              addLog("身无分文也敢来求见？贵人府上的恶奴直接把你撵了出来。");
              setStats(prev => ({
                ...prev,
                npcRelationships: Object.keys(prev.npcRelationships).reduce((acc, id) => ({
                  ...acc,
                  [id]: Math.max(0, prev.npcRelationships[id] - 2)
                }), {})
              }));
            } else {
              setAp(prev => prev - 1);
              setLastBoughtItemId(null);
              setGameState(GameState.SOCIAL); 
              setSelectedIndex(0); 
            }
          }
          else if (selectedIndex === marketItemsCount + 2) { 
            setLastBoughtItemId(null);
            setGameState(GameState.ACHIEVEMENTS); 
            setSelectedIndex(0); 
          }
          else nextDay();
        }
      } else {
        // 背篓区导航
        if (key === 'ArrowRight') {
          setActiveZone('market');
          return;
        }
        if (key === 'ArrowUp') setInventoryIndex(p => Math.max(0, p - 1));
        if (key === 'ArrowDown') setInventoryIndex(p => Math.min(backpackItems.length - 1, p + 1));
        if (key === 'Enter') {
          const [itemId] = backpackItems[inventoryIndex];
          handleAction('SELL', ITEMS.find(i => i.id === itemId));
          // 如果卖完后背篓空了，自动跳回集市
          if (backpackItems.length <= 1) setActiveZone('market');
        }
      }
    } else if (gameState === GameState.EVENT || gameState === GameState.SOCIAL) {
       const limit = gameState === GameState.EVENT ? (event?.options?.length || 1) - 1 : NPCS.length;
       if (key === 'ArrowUp') setSelectedIndex(p => Math.max(0, p - 1));
       if (key === 'ArrowDown') setSelectedIndex(p => Math.min(limit, p + 1));
       if (key === 'Enter') {
         if (gameState === GameState.EVENT) handleEventOption(selectedIndex);
         else if (selectedIndex < NPCS.length) handleSocialSelect(NPCS[selectedIndex]);
         else setGameState(GameState.PLAYING);
       }
       if (key === 'Escape') setGameState(GameState.PLAYING);
    } else if (gameState === GameState.ACHIEVEMENTS) {
      if (key === 'Enter' || key === 'Escape') setGameState(GameState.PLAYING);
    } else if (gameState === GameState.DIALOGUE) {
      if (dialogueResult) {
        if (key === 'Enter') { setDialogueResult(null); setDialogue(null); setGameState(GameState.SOCIAL); setSelectedIndex(0); }
      } else if (dialogue) {
        if (key === 'ArrowUp') setSelectedIndex(p => Math.max(0, p - 1));
        if (key === 'ArrowDown') setSelectedIndex(p => Math.min(dialogue.options.length - 1, p + 1));
        if (key === 'Enter') handleDialogueOption(selectedIndex);
      }
    } else if (gameState === GameState.GAMEOVER) {
      if (key === 'Enter') window.location.reload();
    }
  }, [gameState, prologueStep, quizIndex, selectedIndex, inventoryIndex, activeZone, backpackItems, isRolling, isRevealing, ap, event, dialogue, dialogueResult, eventLoading, dialogueLoading, handleAction, nextDay, lastBoughtItemId, stats.silver, stats.npcRelationships]);

  useInput(handleInput);

  const selectQuizOption = (index: number) => {
    const q = QUIZ_QUESTIONS[quizIndex];
    const opt = q.options[index];
    setStats(prev => ({
      ...prev,
      silver: Math.max(0, prev.silver + (opt.impact?.silver || 0)),
      reputation: prev.reputation + (opt.impact?.reputation || 0),
      cunning: prev.cunning + (opt.impact?.cunning || 0),
      talent: opt.talent || prev.talent
    }));
    if (quizIndex < QUIZ_QUESTIONS.length - 1) { setQuizIndex(prev => prev + 1); setSelectedIndex(0); }
    else { setGameState(GameState.PLAYING); rollDice(); setSelectedIndex(0); }
  };

  const handleEventOption = (index: number) => {
    if (!event) return;
    const opt = event.options[index];
    setStats(prev => {
      const newStats = { ...prev };
      newStats.silver = Math.max(0, newStats.silver + (opt.silverDelta || 0));
      newStats.reputation += opt.reputationDelta || 0;
      newStats.cunning += opt.cunningDelta || 0;
      if (opt.apDelta) setAp(a => Math.max(0, a + opt.apDelta!));
      if (opt.npcId) newStats.npcRelationships[opt.npcId] = Math.min(100, Math.max(0, (newStats.npcRelationships[opt.npcId] || 0) + (opt.npcAffinityDelta || 0)));
      return newStats;
    });
    setGameState(GameState.PLAYING);
    setEvent(null);
    setSelectedIndex(0);
  };

  const handleSocialSelect = async (npc: NPC) => {
    setActiveNpc(npc);
    setDialogueLoading(true);
    setGameState(GameState.DIALOGUE);
    const diag = await getNpcDialogue(npc.name, npc.role, stats.npcRelationships[npc.id], `银:${stats.silver},名:${stats.reputation}`);
    setDialogue(diag);
    setDialogueLoading(false);
    setSelectedIndex(0);
  };

  const handleDialogueOption = (index: number) => {
    if (!dialogue) return;
    const opt = dialogue.options[index];
    setStats(prev => {
      const newStats = { ...prev };
      newStats.silver = Math.max(0, newStats.silver + (opt.silverDelta || 0));
      newStats.reputation += opt.reputationDelta || 0;
      if (activeNpc) newStats.npcRelationships[activeNpc.id] = Math.min(100, Math.max(0, (newStats.npcRelationships[activeNpc.id] || 0) + (opt.affinityDelta || 0)));
      return newStats;
    });
    setDialogueResult(opt.resultText);
    setSelectedIndex(0);
  };

  const hFontSize = { fontFamily: 'SimHei, "Microsoft YaHei", sans-serif' };

  return (
    <div className="game-container">
      <div className="aspect-box fade-in">
        
        {/* Toast Notifications */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[300] space-y-1 pointer-events-none w-full flex flex-col items-center">
           {notifications.map(n => (
             <div key={n.id} className="bg-[#B24425] text-[#F0D9C0] px-4 py-1.5 border-2 border-[#EBB559] shadow-xl rounded-full animate-bounce flex items-center gap-2">
                <span className="text-lg">🏮</span>
                <span className="text-xs font-bold tracking-tight">{n.title}: {n.message}</span>
             </div>
           ))}
        </div>

        {/* 歇业转场 */}
        {(isRolling || isRevealing) && (
          <div className="absolute inset-0 z-[400] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md fade-in px-8">
             <div className="max-w-2xl text-center space-y-6 mb-12">
                <h2 className="text-[#EBB559] text-3xl font-black tracking-[0.5em] mb-4">—— 今日终结 ——</h2>
                <p className="text-[#F0D9C0] text-2xl font-serif italic leading-relaxed opacity-90">
                   「 {daySummary || "夜幕降临，集市渐冷..."} 」
                </p>
             </div>
             
             <div className={`w-28 h-28 bg-white rounded-2xl border-4 grid grid-cols-3 p-4 shadow-[0_0_50px_rgba(235,181,89,0.3)] ${isRolling ? 'dice-shake' : ''}`} style={{ borderColor: colors.gold }}>
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="flex items-center justify-center">
                    {( (face: number): number[] => {
                      const dots: Record<number, number[]> = { 1:[4], 2:[0,8], 3:[0,4,8], 4:[0,2,6,8], 5:[0,2,4,6,8], 6:[0,2,3,5,6,8] };
                      return dots[face] || [];
                    })(diceFace).includes(i) && 
                      <div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: diceFace === 1 || diceFace === 4 ? colors.burntOrange : colors.ink }}></div>
                    }
                  </div>
                ))}
             </div>
             
             <div className="mt-12 text-[#EBB559] text-4xl font-black tracking-widest animate-pulse drop-shadow-lg">
               {isRolling ? "乾坤未定..." : `明日得气力 ${diceFace} 点！`}
             </div>
          </div>
        )}

        {/* 开始界面 */}
        {gameState === GameState.START && (
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <div className="text-center p-6 mb-8 max-w-[85%]">
              <h1 className="game-font-title leading-tight" style={{ color: colors.burntOrange }}>
                <span className="text-3xl lg:text-4xl block mb-2 opacity-60">重生之——</span>
                <span className="text-6xl lg:text-7xl xl:text-8xl block drop-shadow-2xl">我在古代卖年货</span>
              </h1>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 bg-white/30 p-6 rounded-2xl border-2 border-[#B24425]/10 shadow-inner">
                <p className="text-lg lg:text-xl font-bold text-[#B24425] leading-relaxed max-w-xl">
                  腊月严寒，你揣着仅剩的盘缠踏入青石镇。<br/>
                  靠八两碎银白手起家，在风诡云谲的集市中低买高卖，博取泼天富贵！
                </p>
                <div className="flex items-center gap-2 text-xs lg:text-sm text-[#4A3728] opacity-60">
                   <span>掷骰决定行动</span> • <span>应对流言波动</span> • <span>周旋权贵商贩</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => { setGameState(GameState.PROLOGUE); setPrologueStep(0); }}
              className="px-14 py-4 rounded-xl border-4 text-2xl lg:text-3xl shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer font-black text-shadow-subtle" 
              style={{ backgroundColor: colors.burntOrange, borderColor: colors.gold, color: colors.almond }}>
              起步入世 (ENTER)
            </button>
          </div>
        )}

        {/* 核心游戏界面 */}
        {gameState === GameState.PLAYING && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="h-24 lg:h-28 bg-white/40 border-b-2 border-[#B24425]/10 flex flex-col justify-center px-6 lg:px-10 shadow-sm gap-2">
              <div className="flex items-center justify-between">
                <div className="flex gap-3 lg:gap-6">
                  <StatSimple label="现银" value={stats.silver} color={colors.terracotta} icon="💰" fontStyle={hFontSize} />
                  <StatSimple label="名望" value={stats.reputation} color={colors.burntOrange} icon="📜" fontStyle={hFontSize} />
                  <StatSimple label="狡诈" value={stats.cunning} color={colors.darkBrown} icon="🦊" fontStyle={hFontSize} />
                </div>
                <div className="flex items-center gap-3 lg:gap-6">
                  <div className="hidden lg:flex bg-[#B24425]/10 border-2 border-[#B24425]/20 rounded-xl px-4 py-2 flex-col items-center justify-center">
                    <span className="text-[10px] font-black text-[#B24425] opacity-60 uppercase tracking-widest">今日天气</span>
                    <span className="text-sm font-black text-[#B24425]">{currentWeather}</span>
                  </div>
                  <StatSimple label="气力" value={ap} color={colors.terracotta} icon="🔥" active fontStyle={hFontSize} />
                  <StatSimple label="余日" value={stats.day} color={colors.burntOrange} icon="⏳" active fontStyle={hFontSize} />
                </div>
              </div>
              <div className="h-6 lg:h-8 bg-[#B24425]/5 rounded-lg border border-[#B24425]/20 flex items-center px-4 overflow-hidden relative">
                <div className="absolute left-0 bg-[#B24425] text-white text-[9px] px-2 h-full flex items-center font-black">流言板</div>
                <div className="ml-14 text-[10px] lg:text-xs font-black text-[#B24425] opacity-80 whitespace-nowrap marquee">
                  {activeRumor}
                </div>
              </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
              <aside className={`w-1/4 border-r-2 border-[#B24425]/10 bg-white/10 flex flex-col p-4 lg:p-5 overflow-hidden transition-all ${activeZone === 'inventory' ? 'ring-inset ring-4 ring-[#B24425]/30' : ''}`}>
                <h3 className="text-lg lg:text-xl font-black mb-3 border-b border-[#B24425]/10 pb-2 flex items-center gap-2">
                  <span>🎒 我的背篓</span>
                  {activeZone === 'inventory' && <span className="text-[10px] animate-pulse bg-[#B24425] text-white px-2 py-0.5 rounded-full font-black">操作中</span>}
                </h3>
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1.5 scrollbar-custom text-shadow-subtle">
                  {backpackItems.length > 0 ? (
                    backpackItems.map(([id, count], i) => (
                      <div key={id} 
                           className={`p-2.5 bg-white/60 border-2 rounded-lg flex justify-between items-center group cursor-pointer transition-all shadow-sm 
                                      ${(activeZone === 'inventory' && inventoryIndex === i) ? 'selected-glow scale-[1.05]' : 'border-[#B24425]/5'}`}
                           onClick={() => handleAction('SELL', ITEMS.find(item => item.id === id))}
                           onMouseEnter={() => { setActiveZone('inventory'); setInventoryIndex(i); }}>
                        <span className="font-bold text-xs lg:text-sm text-[#4A3728]">{ITEMS.find(item => item.id === id)?.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] opacity-40">单击卖出</span>
                          <span className="bg-[#B24425] text-[10px] text-[#F0D9C0] px-1.5 py-0.5 rounded font-black shadow-sm">x{count}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center text-[10px] opacity-20 italic">篮子比脸还干净</div>
                  )}
                </div>
              </aside>

              <section className="flex-1 bg-white/20 flex flex-col overflow-hidden">
                <div ref={marketScrollRef} className="flex-1 overflow-y-auto p-4 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 content-start scrollbar-custom pb-20">
                  {ITEMS.map((item, i) => {
                    const multiplier = priceMultipliers[item.id] || 1.0;
                    const displayPrice = Math.round(item.basePrice * multiplier);
                    return (
                      <div 
                        key={item.id} 
                        onMouseEnter={() => { setActiveZone('market'); setSelectedIndex(i); }}
                        onClick={() => handleAction('BUY', item)}
                        className={`market-card p-3 lg:p-4 rounded-xl border-2 transition-all bg-white/80 shadow-sm flex flex-col justify-between h-[160px] lg:h-[180px] cursor-pointer
                                   ${(activeZone === 'market' && selectedIndex === i) ? 'selected-glow scale-[1.02]' : 'border-[#B24425]/5'}`}
                      >
                        <div className="mb-1">
                          <div className="font-black text-sm lg:text-base text-[#4A3728] truncate">{item.name}</div>
                          <p className="text-[8px] lg:text-[9px] opacity-50 leading-tight line-clamp-2 h-5 lg:h-6">{item.description}</p>
                        </div>
                        <div>
                          <div className="text-base lg:text-lg font-black text-[#B24425] mb-1 shadow-sm flex items-baseline gap-1" style={hFontSize}>
                            ￥{displayPrice} <span className="text-[8px] opacity-40">两</span>
                            {multiplier > 1.0 && <span className="text-[9px] text-red-500 animate-pulse">↑</span>}
                            {multiplier < 1.0 && <span className="text-[9px] text-green-500 animate-pulse">↓</span>}
                          </div>
                          <div className={`text-[9px] font-black text-center py-1 rounded transition-opacity ${lastBoughtItemId === item.id ? 'bg-[#B24425] text-white opacity-100' : 'bg-[#B24425]/10 text-[#B24425] opacity-60'}`}>
                            {lastBoughtItemId === item.id ? '再买1件 (0气力)' : '买入1件'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <ActionSquare icon="💤" label="打个盹" sub="调养气力" onClick={() => handleAction('REST')} active={activeZone === 'market' && selectedIndex === ITEMS.length} onEnter={() => { setActiveZone('market'); setSelectedIndex(ITEMS.length); }} colors={colors} />
                  <ActionSquare icon="🏮" label="走关系" sub="求见贵人" onClick={() => { handleInput('Enter'); }} active={activeZone === 'market' && selectedIndex === ITEMS.length + 1} onEnter={() => { setActiveZone('market'); setSelectedIndex(ITEMS.length + 1); }} colors={colors} />
                  <ActionSquare icon="🏆" label="成就阁" sub="勋章记录" onClick={() => { setGameState(GameState.ACHIEVEMENTS); setSelectedIndex(0); }} active={activeZone === 'market' && selectedIndex === ITEMS.length + 2} onEnter={() => { setActiveZone('market'); setSelectedIndex(ITEMS.length + 2); }} colors={colors} />
                  <ActionSquare icon="🧧" label="歇业过夜" sub="结束今天" onClick={nextDay} active={activeZone === 'market' && selectedIndex === ITEMS.length + 3} onEnter={() => { setActiveZone('market'); setSelectedIndex(ITEMS.length + 3); }} colors={colors} isDark />
                </div>
                <div className="h-24 lg:h-32 bg-[#F0D9C0]/40 border-t border-[#B24425]/10 p-3 lg:p-4 overflow-hidden flex flex-col-reverse shadow-inner">
                   {logs.map((log, i) => (
                     <div key={i} className={`text-[10px] lg:text-[12px] py-0.5 lg:py-1 transition-all duration-200 ${i === 0 ? 'font-black opacity-100 text-[#B24425] scale-105 origin-left' : 'opacity-40 text-[#4A3728]'}`}>
                       {log.startsWith('「') ? log : `「 ${log} 」`}
                     </div>
                   ))}
                </div>
              </section>

              <aside className="w-1/4 border-l-2 border-[#B24425]/10 bg-white/10 flex flex-col p-4 lg:p-5 overflow-hidden">
                <h3 className="text-lg lg:text-xl font-black mb-3 border-b border-[#B24425]/10 pb-2">集市众生</h3>
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-custom">
                  {NPCS.map(n => (
                    <div key={n.id} className="group">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl lg:text-3xl">{n.avatar}</span>
                        <div className="flex-1 overflow-hidden">
                          <div className="text-[10px] lg:text-xs font-black text-[#4A3728] leading-none truncate">{n.name}</div>
                          <div className="text-[7px] lg:text-[8px] opacity-40 mt-0.5 truncate">{n.role}</div>
                        </div>
                        <span className="text-[9px] lg:text-[10px] font-black text-[#B24425]" style={hFontSize}>{stats.npcRelationships[n.id]}%</span>
                      </div>
                      <div className="h-1 lg:h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                         <div className="h-full bg-[#B24425]" style={{ width: `${stats.npcRelationships[n.id]}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </aside>
            </main>
          </div>
        )}

        {/* 弹窗 UI 渲染层 (保持原有逻辑) */}
        {(gameState !== GameState.START && gameState !== GameState.PLAYING) && (
          <div className="absolute inset-0 z-[500] bg-black/75 backdrop-blur-md flex items-center justify-center p-6 lg:p-12 overflow-hidden">
             
             {/* 随机事件 */}
             {gameState === GameState.EVENT && event && (
               <div className="bg-[#F0D9C0] p-6 lg:p-10 border-8 border-double border-[#B24425] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col relative animate-bounce-short">
                  <div className="flex items-center gap-4 mb-6 border-b-2 border-[#B24425]/10 pb-4">
                    <span className="text-4xl animate-pulse">⚡</span>
                    <h2 className="text-3xl font-black text-[#B24425] truncate">{event.title}</h2>
                  </div>
                  <div className="mb-8 overflow-y-auto max-h-[150px] pr-2 scrollbar-custom">
                    <p className="text-xl lg:text-2xl italic text-[#4A3728] leading-relaxed">「 {event.description} 」</p>
                  </div>
                  <div className="space-y-3">
                    {event.options.map((opt: any, i: number) => (
                      <button key={i} onClick={() => handleEventOption(i)} onMouseEnter={() => setSelectedIndex(i)} className={`w-full min-h-[60px] p-4 text-left border-4 rounded-xl font-black text-lg transition-all ${selectedIndex === i ? 'bg-[#B24425] text-[#F0D9C0] scale-[1.01]' : 'bg-white border-[#B24425]/10 text-[#4A3728]'}`}>{opt.text}</button>
                    ))}
                  </div>
               </div>
             )}

             {/* 序章内容 */}
             {gameState === GameState.PROLOGUE && (
                <div className="max-w-3xl w-full bg-[#F0D9C0] p-8 lg:p-12 rounded-2xl border-4 border-double border-[#B24425] fade-in shadow-xl flex flex-col items-center">
                  <p className="text-2xl lg:text-3xl leading-relaxed italic text-[#4A3728] text-center mb-10">
                    {PROLOGUE_TEXTS[prologueStep]}
                  </p>
                  <div className="flex flex-col items-center gap-4">
                    <button 
                      onClick={() => {
                        if (prologueStep < PROLOGUE_TEXTS.length - 1) setPrologueStep(p => p + 1);
                        else setGameState(GameState.QUIZ);
                      }} 
                      className="px-10 py-3 text-xl font-black rounded-lg bg-[#B24425] text-[#F0D9C0] shadow-lg active:scale-95 transition-transform"
                    >
                      {prologueStep === PROLOGUE_TEXTS.length - 1 ? "一探究竟" : "接下回"}
                    </button>
                    <span className="text-[10px] text-[#B24425] opacity-60 font-black animate-pulse">按 A / ENTER 键继续</span>
                  </div>
                </div>
             )}

             {/* 开局问答 */}
             {gameState === GameState.QUIZ && (
                <div className="flex flex-col items-center justify-center p-6 lg:p-10 w-full max-w-2xl bg-[#F0D9C0] border-8 border-double border-[#B24425] rounded-3xl">
                  <h2 className="text-3xl lg:text-4xl font-black mb-10 text-center text-[#B24425]">{QUIZ_QUESTIONS[quizIndex].question}</h2>
                  <div className="flex flex-col gap-5 w-full">
                    {QUIZ_QUESTIONS[quizIndex].options.map((opt, i) => (
                      <div key={i} onClick={() => selectQuizOption(i)} onMouseEnter={() => setSelectedIndex(i)} className={`p-6 border-4 rounded-2xl cursor-pointer transition-all ${selectedIndex === i ? 'bg-white border-[#B24425] shadow-lg scale-[1.02]' : 'bg-white/40 border-[#B24425]/10'}`}>
                        <div className="text-xl lg:text-2xl font-black text-[#4A3728]">{opt.text}</div>
                        <div className="text-sm italic opacity-70 text-[#4A3728] mt-2">{opt.resultDesc}</div>
                      </div>
                    ))}
                  </div>
                </div>
             )}

             {/* 社交界面 */}
             {gameState === GameState.SOCIAL && (
               <div className="bg-[#F0D9C0] p-6 lg:p-10 border-8 border-double border-[#B24425] w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col">
                  <h2 className="text-3xl lg:text-4xl font-black mb-8 text-[#B24425] text-center tracking-widest">拜访权贵</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-y-auto pr-2 scrollbar-custom mb-6">
                    {NPCS.map((npc, i) => (
                      <button key={npc.id} onClick={() => handleSocialSelect(npc)} onMouseEnter={() => setSelectedIndex(i)}
                              className={`p-4 flex items-center gap-4 border-4 rounded-xl transition-all shadow-sm ${selectedIndex === i ? 'bg-[#B24425] text-[#F0D9C0] scale-[1.02]' : 'bg-white border-[#B24425]/10 text-[#4A3728]'}`}>
                        <span className="text-4xl">{npc.avatar}</span>
                        <div className="text-left overflow-hidden">
                          <div className="text-lg font-black truncate">{npc.name}</div>
                          <div className="text-[10px] opacity-50 uppercase tracking-widest truncate">{npc.role}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setGameState(GameState.PLAYING)} onMouseEnter={() => setSelectedIndex(NPCS.length)}
                          className={`w-full p-4 border-4 rounded-xl font-black text-xl transition-all ${selectedIndex === NPCS.length ? 'bg-[#B24425] text-[#F0D9C0]' : 'border-[#B24425] text-[#B24425]'}`}>退下</button>
               </div>
             )}

             {/* 对话界面 */}
             {gameState === GameState.DIALOGUE && dialogue && (
               <div className="bg-[#F0D9C0] p-6 lg:p-10 border-8 border-double border-[#B24425] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col">
                  <div className="flex gap-6 items-start mb-8">
                    <div className="flex flex-col items-center">
                      <span className="text-6xl shadow-sm rounded-full bg-white/20 p-2">{activeNpc?.avatar}</span>
                      <div className="mt-2 text-sm font-black text-[#B24425]">{activeNpc?.name}</div>
                    </div>
                    <div className="flex-1 p-4 bg-white/30 rounded-2xl border border-[#B24425]/5 shadow-inner min-h-[100px]">
                      <p className="text-xl lg:text-2xl italic leading-relaxed text-[#4A3728]">
                        「 {dialogueResult || dialogue.npcText} 」
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {!dialogueResult ? dialogue.options.map((opt, i) => (
                      <button key={i} onClick={() => handleDialogueOption(i)} onMouseEnter={() => setSelectedIndex(i)}
                              className={`w-full min-h-[60px] p-4 text-left border-4 rounded-xl font-black text-lg transition-all ${selectedIndex === i ? 'bg-[#B24425] text-[#F0D9C0] scale-[1.01]' : 'bg-white border-[#B24425]/10 text-[#4A3728]'}`}>{opt.text}</button>
                    )) : (
                      <button onClick={() => { setDialogueResult(null); setDialogue(null); setGameState(GameState.SOCIAL); setSelectedIndex(0); }}
                              onMouseEnter={() => setSelectedIndex(0)}
                              className={`w-full p-5 border-4 rounded-xl font-black text-xl transition-all bg-[#B24425] text-[#F0D9C0]`}>告辞</button>
                    )}
                  </div>
               </div>
             )}

             {/* 成就界面 */}
             {gameState === GameState.ACHIEVEMENTS && (
                <div className="bg-[#F0D9C0] p-10 border-8 border-double border-[#B24425] w-full max-w-3xl rounded-2xl flex flex-col max-h-[90%]">
                  <h2 className="text-4xl font-black mb-6 text-center text-[#B24425]">商道成就阁</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-y-auto pr-2 scrollbar-custom">
                    {ACHIEVEMENTS.map(ach => {
                      const isUnlocked = unlockedAchievementIds.has(ach.id);
                      return (
                        <div key={ach.id} className={`p-4 border-2 rounded-xl flex items-center gap-4 transition-all ${isUnlocked ? 'bg-white border-[#B24425] shadow-md' : 'opacity-25 grayscale'}`}>
                          <span className="text-4xl">{ach.icon}</span>
                          <div>
                            <div className="font-black text-[#4A3728]">{ach.name}</div>
                            <div className="text-[10px] opacity-60 leading-tight">{ach.description}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={() => setGameState(GameState.PLAYING)} className="mt-6 p-4 bg-[#B24425] text-[#F0D9C0] font-black rounded-xl hover:scale-[1.02]">合上卷轴</button>
                </div>
             )}

             {/* 结算界面 */}
             {gameState === GameState.GAMEOVER && (
                <div className="bg-[#F0D9C0] p-12 border-[10px] border-double border-[#B24425] text-center max-w-2xl w-full rounded-3xl shadow-2xl fade-in flex flex-col">
                   <div className="text-7xl mb-6">{stats.hungerLevel >= 2 ? '💀' : '🏵️'}</div>
                   <h1 className="text-5xl font-black mb-6 text-[#B24425] leading-tight text-shadow-subtle">{stats.hungerLevel >= 2 ? '商途夭折' : '年终大吉'}</h1>
                   <div className="text-3xl mb-10 font-black border-y-2 border-[#B24425]/10 py-6 text-[#4A3728]">最终家产：<span className="text-[#B24425]" style={hFontSize}>￥{stats.silver} 两</span></div>
                   <div className="mb-10 flex-1 overflow-y-auto px-4 italic text-2xl leading-relaxed text-[#4A3728]/80">
                     {stats.hungerLevel >= 2 ? "寒风卷着碎雪，终究没能熬过这最后的寒夜。你在青石镇外的雪堆里悄然消失。" : stats.silver > 5000 ? "🎉 名动京畿！在这青石镇，谁人见你不称一声'财神爷'？这年夜饭，你是坐定了首席。" : stats.silver > 1500 ? "🏮 锦衣还乡。攒下的银钱足够给家里置办几亩水田，买几头肥猪了。" : "🕯️ 聊以糊口。忙活一载，仅得肚圆。好在青山常在，明岁再战。"}
                   </div>
                   <button onClick={() => window.location.reload()} className="w-full p-6 rounded-xl bg-[#B24425] text-[#F0D9C0] text-3xl font-black hover:brightness-110 active:scale-95 shadow-2xl transition-all">重入轮回 (ENTER)</button>
                </div>
             )}

          </div>
        )}

        <footer className="h-6 lg:h-8 bg-black/5 flex justify-between items-center px-6 lg:px-10 text-[8px] lg:text-[9px] font-black opacity-30 select-none uppercase tracking-widest text-[#4A3728]">
          <div>LUNAR HUSTLE 2.5 · EXPANDED EDITION</div>
          <div>EST. IMPERIAL YEAR 30</div>
        </footer>
      </div>
    </div>
  );
};

/* --- 抽离的小组件 --- */
const StatSimple = ({ label, value, icon, color, active, fontStyle }: any) => (
  <div className={`flex items-center gap-2 lg:gap-4 px-4 py-2 lg:px-5 lg:py-3 rounded-2xl bg-white/60 border-2 border-[#B24425]/10 shadow-md transition-all ${active ? 'scale-110 shadow-lg ring-4 ring-[#B24425]/20' : ''}`}>
    <span className="text-2xl lg:text-3xl drop-shadow-sm">{icon}</span>
    <div className="flex flex-col">
      <span className="text-[10px] lg:text-[11px] font-black tracking-widest text-[#4A3728] opacity-60 uppercase">{label}</span>
      <span className="text-xl lg:text-3xl font-black tabular-nums leading-none" style={{ ...fontStyle, color }}>{value}</span>
    </div>
  </div>
);

const ActionSquare = ({ icon, label, sub, onClick, active, onEnter, isDark, colors }: any) => (
  <div onMouseEnter={onEnter} onClick={onClick} className={`p-3 lg:p-4 rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all h-[160px] lg:h-[180px] shadow-md ${active ? 'selected-glow' : 'border-[#B24425]/5 bg-white/60 opacity-80'}`} style={{ backgroundColor: isDark ? colors.burntOrange : colors.white, color: isDark ? colors.almond : colors.darkBrown }}>
    <span className="text-4xl lg:text-5xl mb-2">{icon}</span>
    <span className="font-black text-lg lg:text-xl mb-0.5">{label}</span>
    <span className="text-[7px] lg:text-[8px] opacity-40 font-bold">{sub}</span>
  </div>
);

export default App;
