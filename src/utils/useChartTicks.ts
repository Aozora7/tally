import { useMemo } from 'react';

export interface YearGroup {
  year: string;
  startIndex: number;
  endIndex: number;
}

export function useChartTicks(data: { month: string }[]) {
  const yearGroups = useMemo(() => {
    if (data.length === 0) return [] as YearGroup[];
    const groups: YearGroup[] = [];
    let currentYear = '';
    data.forEach((item, idx) => {
      const year = item.month.substring(0, 4);
      if (year !== currentYear) {
        groups.push({ year, startIndex: idx, endIndex: idx });
        currentYear = year;
      } else if (groups.length > 0) {
        groups[groups.length - 1]!.endIndex = idx;
      }
    });
    return groups;
  }, [data]);

  const monthTicks = useMemo(() => {
    const n = data.length;
    const step = n <= 24 ? 1 : n <= 48 ? 2 : n <= 120 ? 3 : n <= 180 ? 6 : 12;
    return data.filter((d) => (parseInt(d.month.substring(5, 7), 10) - 1) % step === 0).map((d) => d.month);
  }, [data]);

  const yearTicks = useMemo(
    () => yearGroups.map((g) => data[Math.floor((g.startIndex + g.endIndex) / 2)]?.month).filter((m): m is string => !!m),
    [yearGroups, data]
  );

  return { yearGroups, monthTicks, yearTicks };
}
