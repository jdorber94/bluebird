'use client';

import { useState } from 'react';
import { ChevronDownIcon } from '@radix-ui/react-icons';

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

  const selectClassName = "appearance-none bg-transparent pl-3 pr-8 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-md cursor-pointer";
  const wrapperClassName = "relative inline-block border border-gray-200 rounded-md hover:border-gray-300 transition-colors duration-200";

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className={wrapperClassName}>
        <select
          value={selectedMonth}
          onChange={handleMonthChange}
          className={selectClassName}
        >
          {months.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
      </div>

      <div className={wrapperClassName}>
        <select
          value={selectedYear}
          onChange={handleYearChange}
          className={selectClassName}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
      </div>
    </div>
  );
};

export default DateRangeFilter; 