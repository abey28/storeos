# THE food co. 同興 門市管理系統（StoreOS）

專為 THE food co. 同興三間門市（台北車站、中山誠品、松菸誠品）打造的內部管理系統，涵蓋日常營業額登記、業績與專案獎金自動計算、月報表、薪資單列印、員工／門市／班別／保費級距設定，以及完整的稽核日誌與分析儀表板。

目前版本：**v2.7.0**（詳見 [CHANGELOG.md](./CHANGELOG.md)）。

---

## 功能頁面總覽

| 頁面           | 說明                                                                                 |
| -------------- | ------------------------------------------------------------------------------------ |
| 📊 總覽         | KPI 四卡（營業額、日均、獎金、人事成本占比）、SVG 趨勢圖、星期平均、門市比較       |
| 📝 記帳         | 每日出班登記：出班員工、時段、個人加項（誤餐費等）、實習生例外獎金、即時預覽       |
| 📋 歷史紀錄     | 依門市／月份篩選，可編輯、刪除，CSV 匯出                                             |
| 💰 薪資試算     | 單筆紀錄即時試算獎金分配（含工時比例分配）                                           |
| 🧾 薪資單       | 個人薪資單列印（含當月在職異動勞健保計算）、全員薪資總表會計對帳列印               |
| 👥 員工資料     | 員工主檔管理：職稱加給、勞保、健保（含眷屬、減免）、退休金自提、實習生標記         |
| 🏪 班別薪資設定 | 各門市班別時數與時薪，支援動態新增門市                                               |
| 🏆 業績獎金設定 | 營業額階梯獎金規則                                                                   |
| 📁 專案設定     | 彈性專案獎金定義                                                                     |
| 📋 保費級距表   | 依年度管理勞保、健保投保薪資級距，KV 儲存，支援 CRUD 與恢復預設（v2.7.0 新增）     |
| 🛡️ 操作紀錄    | 稽核日誌：依使用者、動作、關鍵字篩選，CSV 匯出                                      |
| ❓ 使用說明     | 各功能操作說明、勞健保法規計算規則（含 2026 台灣法規）                               |
| 🗒️ 版本修訂記錄 | 與 CHANGELOG.md 同步維護                                                             |

---

## 架構

| 層級          | 技術                                                              |
| ------------- | ----------------------------------------------------------------- |
| 前端          | 單檔 HTML SPA（`index.html`），純 JS + CSS，無 build step         |
| 後端 API      | Cloudflare Pages Functions（Node 風格 Fetch API）                 |
| 資料儲存      | Cloudflare KV（binding：`STOREOS_KV`）                            |
| 身分驗證      | Cloudflare Zero Trust Access（使用者信箱經由 request header 取得）|
| 部署          | Cloudflare Pages（git push 自動部署，或 `wrangler pages deploy`） |

整份應用採「本機即開即用，雲端即時同步」策略：任一員工匯入備份或修改資料後，所有裝置下次載入皆讀取雲端 KV 最新狀態。

## 目錄結構

```
StoreOS_project/
├── wrangler.toml          # Cloudflare Pages 設定（KV 綁定、build output dir）
├── CHANGELOG.md           # 版本歷程（與 index.html 內建 changelog 頁同步）
├── README.md              # 本檔
├── public/                # 靜態資源（pages_build_output_dir 指向此處）
│   └── index.html         # 主前端 SPA，所有頁面、樣式、互動邏輯
└── functions/             # Cloudflare Pages Functions（檔案路徑 = 路由）
    └── api/
        ├── data.js        → GET  /api/data    讀取全部核心資料（含 insuranceBrackets）
        ├── save.js        → POST /api/save    寫入指定 key 的資料
        ├── whoami.js      → GET  /api/whoami  回傳登入者信箱（Cloudflare Access）
        └── logs.js        → GET/POST /api/logs 稽核日誌讀寫（v2.5.0 新增）
```

> Cloudflare Pages Functions 採檔案路徑路由：`functions/api/foo.js` 會自動對應到 `/api/foo` 端點。靜態檔則以 `public/` 為根目錄對外提供，因此 `wrangler.toml` 與 `.md` 文件不會被當成靜態資源暴露。

## API 端點

| 方法  | 路徑          | 功能                                                                                                              |
| ----- | ------------- | ----------------------------------------------------------------------------------------------------------------- |
| GET   | `/api/data`   | 一次取回 `staff`, `records`, `tiers`, `projTypes`, `shifts`, `insuranceBrackets`                                  |
| POST  | `/api/save`   | body：`{ key, data }`，寫入單一 KV key                                                                            |
| GET   | `/api/whoami` | 回傳 `{ email, debug }`，email 取自 `cf-access-authenticated-user-email`                                          |
| GET   | `/api/logs`   | `?limit=N`（預設 300，最大 1000），回傳最新 N 筆稽核日誌                                                          |
| POST  | `/api/logs`   | body：`{ action, detail?, user? }`，寫入一筆日誌（user 若缺則取 Access 信箱）                                     |

### 稽核日誌欄位

```json
{
  "ts":     1730000000000,
  "user":   "alice@thefood.co",
  "action": "刪除紀錄",
  "detail": "台北車站 2026-04-15 $12,800",
  "ip":     "203.0.113.42"
}
```

保留最新 1,000 筆，超過時自動淘汰最舊紀錄。

## 資料模型（KV keys）

| key                  | 型別    | 說明                                                                          |
| -------------------- | ------- | ----------------------------------------------------------------------------- |
| `staff`              | array   | 員工主檔：姓名、門市、勞健保、職稱、加給、isIntern…                           |
| `records`            | array   | 每日營業額紀錄，含出班員工、專案次數、個人加項、bonusOverride                 |
| `tiers`              | array   | 業績獎金階梯規則 `[{ threshold, bonus }, ...]`                                |
| `projTypes`          | array   | 彈性專案獎金定義                                                              |
| `shifts`             | object  | 每門市的班別時數與時薪                                                        |
| `logs`               | array   | 稽核日誌（v2.5.0 起）                                                         |
| `insuranceBrackets`  | object  | 年度勞健保投保薪資級距表（v2.7.0 起），格式：`{ "2026": { li: [...], nhi: [...] } }` |

### `insuranceBrackets` 資料格式

```json
{
  "2026": {
    "li": [
      { "salary": 11100, "emp": 277 },
      { "salary": 12540, "emp": 313 },
      "..."
    ],
    "nhi": [
      { "salary": 29500, "emp": 458 },
      { "salary": 30300, "emp": 470 },
      "..."
    ]
  }
}
```

- `salary`：投保薪資級距上限（元）
- `emp`：員工應負擔保費（元）
- 勞保（`li`）：兼職級距從 $11,100 起，共 28 階；健保（`nhi`）：最低 $29,500，符合法定最低投保薪資
- 系統採「天花板查表法」：取第一個 `salary ≥ 員工投保薪資` 的級距
- 健保投保薪資若低於 $29,500，系統自動上修至 $29,500 並於薪資單附說明
- KV 無資料時自動套用 `DEFAULT_INSURANCE_BRACKETS`（2026 年官方資料）

## 薪資計算規則摘要

| 項目            | 規則                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------- |
| 業績獎金分配    | 多人同班時依工時比例分配；單人獨班則全額獲得                                                |
| 勞保（月中異動）| 依實際投保天數比例計算（天數 ÷ 當月總天數）                                                 |
| 健保（月中異動）| 月底離職扣整月；月中離職免扣；月中到職扣整月（依《全民健康保險法》第 27 條）               |
| 二代健保補充保費 | 有健保：獎金超過投保薪資 4 倍部分 × 2.11%；**無健保**：底薪／獎金任一筆超過 $29,500 × 2.11% |
| 退休金自提      | 以勞保投保薪資為基礎，依自提率（1–6%）計算                                                  |
| 實習生獎金      | 預設不參與獎金分配；可在記帳頁填入例外金額（bonusOverride），系統先扣除後再分配給正職員工   |

## 本機開發

```bash
# 需要先安裝 wrangler（或使用 npx）
npm install -g wrangler

# 使用 Cloudflare Pages 本機模擬（含 KV 綁定）
# 注意：public 為靜態根目錄，functions/ 會自動被辨識
wrangler pages dev public
```

預設會在 `http://localhost:8788` 啟動，可直接打 API 端點測試。

## 部署

1. 連結 Git repository 至 Cloudflare Pages 專案，push 至主分支即自動部署。
2. 或以 CLI 手動部署：
   ```bash
   wrangler pages deploy public --project-name=storeos
   ```
   （`functions/` 會由 Pages 自動編譯，不需另外指定。）
3. 首次部署需於 Pages 專案設定中綁定 KV namespace：
   - Binding name：`STOREOS_KV`
   - Namespace ID：見 [`wrangler.toml`](./wrangler.toml)

## 權限與稽核

- 系統部署於 Cloudflare Zero Trust Access 後方，未登入者無法訪問任何端點。
- 所有 mutation 行為（新增／修改／刪除員工、紀錄、規則、專案、班別、保費級距、匯入匯出等）皆由前端透過 `logAction()` 寫入 `/api/logs`；登入者信箱以 Access 標頭為準，無法偽造。
- 進入「🛡️ 操作紀錄」頁可依使用者、動作類型、關鍵字篩選並匯出 CSV。

## 檔案更新規範

當新增功能時，請同步更新以下三處：

1. `index.html` 內「🗒️ 版本修訂記錄」頁（`#page-changelog`）：新增 `cl-item`。
2. 版本徽章：`<span class="ver-badge" id="ver-badge">` 與 `init()` 內的 `document.getElementById('ver-badge').textContent`。
3. 根目錄 [`CHANGELOG.md`](./CHANGELOG.md)。
4. 根目錄 [`README.md`](./README.md)（本檔）：更新版本號、功能頁面表格、資料模型、API 說明。

匯出備份的 `version` 欄位亦建議同步調整（`exportBackup()` 內）。
