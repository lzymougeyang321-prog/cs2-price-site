"use client";

import { useState } from "react";

type PlatformPrice = {
  platform: string;
  price: number;
  estimated?: boolean;
};

type SearchResult = {
  itemName: string;
  hashName?: string;
  prices: PlatformPrice[];
};

// 几个常用饰品的示例(用户可以一键填入)
const EXAMPLES = ["AK-47 红线", "AWP 阿西莫夫", "M4A4 龙王"];

export default function Home() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (overrideQuery?: string) => {
    const trimmed = (overrideQuery ?? query).trim();
    if (!trimmed) return;
    if (overrideQuery) setQuery(overrideQuery);

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(
        `/api/price?name=${encodeURIComponent(trimmed)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `请求失败: ${res.status}`);
      }
      setResult(data as SearchResult);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const lowest = result
    ? result.prices.reduce((min, p) => (p.price < min.price ? p : min))
    : null;
  const highest = result
    ? result.prices.reduce((max, p) => (p.price > max.price ? p : max))
    : null;
  const spread = lowest && highest ? highest.price - lowest.price : 0;

  return (
    <div className="flex flex-col flex-1">
      <header className="bg-[#171a21] border-b border-black/40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <span className="text-2xl">🎯</span>
          <h1 className="text-xl font-bold text-white">CS2 饰品比价</h1>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            一键查询多平台饰品价格
          </h2>
          <p className="text-[#8f98a0] text-sm sm:text-base">
            支持 Steam Market · BUFF163 · 悠悠有品
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          {/* 搜索框 + 按钮 */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              disabled={loading}
              placeholder="输入饰品名称(支持中文),例如:红线、阿西莫夫、AK-47 红线"
              className="flex-1 bg-[#316282] border border-[#4c6b8a] rounded px-4 py-3 text-white placeholder-[#8f98a0] focus:outline-none focus:border-[#66c0f4] transition-colors disabled:opacity-60"
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="bg-gradient-to-b from-[#75b022] to-[#588a1b] hover:from-[#8ed629] hover:to-[#6aa621] text-white font-semibold px-8 py-3 rounded transition-colors whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "搜索中..." : "搜索"}
            </button>
          </div>

          {/* 示例快捷按钮 */}
          <div className="mt-4 flex flex-wrap gap-2 items-center text-sm">
            <span className="text-[#8f98a0]">试试:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => handleSearch(ex)}
                disabled={loading}
                className="text-[#66c0f4] hover:text-[#a4d7f5] hover:underline disabled:opacity-60"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mt-8 max-w-3xl mx-auto bg-[#5c1f1f] border border-[#a83232] text-[#f5b8b8] rounded p-4 text-sm">
            ❌ {error}
          </div>
        )}

        {/* 结果区 */}
        {result && lowest && (
          <section className="mt-12">
            <h3 className="text-xl text-white mb-6">
              <span className="text-[#8f98a0]">搜索结果:</span>
              <span className="text-[#66c0f4] ml-2">{result.itemName}</span>
              {result.hashName && result.hashName !== result.itemName && (
                <span className="block text-xs text-[#67707b] mt-1 font-mono">
                  {result.hashName}
                </span>
              )}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {result.prices.map((p) => {
                const isLowest = p.platform === lowest.platform;
                return (
                  <div
                    key={p.platform}
                    className={`bg-[#16202d] rounded-lg p-5 border-2 transition-all ${
                      isLowest
                        ? "border-[#75b022] shadow-lg shadow-[#75b022]/20"
                        : "border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[#8f98a0] text-sm">
                        {p.platform}
                      </span>
                      <div className="flex gap-1.5">
                        {p.estimated && (
                          <span
                            className="text-xs bg-[#3a4a5c] text-[#c7d5e0] px-2 py-0.5 rounded"
                            title="该平台无公开 API,价格基于 Steam Market 估算"
                          >
                            估算
                          </span>
                        )}
                        {isLowest && (
                          <span className="text-xs bg-[#75b022] text-white px-2 py-0.5 rounded font-semibold">
                            最低价
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-white">
                      ¥{p.price.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 bg-[#16202d]/60 rounded-lg p-4 flex flex-col sm:flex-row gap-3 sm:gap-8 text-sm">
              <div>
                <span className="text-[#8f98a0]">最低价:</span>{" "}
                <span className="text-[#75b022] font-semibold">
                  ¥{lowest.price.toFixed(2)}
                </span>{" "}
                <span className="text-[#8f98a0]">({lowest.platform})</span>
              </div>
              <div>
                <span className="text-[#8f98a0]">价格差:</span>{" "}
                <span className="text-[#e9b04b] font-semibold">
                  ¥{spread.toFixed(2)}
                </span>
              </div>
            </div>

            <p className="text-xs text-[#67707b] mt-4 text-center">
              ⚠️ Steam Market 价格为实时数据;BUFF163 / 悠悠有品 无公开 API,价格基于市场惯例估算,仅供参考
            </p>
          </section>
        )}

        {!result && !error && !loading && (
          <p className="text-center text-xs text-[#67707b] mt-10">
            数据仅供参考,以各平台实际显示为准
          </p>
        )}
      </main>
    </div>
  );
}
