export type MarketKey = "us" | "india" | "forex" | "crypto" | "gold";

export interface Instrument {
  symbol: string;
  name: string;
  /** provider routing: yahoo | coingecko */
  provider: "yahoo" | "coingecko";
  /** provider-native symbol (yahoo ticker / coingecko id) */
  pid: string;
  decimals?: number;
}

export interface MarketConfig {
  key: MarketKey;
  label: string;
  short: string;
  currency: string;
  currencySymbol: string;
  instruments: Instrument[];
}

export const MARKETS: Record<MarketKey, MarketConfig> = {
  us: {
    key: "us",
    label: "US Stocks",
    short: "US",
    currency: "USD",
    currencySymbol: "$",
    instruments: [
      { symbol: "AAPL", name: "Apple Inc.", provider: "yahoo", pid: "AAPL" },
      { symbol: "NVDA", name: "NVIDIA Corp.", provider: "yahoo", pid: "NVDA" },
      { symbol: "TSLA", name: "Tesla Inc.", provider: "yahoo", pid: "TSLA" },
      { symbol: "MSFT", name: "Microsoft Corp.", provider: "yahoo", pid: "MSFT" },
      { symbol: "AMZN", name: "Amazon.com Inc.", provider: "yahoo", pid: "AMZN" },
      { symbol: "META", name: "Meta Platforms", provider: "yahoo", pid: "META" },
      { symbol: "GOOGL", name: "Alphabet Inc.", provider: "yahoo", pid: "GOOGL" },
      { symbol: "AMD", name: "Advanced Micro Devices", provider: "yahoo", pid: "AMD" },
    ],
  },
  india: {
    key: "india",
    label: "India NSE",
    short: "IN",
    currency: "INR",
    currencySymbol: "\u20B9",
    instruments: [
      { symbol: "RELIANCE", name: "Reliance Industries", provider: "yahoo", pid: "RELIANCE.NS" },
      { symbol: "TCS", name: "Tata Consultancy Svcs", provider: "yahoo", pid: "TCS.NS" },
      { symbol: "HDFCBANK", name: "HDFC Bank", provider: "yahoo", pid: "HDFCBANK.NS" },
      { symbol: "INFY", name: "Infosys Ltd.", provider: "yahoo", pid: "INFY.NS" },
      { symbol: "TATAMOTORS", name: "Tata Motors", provider: "yahoo", pid: "TATAMOTORS.NS" },
      { symbol: "SBIN", name: "State Bank of India", provider: "yahoo", pid: "SBIN.NS" },
    ],
  },
  forex: {
    key: "forex",
    label: "Forex",
    short: "FX",
    currency: "USD",
    currencySymbol: "$",
    instruments: [
      { symbol: "EURUSD", name: "Euro / US Dollar", provider: "yahoo", pid: "EURUSD=X", decimals: 4 },
      { symbol: "GBPUSD", name: "Pound / US Dollar", provider: "yahoo", pid: "GBPUSD=X", decimals: 4 },
      { symbol: "USDJPY", name: "US Dollar / Yen", provider: "yahoo", pid: "USDJPY=X", decimals: 3 },
      { symbol: "USDINR", name: "US Dollar / Rupee", provider: "yahoo", pid: "USDINR=X", decimals: 3 },
      { symbol: "AUDUSD", name: "Aussie / US Dollar", provider: "yahoo", pid: "AUDUSD=X", decimals: 4 },
      { symbol: "USDCAD", name: "US Dollar / CAD", provider: "yahoo", pid: "USDCAD=X", decimals: 4 },
    ],
  },
  crypto: {
    key: "crypto",
    label: "Crypto",
    short: "CR",
    currency: "USD",
    currencySymbol: "$",
    instruments: [
      { symbol: "BTCUSD", name: "Bitcoin", provider: "coingecko", pid: "bitcoin" },
      { symbol: "ETHUSD", name: "Ethereum", provider: "coingecko", pid: "ethereum" },
      { symbol: "SOLUSD", name: "Solana", provider: "coingecko", pid: "solana" },
      { symbol: "BNBUSD", name: "BNB", provider: "coingecko", pid: "binancecoin" },
      { symbol: "XRPUSD", name: "XRP", provider: "coingecko", pid: "ripple" },
      { symbol: "DOGEUSD", name: "Dogecoin", provider: "coingecko", pid: "dogecoin" },
    ],
  },
  gold: {
    key: "gold",
    label: "Metals",
    short: "MT",
    currency: "USD",
    currencySymbol: "$",
    instruments: [
      { symbol: "XAUUSD", name: "Gold", provider: "yahoo", pid: "GC=F", decimals: 2 },
      { symbol: "XAGUSD", name: "Silver", provider: "yahoo", pid: "SI=F", decimals: 3 },
      { symbol: "XPTUSD", name: "Platinum", provider: "yahoo", pid: "PL=F", decimals: 2 },
    ],
  },
};

export const MARKET_LIST = Object.values(MARKETS);

export function findInstrument(symbol: string, market?: string): Instrument | undefined {
  for (const m of MARKET_LIST) {
    if (market && m.key !== market) continue;
    const hit = m.instruments.find((i) => i.symbol === symbol);
    if (hit) return hit;
  }
  return undefined;
}

export function marketOf(market: string): MarketConfig {
  return MARKETS[(market as MarketKey) in MARKETS ? (market as MarketKey) : "us"];
}

export function decimalsFor(symbol: string, market?: string): number {
  const inst = findInstrument(symbol, market);
  if (inst?.decimals != null) return inst.decimals;
  return 2;
}

/** Symbols shown on the dashboard live strip */
export const STRIP_SYMBOLS: { symbol: string; market: MarketKey }[] = [
  { symbol: "BTCUSD", market: "crypto" },
  { symbol: "ETHUSD", market: "crypto" },
  { symbol: "XAUUSD", market: "gold" },
  { symbol: "EURUSD", market: "forex" },
  { symbol: "USDINR", market: "forex" },
  { symbol: "AAPL", market: "us" },
  { symbol: "NVDA", market: "us" },
  { symbol: "RELIANCE", market: "india" },
];

export const MOODS = [
  { key: "great", label: "Great" },
  { key: "good", label: "Good" },
  { key: "neutral", label: "Neutral" },
  { key: "low", label: "Low" },
  { key: "rough", label: "Rough" },
] as const;

export const SETUPS = [
  "Breakout",
  "Pullback",
  "Trend follow",
  "Mean reversion",
  "Range fade",
  "News play",
  "Gap & go",
  "Support bounce",
  "Liquidity sweep",
  "DCA accumulator",
];
