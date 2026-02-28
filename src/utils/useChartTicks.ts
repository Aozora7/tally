import { useMemo } from 'react';
import { useMediaQuery } from '@mantine/hooks';

export interface YearGroup {
  year: string;
  startIndex: number;
  endIndex: number;
}

export function useChartTicks(data: { month: string }[]) {
  const isMobile = useMediaQuery('(max-width: 768px)') ?? false;

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
    const thresholds = isMobile
      ? ([
          [12, 1],
          [24, 2],
          [48, 6],
        ] as const)
      : ([
          [24, 1],
          [48, 2],
          [120, 3],
          [180, 6],
        ] as const);
    const step = thresholds.find(([limit]) => n <= limit)?.[1] ?? 12;
    return data.filter((d) => (parseInt(d.month.substring(5, 7), 10) - 1) % step === 0).map((d) => d.month);
  }, [data, isMobile]);

  const yearTicks = useMemo(
    () => yearGroups.map((g) => data[Math.floor((g.startIndex + g.endIndex) / 2)]?.month).filter((m): m is string => !!m),
    [yearGroups, data]
  );

  return { yearGroups, monthTicks, yearTicks, isMobile };
}
