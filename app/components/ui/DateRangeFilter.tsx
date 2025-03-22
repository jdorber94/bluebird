'use client';

import { useState } from 'react';

interface DateRangeFilterProps {
  onFilterChange: (month: string, year: number) => void;
  className?: string;
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DateRangeFilter = ({ onFilterChange, className = '' }: DateRangeFilterProps) => {
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];
  const currentMonth = months[new Date().getMonth()];

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(e.target.value);
    onFilterChange(e.target.value, selectedYear);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = parseInt(e.target.value);
    setSelectedYear(year);
    onFilterChange(selectedMonth, year);
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative min-w-[140px]">
        <select
          value={selectedMonth}
          onChange={handleMonthChange}
          className="w-full px-4 py-2 text-sm rounded-lg border border-gray-200 bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
        >
          {months.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
          ▼
        </div>
      </div>

      <div className="relative min-w-[100px]">
        <select
          value={selectedYear}
          onChange={handleYearChange}
          className="w-full px-4 py-2 text-sm rounded-lg border border-gray-200 bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
          ▼
        </div>
      </div>
    </div>
  );
};

export default DateRangeFilter; 