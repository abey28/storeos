/* ── 全域狀態變數 ── */
const API='/api';
let staff=[],records=[],tiers=[],projTypes=[],shifts={};
let logs=[],logsTotal=0;
let currentUser='訪客';
let _saveQueue={};

const SC={'台北車站':'#c9a84c','中山誠品':'#5dade2','松菸誠品':'#82e0aa'};
const EXTRA_COLORS=['#e8a87c','#b39ddb','#80deea','#a5d6a7','#f48fb1','#ffe082','#90a4ae'];
const WEEKDAYS=['日','一','二','三','四','五','六'];

/* ══════════════════════════════════════════════════════
   勞健保投保薪資級距表（依年度管理，可於「保費級距」設定頁更新）
   資料來源：2026年勞健保保費及勞退提繳三合一費用對照參考用表
   查詢邏輯：ceiling lookup — 找第一個 salary ≥ 輸入值的級距
   健保最低投保級距：$29,500（低於此值自動上修）
   勞保最高：$45,800；健保最高：$313,000
══════════════════════════════════════════════════════ */
const NHI_MIN=29500; // 健保最低投保薪資
const DEFAULT_INSURANCE_BRACKETS={
  '2026':{
    li:[
      {salary:11100,emp:277},{salary:12540,emp:313},{salary:13500,emp:338},
      {salary:15840,emp:396},{salary:16500,emp:413},{salary:17280,emp:432},
      {salary:17880,emp:447},{salary:19047,emp:476},{salary:20008,emp:500},
      {salary:21009,emp:525},{salary:22000,emp:550},{salary:23100,emp:577},
      {salary:24000,emp:600},{salary:25250,emp:632},{salary:26400,emp:660},
      {salary:27600,emp:690},{salary:28590,emp:715},{salary:29500,emp:738},
      {salary:30300,emp:758},{salary:31800,emp:795},{salary:33300,emp:833},
      {salary:34800,emp:870},{salary:36300,emp:908},{salary:38200,emp:955},
      {salary:40100,emp:1002},{salary:42000,emp:1050},{salary:43900,emp:1098},
      {salary:45800,emp:1145}
    ],
    nhi:[
      {salary:29500,emp:458},{salary:30300,emp:470},{salary:31800,emp:493},
      {salary:33300,emp:516},{salary:34800,emp:540},{salary:36300,emp:563},
      {salary:38200,emp:592},{salary:40100,emp:622},{salary:42000,emp:651},
      {salary:43900,emp:681},{salary:45800,emp:710},{salary:48200,emp:748},
      {salary:50600,emp:785},{salary:53000,emp:822},{salary:55400,emp:859},
      {salary:57800,emp:896},{salary:60800,emp:943},{salary:63800,emp:990},
      {salary:66800,emp:1036},{salary:69800,emp:1083},{salary:72800,emp:1129},
      {salary:76500,emp:1187},{salary:80200,emp:1244},{salary:83900,emp:1301},
      {salary:87600,emp:1359},{salary:92100,emp:1428},{salary:96600,emp:1498},
      {salary:101100,emp:1568},{salary:105600,emp:1638},{salary:110100,emp:1708},
      {salary:115500,emp:1791},{salary:120900,emp:1875},{salary:126300,emp:1959},
      {salary:131700,emp:2043},{salary:137100,emp:2126},{salary:142500,emp:2210},
      {salary:147900,emp:2294},{salary:150000,emp:2327},{salary:156400,emp:2426},
      {salary:162800,emp:2525},{salary:169200,emp:2624},{salary:175600,emp:2724},
      {salary:182000,emp:2823},{salary:189500,emp:2939},{salary:197000,emp:3055},
      {salary:204500,emp:3172},{salary:212000,emp:3288},{salary:219500,emp:3404},
      {salary:228200,emp:3539},{salary:236900,emp:3674},{salary:245600,emp:3809},
      {salary:254300,emp:3944},{salary:263000,emp:4079},{salary:273000,emp:4234},
      {salary:283000,emp:4389},{salary:293000,emp:4544},{salary:303000,emp:4700},
      {salary:313000,emp:4855}
    ]
  }
};
// 執行期級距表：初始值為內建預設，loadAllData 後可由 KV 覆蓋
let insuranceBrackets=JSON.parse(JSON.stringify(DEFAULT_INSURANCE_BRACKETS));

let _dashRangeKind='thisMonth';
