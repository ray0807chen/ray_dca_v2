# RAY DCA v2.0 — 美股定期定額回測系統

**網頁連結：** [https://ray0807chen.github.io/ray_dca/](https://ray0807chen.github.io/ray_dca_v2/) 或 [https://raytaiwan.qzz.io/](https://raytaiwan.qzz.io/)

這是一個強大且視覺精美的美股投資回測與數據分析網站。由 RAY 所開發，專為分析定期定額（DCA）與單筆投入（All-in）策略的歷史真實績效而設計。經過 v2.0 等級的全面升級，本專案現已具備專業級的數據深度與頂級的 UI/UX 沉浸式體驗。

---

## 🚀 v2.0 重大更新亮點 (Major Updates)

### 1.UI/UX 視覺重構 (Premium Design)
* **暗黑玻璃擬態 (Dark Glassmorphism)**：引進高質感的深藍與曜石黑背景，搭配金色漸層、毛玻璃特效與細膩的高階陰影。
* **微動畫加持 (Micro-interactions)**：全面導入 GSAP 滑動視差與入場動畫，並為各個互動按鈕（如 CTA 與漢堡選單）實作柔和的點擊水波紋 (Ripple) 與轉換層次。

### 2. 市場資訊深度整合 (Market Data Analytics)
* **自動分析師評估 (Analyst Rating)**：新增以「指針儀表板（Gauge）」視覺化呈現華爾街對該股票的共識評級（強烈買進至賣出）。
* **總體經濟指標**：選定股票後，能即時自動顯示最新的 **本益比 (PE)、總市值 (Market Cap)、財報概況與公司基本面**。
* **精確的時間戳記**：所有的最新股價與評級皆支援自動附加「資料更新日期（收盤價）」標記，確保數據透明性。

### 3. 架構與數據層強健化 (Backend & Architecture)
* **全新爬蟲引擎 `fetch_market_data.py`**：採用更穩定的 `yfinance` 模組，徹底解決了舊版 FMP API 次數限制的問題。
* **單一資料來源 (SSOT)**：所有標的統一在 `companies.json` 管理，新增至 57 檔涵蓋市場絕對主流的熱門標的與 ETF，前端自動從 `stock_data/AAPL.json` 提取最新收盤日期，確保數據版本一致。

---

## 💡 核心功能

### 1. DCA 策略回測 (Backtest Engine)
針對任何支援的標的，輸入：
* 投資起始日期、每月投資金額
* 每月投資日 (支援 1~28 日彈性扣款)
* 手續費率 (%)
系統將以真實歷史收盤價逐月模擬計算，產出：總投入成本、現值、總報酬率、年化報酬率（CAGR）、手續費總支出、損益金額，並產生動態資產走勢圖 (Chart.js)。

### 2. 績效 PK 競技場 (Stock PK Mode)
想比較 Apple 和 Microsoft 十年來的績效差距？
* 支援 **All-in (單筆)** 與 **DCA (定期定額)** 兩種完全不同的資金策略比較。
* 快速切換 1年、3年、5年、10年、20年 期間。
* 自動繪製歷史績效雙折線圖，並直觀顯示「最終贏家」。

---

## 🛠 技術棧 (Tech Stack)

| 領域 | 技術與工具 |
|------|------|
| **前端架構** | 純 HTML5 + Vanilla CSS3 + Vanilla JavaScript |
| **視覺與動畫** | GSAP (ScrollTrigger), 客製化 CSS 變數系統 |
| **圖表繪製** | Chart.js (折線圖), Highcharts (回測圖), 自磨 CSS Gauge |
| **資料來源** | Yahoo Finance (Python `yfinance` 庫) |
| **自動化部署** | GitHub Actions 每日自動執行 Python 腳本更新並推播 |
| **Hosting** | GitHub Pages (`gh-pages` branch) |

---

## ⏱ 自動更新機制

系統每天依賴 GitHub Actions 強大的 CI/CD 工作流 (`daily-update.yml`) 執行：
1. 下午 / 早上定時喚醒虛擬機。
2. 執行 `fetch_market_data.py`，拉取 57 檔股票最新的「收盤價、市值、PE、分析師評分」。
3. 同步拉取 Yahoo Finance 完整的歷史 K 線資料至 `stock_data/` 目錄。
4. 寫入最新更新日期至 `companies.json` 並自動 Commit 推送回主線。

---

## 💻 本地執行指南

如果你想在本地環境進行開發或驗證：

```bash
# 1. 安裝 Python 核心依賴
pip install yfinance pandas

# 2. 執行更新腳本 (抓取最新收盤價與歷史數據)
python fetch_market_data.py
python update_data.py

# 3. 啟動本地測試伺服器 (避免瀏覽器直接開啟 HTML 發生 CORS 阻擋)
python -m http.server 7788

# 4. 打開瀏覽器訪問
http://localhost:7788
```

---

## 📜 授權協議 (License)

本專案採用 **MIT License** 開源。
歡迎 Fork 進行二次開發，請於顯著位置保留原始作者註記即可。
