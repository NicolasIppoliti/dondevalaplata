/** Normalized shape both the SVG chart and its companion table render from. */
export interface ChartPoint {
  period: string;
  value: number;
}

export interface ChartSeriesData {
  id: string;
  label: string;
  points: ChartPoint[];
}
