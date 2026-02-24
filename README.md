# Stock Watch Bot (Telegram / Feishu)

一个可扩展的「盯盘机器人」骨架：

- 定时检查你的持仓和关注列表
- 基于技术指标（如 MA、RSI）识别信号
- 通过 Telegram 或飞书发送提醒
- 可接入券商 API（你自己的账户）

> ⚠️ 仅用于信息提醒，不构成投资建议。

## 快速开始

1. 安装依赖

```bash
pip install -r requirements.txt
```

2. 配置环境变量（可复制 `.env.example`）

```bash
cp .env.example .env
```

3. 运行

```bash
python monitor_bot.py
```

## 当前策略（可扩展）

- `BUY_OPPORTUNITY`：价格上穿 MA20 且 RSI < 70
- `RISK_ALERT`：价格下穿 MA20 或 RSI > 75

## 下一步建议

- 接入你的券商持仓 API（盈透、富途、老虎等）
- 增加止盈止损规则（ATR、分批止盈）
- 增加盘中实时模式（WebSocket 行情）
- 按账户风险偏好做分级提醒
