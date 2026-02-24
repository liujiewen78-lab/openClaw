import os
import time
from dataclasses import dataclass
from typing import Dict, List

import pandas as pd
import requests
import yfinance as yf
from dotenv import load_dotenv

load_dotenv()


@dataclass
class Signal:
    symbol: str
    signal_type: str
    price: float
    ma20: float
    rsi14: float
    reason: str


class Notifier:
    def __init__(self, mode: str):
        self.mode = mode
        self.telegram_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
        self.telegram_chat_id = os.getenv("TELEGRAM_CHAT_ID", "")
        self.feishu_webhook = os.getenv("FEISHU_WEBHOOK_URL", "")

    def send(self, message: str) -> None:
        if self.mode in ("telegram", "both"):
            self._send_telegram(message)
        if self.mode in ("feishu", "both"):
            self._send_feishu(message)

    def _send_telegram(self, message: str) -> None:
        if not self.telegram_token or not self.telegram_chat_id:
            return
        url = f"https://api.telegram.org/bot{self.telegram_token}/sendMessage"
        requests.post(url, json={"chat_id": self.telegram_chat_id, "text": message}, timeout=10)

    def _send_feishu(self, message: str) -> None:
        if not self.feishu_webhook:
            return
        payload = {"msg_type": "text", "content": {"text": message}}
        requests.post(self.feishu_webhook, json=payload, timeout=10)


def calc_rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.rolling(window=period).mean()
    avg_loss = loss.rolling(window=period).mean()
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def analyze_symbol(symbol: str) -> Signal | None:
    df = yf.download(symbol, period="3mo", interval="1d", progress=False, auto_adjust=True)
    if df.empty or len(df) < 30:
        return None

    close = df["Close"]
    ma20 = close.rolling(20).mean()
    rsi14 = calc_rsi(close, 14)

    price_now = float(close.iloc[-1])
    ma_now = float(ma20.iloc[-1])
    rsi_now = float(rsi14.iloc[-1])
    price_prev = float(close.iloc[-2])
    ma_prev = float(ma20.iloc[-2])

    crossed_up = price_prev <= ma_prev and price_now > ma_now
    crossed_down = price_prev >= ma_prev and price_now < ma_now

    if crossed_up and rsi_now < 70:
        return Signal(symbol, "BUY_OPPORTUNITY", price_now, ma_now, rsi_now, "上穿MA20 且 RSI<70")

    if crossed_down or rsi_now > 75:
        reason = "下穿MA20" if crossed_down else "RSI>75"
        return Signal(symbol, "RISK_ALERT", price_now, ma_now, rsi_now, reason)

    return None


def format_signal(signal: Signal) -> str:
    return (
        f"[{signal.signal_type}] {signal.symbol}\n"
        f"价格: {signal.price:.2f} | MA20: {signal.ma20:.2f} | RSI14: {signal.rsi14:.2f}\n"
        f"原因: {signal.reason}"
    )


def run_loop() -> None:
    watchlist = [x.strip().upper() for x in os.getenv("WATCHLIST", "AAPL,MSFT").split(",") if x.strip()]
    poll_seconds = int(os.getenv("POLL_SECONDS", "120"))
    notifier = Notifier(os.getenv("NOTIFIER", "telegram"))

    last_sent: Dict[str, str] = {}

    while True:
        for symbol in watchlist:
            try:
                signal = analyze_symbol(symbol)
                if not signal:
                    continue

                key = f"{signal.symbol}:{signal.signal_type}:{signal.reason}"
                if last_sent.get(symbol) == key:
                    continue

                msg = format_signal(signal)
                notifier.send(msg)
                print(msg)
                last_sent[symbol] = key
            except Exception as exc:
                print(f"{symbol} 分析失败: {exc}")

        time.sleep(poll_seconds)


if __name__ == "__main__":
    run_loop()
