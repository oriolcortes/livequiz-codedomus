import { Card } from "@/components/ui/Card";
import type { RankingEntry } from "@/src/lib/realtime/events";

export function RankingList({ entries, limit }: { entries: RankingEntry[]; limit?: number }) {
  const visibleEntries = typeof limit === "number" ? entries.slice(0, limit) : entries;

  return (
    <Card>
      <h2 className="text-xl font-black">Rànquing</h2>
      <div className="mt-4 grid gap-2">
        {visibleEntries.map((entry, index) => (
          <div key={entry.studentId} className="flex justify-between rounded-2xl bg-white p-3 ring-1 ring-slate-100">
            <span className="font-semibold">#{index + 1} {entry.nickname}</span>
            <span className="font-black text-brand-600">{entry.score}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
