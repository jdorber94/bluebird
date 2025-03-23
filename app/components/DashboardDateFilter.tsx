'use client';

import DateRangeFilter from './ui/DateRangeFilter';

interface DashboardDateFilterProps {
  onFilterChange: (month: string, year: number) => void;
}

const DashboardDateFilter = ({ onFilterChange }: DashboardDateFilterProps) => {
  return (
    <div className="flex items-center space-x-4 bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-4 py-2 border-r border-gray-200">
        <h2 className="text-sm font-medium text-gray-700">Filter Demos</h2>
      </div>
      <div className="pr-4">
        <DateRangeFilter onFilterChange={onFilterChange} />
      </div>
    </div>
  );
};

export default DashboardDateFilter; 