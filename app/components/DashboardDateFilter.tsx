'use client';

import DateRangeFilter from './ui/DateRangeFilter';

interface DashboardDateFilterProps {
  onFilterChange: (month: string, year: number) => void;
}

const DashboardDateFilter = ({ onFilterChange }: DashboardDateFilterProps) => {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-medium text-gray-700">Filter Demos</h2>
        <DateRangeFilter onFilterChange={onFilterChange} />
      </div>
      <div className="text-xs text-gray-500">
        Showing data for selected period
      </div>
    </div>
  );
};

export default DashboardDateFilter; 