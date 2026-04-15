"use client";

import React, { useCallback, useEffect, useState } from "react";
import { getAccessToken } from "../../../lib/authUtils";

type LogLevel = "error" | "warn" | "info" | "debug";
type LogSource = "server" | "client";

interface LogRow {
  id: string;
  ts: string;
  level: string;
  source: string;
  code: string | null;
  message: string;
  context: Record<string, unknown> | null;
  user_id: string | null;
  academy_id: string | null;
  request_id: string | null;
  user_agent: string | null;
  url: string | null;
  stack: string | null;
}

interface LogsResponse {
  items: LogRow[];
  total: number;
  limit: number;
  offset: number;
}

const LEVEL_BADGE: Record<string, string> = {
  error: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  warn: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  debug: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
};

function formatTs(ts: string): string {
  return new Date(ts).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

function LevelBadge({ level }: { level: string }) {
  const cls = LEVEL_BADGE[level] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {level}
    </span>
  );
}

interface DetailModalProps {
  log: LogRow;
  onClose: () => void;
}

function DetailModal({ log, onClose }: DetailModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <LevelBadge level={log.level} />
            <span className="text-sm text-gray-500 dark:text-gray-400">{log.source}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 flex flex-col gap-4">
          {/* Timestamp */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">시각</p>
            <p className="text-sm text-gray-800 dark:text-gray-200">{formatTs(log.ts)}</p>
          </div>

          {/* Code */}
          {log.code && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">코드</p>
              <p className="text-sm font-mono text-gray-800 dark:text-gray-200">{log.code}</p>
            </div>
          )}

          {/* Message */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">메시지</p>
            <p className="text-sm text-gray-800 dark:text-gray-200 break-words">{log.message}</p>
          </div>

          {/* Context */}
          {log.context && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">컨텍스트</p>
              <pre className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words text-gray-700 dark:text-gray-300">
                {JSON.stringify(log.context, null, 2)}
              </pre>
            </div>
          )}

          {/* Stack */}
          {log.stack && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">스택 트레이스</p>
              <pre className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 overflow-x-auto max-h-64 whitespace-pre-wrap break-words text-gray-700 dark:text-gray-300">
                {log.stack}
              </pre>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3">
            {log.user_id && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">User ID</p>
                <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">{log.user_id}</p>
              </div>
            )}
            {log.academy_id && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Academy ID</p>
                <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">{log.academy_id}</p>
              </div>
            )}
            {log.request_id && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Request ID</p>
                <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">{log.request_id}</p>
              </div>
            )}
            {log.url && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">URL</p>
                <p className="text-xs text-gray-700 dark:text-gray-300 break-all">{log.url}</p>
              </div>
            )}
            {log.user_agent && (
              <div className="col-span-2">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">User Agent</p>
                <p className="text-xs text-gray-700 dark:text-gray-300 break-all">{log.user_agent}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const ALL_LEVELS: LogLevel[] = ["error", "warn", "info", "debug"];
const ALL_SOURCES: LogSource[] = ["server", "client"];
const LIMIT_OPTIONS = [50, 100, 200] as const;

export default function AdminLogsPage() {
  const [selectedLevels, setSelectedLevels] = useState<LogLevel[]>(["error", "warn"]);
  const [selectedSources, setSelectedSources] = useState<LogSource[]>([]);
  const [codeFilter, setCodeFilter] = useState("");
  const [messageFilter, setMessageFilter] = useState("");
  const [academyIdFilter, setAcademyIdFilter] = useState("");
  const [limit, setLimit] = useState<50 | 100 | 200>(50);
  const [offset, setOffset] = useState(0);

  const [items, setItems] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<LogRow | null>(null);

  const fetchLogs = useCallback(async (currentOffset: number) => {
    setLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      // layout guarantees token exists, but guard just in case
      if (!token) {
        setError("인증 토큰을 가져올 수 없습니다.");
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (selectedLevels.length > 0) {
        params.set("level", selectedLevels.join(","));
      }
      if (selectedSources.length > 0) {
        params.set("source", selectedSources.join(","));
      }
      if (codeFilter) params.set("code", codeFilter);
      if (messageFilter) params.set("q", messageFilter);
      if (academyIdFilter) params.set("academyId", academyIdFilter);
      params.set("limit", String(limit));
      params.set("offset", String(currentOffset));

      const res = await fetch(`/api/admin/logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(`API 오류 (${res.status}): ${body?.error ?? "알 수 없는 오류"}`);
        return;
      }

      const data: LogsResponse = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [selectedLevels, selectedSources, codeFilter, messageFilter, academyIdFilter, limit]);

  // 필터 변경 시 offset 리셋 (offset 자체는 deps에서 제외)
  useEffect(() => {
    setOffset(0);
  }, [selectedLevels, selectedSources, codeFilter, messageFilter, academyIdFilter, limit]);

  // offset 변경 시 fetch (필터 변경 → setOffset(0) → 이 effect 실행)
  useEffect(() => {
    void fetchLogs(offset);
  }, [offset, fetchLogs]);

  function toggleLevel(level: LogLevel) {
    setSelectedLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
    // setOffset(0)은 위 필터 useEffect에서 담당
  }

  function toggleSource(source: LogSource) {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
    // setOffset(0)은 위 필터 useEffect에서 담당
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">로그 뷰어</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">개발자 전용</p>
        </div>
        <button
          onClick={() => fetchLogs(offset)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
        >
          <svg
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          새로고침
        </button>
      </header>

      {/* Filter bar */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm px-6 py-3">
        <div className="flex flex-wrap items-center gap-4">
          {/* Level checkboxes */}
          <fieldset>
            <legend className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">레벨</legend>
            <div className="flex items-center gap-3">
              {ALL_LEVELS.map((level) => (
                <label key={level} className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedLevels.includes(level)}
                    onChange={() => toggleLevel(level)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <LevelBadge level={level} />
                </label>
              ))}
            </div>
          </fieldset>

          {/* Source checkboxes */}
          <fieldset>
            <legend className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">소스</legend>
            <div className="flex items-center gap-3">
              {ALL_SOURCES.map((source) => (
                <label key={source} className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedSources.includes(source)}
                    onChange={() => toggleSource(source)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{source}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Code search */}
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">코드</label>
            <input
              type="text"
              value={codeFilter}
              onChange={(e) => { setCodeFilter(e.target.value); setOffset(0); }}
              placeholder="예: VALIDATION_FAILED"
              className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
            />
          </div>

          {/* Message search */}
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">메시지</label>
            <input
              type="text"
              value={messageFilter}
              onChange={(e) => { setMessageFilter(e.target.value); setOffset(0); }}
              placeholder="메시지 검색"
              className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
            />
          </div>

          {/* Academy ID */}
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Academy ID</label>
            <input
              type="text"
              value={academyIdFilter}
              onChange={(e) => { setAcademyIdFilter(e.target.value); setOffset(0); }}
              placeholder="선택"
              className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
            />
          </div>

          {/* Limit select */}
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">표시 수</label>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value) as 50 | 100 | 200); setOffset(0); }}
              className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LIMIT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}개</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="px-6 py-4">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Total count */}
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                총 <span className="font-semibold text-gray-800 dark:text-gray-200">{total.toLocaleString()}</span>건
              </p>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">시각</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">레벨</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">소스</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">코드</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-full">메시지</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                          로그가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      items.map((log) => (
                        <tr
                          key={log.id}
                          onClick={() => setSelectedLog(log)}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {formatTs(log.ts)}
                          </td>
                          <td className="px-4 py-3">
                            <LevelBadge level={log.level} />
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {log.source}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[160px] truncate">
                            {log.code ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200 max-w-[400px] truncate">
                            {log.message}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {total > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  페이지 <span className="font-semibold text-gray-800 dark:text-gray-200">{currentPage}</span> / {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    이전
                  </button>
                  <button
                    onClick={() => setOffset(offset + limit)}
                    disabled={offset + limit >= total}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    다음
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Detail modal */}
      {selectedLog && (
        <DetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}
