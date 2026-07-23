# StoreOS 開發會談摘要（供壓縮前參考）

> 本檔案為對話壓縮前的整理紀錄，供後續接續開發時快速回顧脈絡。非專案正式文件，可隨時刪除。

---

## 專案基本資訊

- **Repo**：`abey28/storeos`（私有），本機路徑 `C:\Claude\StoreOS\storeos`
- **性質**：THE food co. 同興門市管理系統，Cloudflare Pages SPA
- **架構**：`public/index.html`（純 HTML）+ `public/css/app.css` + `public/js/*.js`（全域 scope，無 build step）+ `functions/api/*.js`（Cloudflare Pages Functions）+ Cloudflare KV（binding `STOREOS_KV`）
- **部署**：git push main → GitHub Actions（`.github/workflows/deploy.yml`）→ `wrangler pages deploy`；異常時可本機 `wrangler pages deploy public --project-name=storeos` 備援
- **目前版本**：v2.9.0（已推送並部署成功）

---

## 版本演進時間軸

| 版本 | 內容 |
|------|------|
| v2.6.1 | 修正勞健保級距表遺漏兼職級距（$11,100 起） |
| v2.6.2→v2.6.3 | 新增「當月在職異動」欄位，依台灣法規計算勞健保（勞保按天、健保按月，月中離職免扣） |
| v2.7.0 | 新增「保費級距表」設定頁（KV 儲存、年度管理）；修正 2026 官方 PDF 級距數據；改 ceiling lookup 查表；健保最低 $29,500 自動上修；修正補充保費 bug（`!nhiInsured`）；全員薪資總表列印排版優化（字體放大、色塊加深） |
| v2.8.0 | **架構重構**：index.html 拆分為 css/app.css + js/*.js + js/pages/*.js 模組；`r.staff` 改存 `{id,name}`（staffId 遷移，`rsName()`/`rsId()` 相容舊格式）；全面 XSS 防護（`escapeHtml()`）；備份匯出/匯入同步 insuranceBrackets |
| v2.9.0 | **業績獎金制度重構**：分門市（預設規則＋門市專屬規則）× 分身分（正式／新進 `isNewbie`）；改為「各自查表領全額」（不再分池）；`bonusData` 快照凍結歷史紀錄；`/api/save` 加白名單＋型別檢查＋自動稽核 log |

---

## 關鍵技術決策與其原因

### 1. 為何拆分 index.html（v2.8.0）
原始單檔 ~3200 行，CSS/HTML/計算邏輯/渲染/同步全部混在一起，牽一髮動全身。拆分為：
- `utils.js`（工具函式）/ `state.js`（全域變數）/ `api.js`（KV 讀寫）/ `payroll.js`（勞健保與獎金計算）/ `router.js`（路由）/ `app.js`（init/備份）
- `pages/*.js`（9 個頁面模組：dashboard, record, history, bonus, report, payslip, staff, settings, logs）
- 全部維持全域 scope（無 IIFE/export/import），因為專案無 build step

### 2. 為何 records 改存 staffId
舊制用姓名字串關聯（`r.staff: ['Alice']`），改名會遍歷全部歷史紀錄改字串，長期有同名/改名/離職復職風險。改為 `{id, name}` 物件，`name` 作快照顯示、`id` 作穩定關聯；`rsName(e)`/`rsId(e)` 兩個 helper 相容新舊格式，無需資料遷移腳本。

### 3. 為何 XSS 全面加 escapeHtml
內部系統但仍有多處 `innerHTML` 直接拼接使用者輸入（姓名、門市名、備註等），未跳脫恐有 `<img onerror=...>` 污染風險。統一在拼接處套用既有 `escapeHtml()`。

### 4. 業績獎金制度為何改「各自查表領全額」而非「分池」
使用者需求：正式與新進人員應各自適用不同門檻/獎金規則，而非統一除以二；且不同門市營運狀況不同，需各自規則。經 AskUserQuestion 確認三個關鍵決策：
- **分配語意**：各自查表領全額（非分池後乘比例）
- **新進判定**：員工資料手動勾選 `isNewbie`（非自動依到職天數判定）
- **門市無專屬規則時**：沿用預設規則表（非強制每間門市都要設定）

### 5. 為何要 bonusData 快照凍結
若獎金規則之後又調整，不應影響已發放的歷史薪資。新紀錄儲存當下即計算並存入 `r.bonusData`；`distributeBonusForRecord()` 判斷有無 `bonusData`，有則直接回傳快照，無則（舊紀錄）走原本的獎金池 × 工時比例邏輯，兩者並存不衝突。

### 6. `/api/save` 為何加白名單與自動稽核
原本任何人通過 Cloudflare Access 即可對 `/api/save` 傳任意 `{key, data}` 直接覆寫 KV，且不會留下稽核紀錄（稽核只靠前端 `logAction()` 自律呼叫）。改為：
- 白名單只允許 6 個合法 key（`staff/records/tiers/projTypes/shifts/insuranceBrackets`）
- 基本型別檢查（array/object）
- 寫入成功後**後端自動**寫一筆 log 到 KV `logs`（`action:'API寫入:'+key`），與前端 `logAction()` 並存，堵住「繞過前端直接改資料不留痕」的漏洞

---

## 使用者尚未採納 / 未來可討論的架構建議（原始 7 點風險分析）

使用者曾提出 7 項風險分析，**已完成 4 項**（見上）；以下 3 項尚未處理，供未來參考：

1. **KV 不適合多人同時寫同一份陣列資料**（read-modify-write 競態）：短期可加 `updatedAt`/`version` 做衝突檢查；中期若多人並發頻繁，建議評估遷移至 Cloudflare D1。
2. **稽核紀錄粒度**：目前 `/api/save` 自動記錄的 log 只知道「哪個 key 被寫入、幾筆資料」，不知道具體改了什麼欄位/哪一筆——細粒度稽核仍依賴前端 `logAction()` 的描述文字。
3. **多人同時編輯同一員工/紀錄的衝突偵測**：目前沒有樂觀鎖或版本號機制，後寫入者會直接覆蓋前者。

---

## 已知環境問題與繞過方案

- **GitHub Actions runner 偶發卡在 `queued` 狀態**（非程式碼問題）：可用 `gh run cancel <id>` + `gh run rerun <id>` 重新觸發；若仍卡住，可用本機 `wrangler pages deploy public --project-name=storeos` 直接部署繞過 CI。
- **wrangler CLI 認證 token 會過期**：出現 `Failed to fetch auth token: 400` 時需重新 `wrangler login`（此對話中最後一次未重新登入，改用等待 GitHub Actions 自行恢復，最終成功）。
- **PowerShell 執行原則封鎖 npx.ps1**：需改用 `node "C:\Program Files\nodejs\node_modules\npm\bin\npx-cli.js" wrangler ...` 繞過。

---

## 檔案更新規範（專案內建規則，README.md 有記載）

新增功能時需同步四處：
1. `public/index.html` 內「🗒️ 版本修訂記錄」頁（`#page-changelog`）新增 `cl-item`
2. 版本徽章：`ver-badge` 與 `app.js` 的 `init()`
3. 根目錄 `CHANGELOG.md`
4. 根目錄 `README.md`（架構、資料模型、API 說明同步）

`exportBackup()` 的 `version` 欄位也需同步更新，且備份需包含所有 KV key（含新增的 `insuranceBrackets`、新版 `tiers` 結構）。

---

## 建議下次接續時的起點

若要繼續優化，可從「已知環境問題」與「尚未採納的 3 項架構建議」中挑選；或詢問使用者是否有新的功能需求。目前版本 v2.9.0 的 13 項計算邏輯煙霧測試與語法檢查均已通過並部署成功。
