import { NextResponse } from "next/server";

type PlatformPrice = {
  platform: string;
  price: number;
  estimated?: boolean;
};

type SearchResult = {
  itemName: string;
  prices: PlatformPrice[];
};

// 把 "¥55.20" / "$1,234.56" 这种带符号的价格字符串变成数字
function parsePriceString(s: string): number {
  const cleaned = s.replace(/[^\d.]/g, "");
  return parseFloat(cleaned);
}

// 调用 Steam Market 的 priceoverview 接口
async function fetchSteamPrice(marketHashName: string): Promise<number | null> {
  const url = new URL("https://steamcommunity.com/market/priceoverview/");
  url.searchParams.set("appid", "730"); // 730 = CS2
  url.searchParams.set("currency", "23"); // 23 = CNY (人民币)
  url.searchParams.set("market_hash_name", marketHashName);

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "Mozilla/5.0 CS2-Price-Comparison",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Steam Market 返回状态码 ${res.status}`);
  }

  const data = (await res.json()) as {
    success?: boolean;
    lowest_price?: string;
    median_price?: string;
  };

  if (!data.success) return null;

  const priceStr = data.lowest_price ?? data.median_price;
  if (!priceStr) return null;

  const num = parsePriceString(priceStr);
  return Number.isFinite(num) ? num : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim();

  if (!name) {
    return NextResponse.json({ error: "缺少参数: name" }, { status: 400 });
  }

  let steamPrice: number | null;
  try {
    steamPrice = await fetchSteamPrice(name);
  } catch (e) {
    return NextResponse.json(
      { error: `请求 Steam Market 失败: ${(e as Error).message}` },
      { status: 502 },
    );
  }

  if (steamPrice === null) {
    return NextResponse.json(
      {
        error:
          "Steam Market 未找到该饰品,请确认输入的是正确的英文 market_hash_name",
      },
      { status: 404 },
    );
  }

  // BUFF / 悠悠 没有公开 API,这里用基于 Steam 价格的市场惯例估算
  // (BUFF 通常 ≈ Steam × 0.80,悠悠 ≈ Steam × 0.85)
  const result: SearchResult = {
    itemName: name,
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
