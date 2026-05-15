import { NextResponse } from "next/server";

type PlatformPrice = {
  platform: string;
  price: number;
  estimated?: boolean;
};

type SearchResult = {
  itemName: string;
  hashName: string;
  prices: PlatformPrice[];
};

// 把 "¥55.20" / "$1,234.56" 这种带符号的价格字符串变成数字
function parsePriceString(s: string): number {
  const cleaned = s.replace(/[^\d.]/g, "");
  return parseFloat(cleaned);
}

// Steam Market search 接口返回的单条结果(只列我们用到的字段)
type SteamSearchItem = {
  name: string;
  hash_name: string;
  sell_price_text: string;
  asset_description?: {
    market_name?: string;
    market_hash_name?: string;
  };
};

type SteamSearchResponse = {
  success?: boolean;
  total_count?: number;
  results?: SteamSearchItem[];
};

// 用 Steam Market search 搜任意关键词(中/英文均可),返回首条匹配
async function searchSteamMarket(
  query: string,
): Promise<SteamSearchItem | null> {
  const url = new URL("https://steamcommunity.com/market/search/render/");
  url.searchParams.set("query", query);
  url.searchParams.set("appid", "730"); // 730 = CS2
  url.searchParams.set("l", "schinese"); // 简体中文,接受中文关键词并返回中文名
  url.searchParams.set("currency", "23"); // 23 = CNY
  url.searchParams.set("norender", "1"); // 只要 JSON,不要 HTML
  url.searchParams.set("start", "0");
  url.searchParams.set("count", "10");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "Mozilla/5.0 CS2-Price-Comparison",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Steam Market search 返回状态码 ${res.status}`);
  }

  const data = (await res.json()) as SteamSearchResponse;
  if (!data.success || !data.results || data.results.length === 0) {
    return null;
  }
  return data.results[0];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim();

  if (!name) {
    return NextResponse.json({ error: "缺少参数: name" }, { status: 400 });
  }

  let top: SteamSearchItem | null;
  try {
    top = await searchSteamMarket(name);
  } catch (e) {
    return NextResponse.json(
      { error: `请求 Steam Market 失败: ${(e as Error).message}` },
      { status: 502 },
    );
  }

  if (!top) {
    return NextResponse.json(
      { error: `未找到匹配「${name}」的饰品,请换个关键词试试` },
      { status: 404 },
    );
  }

  const steamPrice = parsePriceString(top.sell_price_text || "");
  if (!Number.isFinite(steamPrice) || steamPrice <= 0) {
    return NextResponse.json(
      { error: "该饰品当前在 Steam 市场无在售挂单" },
      { status: 404 },
    );
  }

  // 中文名优先用 asset_description.market_name(更规范),fallback 到 name
  const itemName = top.asset_description?.market_name ?? top.name;
  const hashName = top.asset_description?.market_hash_name ?? top.hash_name;

  const result: SearchResult = {
    itemName,
    hashName,
    prices: [
      { platform: "Steam Market", price: steamPrice },
      {
        platform: "BUFF163",
        price: Math.round(steamPrice * 0.8 * 100) / 100,
        estimated: true,
      },
      {
        platform: "悠悠有品",
        price: Math.round(steamPrice * 0.85 * 100) / 100,
        estimated: true,
      },
    ],
  };

  return NextResponse.json(result);
}
