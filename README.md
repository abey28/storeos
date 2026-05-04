# THE food co. 同興 門市管理系統（StoreOS）

專為 THE food co. 同興三間門市（台北車站、中山誠品、松菸誠品）打造的內部管理系統，涵蓋日常營業額登記、業績與專案獎金自動計算、月報表、薪資單列印、員工／門市／班別設定，以及完整的稽核日誌與分析儀表板。

目前版本：**v2.6.0**（詳見 [CHANGELOG.md](./CHANGELOG.md)）。

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
        ├── data.js        → GET  /api/data    讀取全部核心資料
        ├── save.js        → POST /api/save    寫入指定 key 的資料
        ├── whoami.js      → GET  /api/whoami  回傳登入者信箱（Cloudflare Access）
        └── logs.js        → GET/POST /api/logs 稽核日誌讀寫（v2.5.0 新增）
```

> Cloudflare Pages Functions 採檔案路徑路由：`functions/api/foo.js` 會自動對應到 `/api/foo` 端點。靜態檔則以 `public/` 為根目錄對外提供，因此 `wrangler.toml` 與 `.md` 文件不會被當成靜態資源暴露。

## API 端點

| 方法  | 路徑          | 功能                                                                            |
| ----- | ------------- | ------------------------------------------------------------------------------- |
| GET   | `/api/data`   | 一次取回 `staff`, `records`, `tiers`, `projTypes`, `shifts`                     |
| POST  | `/api/save`   | body：`{ key, data }`，寫入單一 KV key                                           |
| GET   | `/api/whoami` | 回傳 `{ email, debug }`，email 取自 `cf-access-authenticated-user-email`        |
| GET   | `/api/logs`   | `?limit=N`（預設 300，最大 1000），回傳最新 N 筆稽核日誌                        |
| POST  | `/api/logs`   | body：`{ action, detail?, user? }`，寫入一筆日誌（user 若缺則取 Access 信箱）   |

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

| key         | 型別    | 說明                                                  |
| ----------- | ------- | ----------------------------------------------------- |
| `staff`     | array   | 員工主檔：姓名、門市、勞健保、職稱、加給、isIntern…   |
| `records`   | array   | 每日營業額紀錄，含出班員工、專案次數、個人加項、bonusOverride |
| `tiers`     | array   | 業績獎金階梯規則 `[{ threshold, bonus }, ...]`        |
| `projTypes` | array   | 彈性專案獎金定義                                      |
| `shifts`    | object  | 每門市的班別時數與時薪                                |
| `logs`      | array   | 稽核日誌（v2.5.0 起）                                 |

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
- 所有 mutation 行為（新增／修改／刪除員工、紀錄、規則、專案、班別、匯入匯出等）皆由前端透過 `logAction()` 寫入 `/api/logs`；登入者信箱以 Access 標頭為準，無法偽造。
- 進入「🛡️ 操作紀錄」頁可依使用者、動作類型、關鍵字篩選並匯出 CSV。

## 檔案更新規範

當新增功能時，請同步更新以下三處：

1. `index.html` 內「🗒️ 版本修訂記錄」頁（`#page-changelog`）：新增 `cl-item`。
2. 版本徽章：`<span class="ver-badge" id="ver-badge">` 與 `init()` 內的 `document.getElementById('ver-badge').textContent`。
3. 根目錄 [`CHANGELOG.md`](./CHANGELOG.md)。

匯出備份的 `version` 欄位亦建議同步調整（`exportBackup()` 內）。
