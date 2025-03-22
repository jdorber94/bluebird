'use client';

import DateRangeFilter from './ui/DateRangeFilter';

interface DashboardDateFilterProps {
  onFilterChange: (month: string, year: number) => void;
}

const DashboardDateFilter = ({ onFilterChange }: DashboardDateFilterProps) => {
  return (
    <div className="flex flex-col gap-2 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-700">Time Period</h2>
        <div className="text-xs text-gray-500">
          Showing data for selected period
        </div>
      </div>
      <DateRangeFilter onFilterChange={onFilterChange} />
    </div>
  );
};

export default DashboardDateFilter; 