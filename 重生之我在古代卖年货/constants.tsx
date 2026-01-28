
import { Item, Talent, Weather, QuizQuestion, NPC, Achievement } from './types';

export const ITEMS: Item[] = [
  { id: 'firecracker', name: '红纸爆竹', basePrice: 8, description: '炸响新岁，小民最爱。小心哑炮。' },
  { id: 'couplet', name: '名家春联', basePrice: 20, description: '主打一个“氛围感”，其实是拼多多的印刷品。' },
  { id: 'mutton', name: '冬令羊肉', basePrice: 60, description: '这年头，羊比人贵，吃的是阶级。' },
  { id: 'wine', name: '女儿红', basePrice: 150, description: '酒里全是这镇子里的家长里短，还有一点点工业酒精。' },
  { id: 'treasure', name: '镇宅瑞兽', basePrice: 400, description: '据说是上古遗迹，其实是义乌小商品批发。' }
];

export const WEATHERS = [Weather.SUNNY, Weather.SNOWY, Weather.WINDY, Weather.SMOGGY];

export const NPCS: NPC[] = [
  { id: 'magistrate', name: '县丞大人', role: '权势滔天', avatar: '👺', description: '虽然工资三千五，但浑身都是名牌。', baseAffinity: 20 },
  { id: 'rival', name: '王掌柜', role: '笑面虎', avatar: '🤡', description: '他卖的货比你便宜一文，但他心比墨黑。', baseAffinity: 10 },
  { id: 'landlord', name: '包租公', role: '收租者', avatar: '👴', description: '除了收租，就是在大众点评写差评。', baseAffinity: 30 }
];

export const DAILY_MEAL_TEXTS = [
  "忙活一日，你揉了揉酸痛的腰。在街角买了碗热腾腾的羊汤，消费 20 两，腹中总算踏实了。",
  "你走入一家名为‘拼刀刀’的酒肆，消费 20 两，虽菜品一般，但胜在管饱还退了你两文钱。",
  "又是白水煮面，你看着碗里的倒影，即便消费 20 两也只能吃个半饱，发誓明天一定要挣大钱吃顿烧鹅。",
  "你甚至在集市角落发现了一家‘疯狂星期四’的炸鸡店（幻觉？），消费 20 两吃了顿‘跨时空’快餐。",
  "为了省钱你本想只喝白水，但身体很诚实地带你走向了红烧肉摊位。消费 20 两后，钱没了，心安了。",
  "路边摊的掌柜看你今天挣了不少，收了你消费 20 两，还特意帮你把炊饼热了热。",
  "寒风刺骨，你点了一壶最烈的烧刀子和两碟花生米。消费 20 两，酒精麻痹了疲劳，却麻痹不了对银子的渴望。",
  "你在饭馆里听邻桌讨论最近的‘猫特币’行情，听得入神。消费 20 两填饱肚子后，你觉得这些全是骗局。",
  "店家说今天是他家小狗三岁生日，全场菜品八折。消费 20 两，你不仅吃饱了，还含泪省下了几两私房钱。",
  "这一顿饭吃得极不消停，消费 20 两坐在店里，听着隔壁书生念叨‘读书人的事能算偷吗’，吵得你脑壳疼。",
  "你发现今天的菜咸得要命，想必那大厨也想‘咸鱼翻身’想疯了。即便如此你也还是消费 20 两结了账。",
  "你点了一份古代版‘至尊汉堡’（两片干饼夹大葱），配上热茶，消费 20 两，这就是商人的浪漫。",
  "掌柜看你一表人才（其实是看你钱袋厚实），消费 20 两后特意给你加了个荷包蛋。你感受到了金钱的温暖。"
];

// 环境描写片段，用于增加代入感
export const FLAVOR_TEXTS = [
  "寒风卷起一片破旧的菜叶，像是某个商贩破碎的梦。",
  "远处传来鞭炮声，有人在庆祝发财，有人在庆祝还没破产。",
  "空气中弥漫着廉价烈酒和炭火的味道，这就是年关。",
  "几个流民蹲在墙角，讨论着今年哪个财神爷最容易被抢。",
  "集市上的吆喝声此起彼伏，充满了生存的渴望和互坑的智慧。"
];

// 市场流言，会影响物价
export const MARKET_RUMORS = [
  { text: "听说京城流行吃烤全羊，羊肉需求大增！", target: "mutton", multiplier: 2.0 },
  { text: "县丞大人下令禁鞭，爆竹行情惨淡。", target: "firecracker", multiplier: 0.5 },
  { text: "大户人家要在过年祭祖，瑞兽成了抢手货。", target: "treasure", multiplier: 1.8 },
  { text: "王掌柜囤的酒里掺了水被发现了，酒市动荡。", target: "wine", multiplier: 1.3 },
  { text: "新来的知县爱搞文化建设，春联家家必备。", target: "couplet", multiplier: 1.5 }
];

export const LOCAL_EVENTS = [
  {
    title: "并多多的背叛",
    description: "你收到了王掌柜发来的‘并多多’链接：‘是兄弟就来砍我，仅差0.01两即可提现100两白银’。你砍了整整一夜，由于过于投入，甚至忘记了进食。",
    options: [
      { text: "继续砍，我命由我不由天（名望-10，气力-2）", silverDelta: -5, reputationDelta: -10, apDelta: -2 },
      { text: "反手举报给县衙非法集资（奸诈+20）", cunningDelta: 20, silverDelta: 10 }
    ]
  },
  {
    title: "疯狂腊八",
    description: "今天是疯狂腊八，全镇肯德禽推出V我50套餐。镇民们疯狂排队，导致集市交通陷入瘫痪。",
    options: [
      { text: "加入排队，V他50（银两-50，气力+2）", silverDelta: -50, apDelta: 2 },
      { text: "在队尾兜售假号码牌（奸诈+30，银两+20）", cunningDelta: 30, silverDelta: 20 }
    ]
  },
  {
    title: "雪夜劫案",
    description: "一个蒙面黑衣人拦住了你，他语气颤抖地说：‘其实我是因为考公失败才出来抢劫的...’",
    options: [
      { text: "塞给他两两碎银劝其重考（名望+20）", silverDelta: -10, reputationDelta: 20 },
      { text: "大喊‘城管来了’将其吓跑（奸诈+10）", cunningDelta: 10 }
    ]
  },
  {
    title: "虚拟币骗局",
    description: "一个游方道士告诉你，他发现了一种叫‘比特币’的仙丹，只要把银子交给他，明年就能在仙界买房。",
    options: [
      { text: "梭哈！(银两-40，大概率归零)", silverDelta: -40, cunningDelta: -20 },
      { text: "呵呵，我只信物理黄金（名望+5）", reputationDelta: 5 }
    ]
  },
  {
    title: "鸡汤大师",
    description: "一个自称张某的老师在路边大喊：‘听懂掌声！如果你穷，说明你的思维没有迭代！’",
    options: [
      { text: "鼓掌！(名望+10，气力-1)", reputationDelta: 10, apDelta: -1 },
      { text: "向他扔臭鸡蛋（奸诈+5，气力-1）", cunningDelta: 5, apDelta: -1 }
    ]
  },
  {
    title: "直播带货风波",
    description: "县丞的小妾开始在集市口‘直播带货’，喊着‘家人们，给我冲！’。全镇的物流都瘫痪了。",
    options: [
      { text: "去刷个火箭(银两-30，好感度+20)", silverDelta: -30, npcId: 'magistrate', npcAffinityDelta: 20 },
      { text: "蹭流量，在旁边卖假货（奸诈+25）", cunningDelta: 25, reputationDelta: -20 }
    ]
  }
];

export const LOCAL_DIALOGUES: Record<string, any> = {
  magistrate: {
    low: {
      npcText: "本官的时间按秒收费，你有五秒钟时间陈述你的‘孝心’。",
      options: [
        { text: "献上爱马仕红纸爆竹 (银两-20)", silverDelta: -20, affinityDelta: 15, resultText: "这种奢侈品包装，深得本官之心。" },
        { text: "询问县试内幕", reputationDelta: -10, affinityDelta: -5, resultText: "这种事是能随便问的吗？得加钱！" }
      ]
    },
    high: {
      npcText: "贤侄啊，最近这镇上的GDP就看你了。只要你懂事，你就是镇里的形象大使。",
      options: [
        { text: "打听物价波动", affinityDelta: -2, resultText: "据说北方羊群生病了，羊肉要飞涨啊..." },
        { text: "请求避税", cunningDelta: 20, affinityDelta: -10, resultText: "这种事以后私下说，别在衙门门口嚷嚷。" }
      ]
    }
  },
  rival: {
    low: {
      npcText: "听说你的生意快倒闭了？我已经在看你的铺位了，准备改成奶茶店。",
      options: [
        { text: "诅咒他产品里有蟑螂", cunningDelta: 10, affinityDelta: -15, resultText: "你！你居然知道我的配方？！" },
        { text: "提出联营方案", silverDelta: -10, affinityDelta: 10, resultText: "联营？你是想合伙坑别人吧？有意思。" }
      ]
    }
  },
  landlord: {
    low: {
      npcText: "你知道现在的房价吗？我涨你房租是看得起你，怕你失去奋斗的动力。",
      options: [
        { text: "反向输出鸡汤", reputationDelta: 5, affinityDelta: -10, resultText: "别给我讲什么诗和远方，我只要我的银子。" },
        { text: "补交租金 (银两-20)", silverDelta: -20, affinityDelta: 15, resultText: "算你识趣，这屋顶我明天找人糊张报纸。" }
      ]
    }
  }
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_pot', name: '第一桶金', description: '终于不用吃土了。', icon: '🪙', conditionDesc: '银两超过 500', check: (s) => s.silver >= 500, reward: { reputation: 10 } },
  { id: 'tycoon', name: '泼天富贵', description: '你现在的呼吸都是金子的味道。', icon: '💰', conditionDesc: '银两超过 5000', check: (s) => s.silver >= 5000, reward: { reputation: 50, cunning: 10 } },
  { id: 'shameless', name: '面厚心黑', description: '虽然没良心，但真的很有钱。', icon: '🦊', conditionDesc: '心眼超过 100', check: (s) => s.cunning >= 100, reward: { silver: 200 } },
  { id: 'survivor', name: '年关硬汉', description: '在腊月活了超过10天。', icon: '❄️', conditionDesc: '活过10天', check: (s) => (14 - s.day) >= 10, reward: { reputation: 20 } }
];

export const PROLOGUE_TEXTS = [
  "大庆历三十年，冬。腊月寒风卷着碎雪，打在脸上生疼。",
  "你站在青石镇的牌坊下，呵出一口白气。怀里那几两碎银，是你翻身的最后本钱。",
  "年关将近，富人家筹备锦衣玉食，穷人家算计柴米油盐。",
  "你想起老父临终前的话：'商道即人道，撑死胆大的，饿死胆小的。'",
  "这最后一个月，是搏一个锦绣前程，还是沦为街头乞儿，全看你的了。"
];

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: "入镇之前，你本是何等身份？",
    options: [
      { text: "落魄书生，虽无功名但识字明理", impact: { reputation: 15, cunning: 5, silver: 10 }, talent: Talent.FACE_OFF, resultDesc: "你整了八两银子，虽破旧却浆洗得干净，这就是你的招牌。" },
      { text: "走卒商贩，混迹市井已久", impact: { cunning: 15, reputation: -5, silver: 25 }, talent: Talent.CUT_KING, resultDesc: "你拍了拍身上的灰尘，市井的摸爬滚打让你闻到了银子的味道。" }
    ]
  },
  {
    question: "镇口的算命摊前，你求了一签，签文云：",
    options: [
      { text: "‘宁向直中取，不向曲中求’", impact: { reputation: 20, cunning: -10 }, talent: Talent.LUCKY_DOG, resultDesc: "你坚持诚信为本，哪怕银子赚得慢些，也要落个好名声。" },
      { text: "‘财帛动人心，富贵险中求’", impact: { cunning: 20, reputation: -20, silver: 15 }, talent: Talent.GREEDY_CAT, resultDesc: "你冷笑一声，只要能发财，什么手段都不在话下。" }
    ]
  }
];
