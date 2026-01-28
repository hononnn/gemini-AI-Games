
import { LOCAL_EVENTS, LOCAL_DIALOGUES } from '../constants';

/**
 * 离线化处理：直接从本地预设库中随机抽取事件
 * 保证游戏在没有网络/API Key的情况下依然逻辑完整
 */
export const getDynamicEvent = async (context: string) => {
  // 模拟异步延迟增强仪式感
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const randomIndex = Math.floor(Math.random() * LOCAL_EVENTS.length);
  return LOCAL_EVENTS[randomIndex];
};

/**
 * 离线化处理：根据NPC和好感度从本地库提取对话
 */
export const getNpcDialogue = async (npcName: string, npcRole: string, affinity: number, playerStats: string) => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // 查找对应NPC的模版
  const npcKeyMap: Record<string, string> = {
    '县丞大人': 'magistrate',
    '王掌柜': 'rival',
    '包租公': 'landlord'
  };
  
  const key = npcKeyMap[npcName] || 'rival';
  const templates = LOCAL_DIALOGUES[key];
  
  // 根据好感度选择 简单 fallback
  const affinityLevel = affinity >= 50 ? 'high' : 'low';
  const dialogue = templates[affinityLevel] || templates['low'];
  
  return dialogue;
};
