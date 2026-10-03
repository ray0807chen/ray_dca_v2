import json
import time
import yfinance as yf
import os

def fetch_market_data(symbol):
    """抓取 yfinance 的基本面資料"""
    data = {
        "price": None,
        "mktCap": None,
        "pe": None,
        "rating": None,
        "rating_score": None,
        "rating_recommendation": None
    }

    try:
        # 有些 ETF 在 yfinance 找不到 rating 甚至 pe
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        # 價格
        data["price"] = info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose")
        
        # 總市值
        data["mktCap"] = info.get("marketCap")
        
        # 本益比
        data["pe"] = info.get("trailingPE") or info.get("forwardPE")
        
        # 建議操作
        rec = info.get("recommendationKey")
        if rec and rec != "none":
            rec_str = str(rec).replace("_", " ").title()
            data["rating_recommendation"] = rec_str
            if "Strong Buy" in rec_str:
                data["rating_score"] = 5
                data["rating"] = "A+"
            elif "Buy" in rec_str:
                data["rating_score"] = 4
                data["rating"] = "A"
            elif "Hold" in rec_str:
                data["rating_score"] = 3
                data["rating"] = "B"
            elif "Underperform" in rec_str:
                data["rating_score"] = 2
                data["rating"] = "C"
            elif "Sell" in rec_str:
                data["rating_score"] = 1
                data["rating"] = "D"
            else:
                data["rating"] = "NR"
                data["rating_score"] = "-"
        else:
            # 沒提供 rating_recommendation 的話 (比如 ETF)
            data["rating"] = "N/A"
            data["rating_score"] = "-"
            data["rating_recommendation"] = "N/A"

    except Exception as e:
        print(f"[{symbol}] 抓取資料時發生錯誤: {e}")

    return data

def main():
    target_file = "companies.json"  
    
    try:
        with open(target_file, "r", encoding="utf-8") as f:
            companies = json.load(f)
    except FileNotFoundError:
        print(f"找不到 {target_file}。")
        return

    # 過濾出真正的股票代碼（排除 _metadata）
    symbols_to_process = [(s, i) for s, i in companies.items() if s != "_metadata"]
    total_symbols = len(symbols_to_process)
    print(f"開始更新 {total_symbols} 檔標的之市場資料 (使用 yfinance)...")

    for index, (symbol, info) in enumerate(symbols_to_process, 1):
        print(f"[{index}/{total_symbols}] 正在處理: {symbol}...")
        
        # 抓取 API 資料
        m_data = fetch_market_data(symbol)
        info["market_data"] = m_data
        
        # 稍微停頓
        time.sleep(0.3)
    # 新增更新時間標記 (抓取當下的美東或本地時間皆可，這裡以 YYYY-MM-DD 表示)
    # 將結果寫回
    with open(target_file, "w", encoding="utf-8") as f:
        json.dump(companies, f, ensure_ascii=False, indent=4)

    print(f"\n✅ 資料更新完成！已覆寫 {target_file}")

if __name__ == "__main__":
    main()