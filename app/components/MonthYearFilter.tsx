import React, { useState } from 'react';

interface MonthYearFilterProps {
  onFilterChange: (month: string, year: number) => void;
}

const MonthYearFilter: React.FC<MonthYearFilterProps> = ({ onFilterChange }) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];
  const currentMonth = months[new Date().getMonth()];

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [isYearOpen, setIsYearOpen] = useState(false);

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
    <div className="filter-container" style={{
      display: 'flex',
      gap: '1rem',
      padding: '1.25rem',
      alignItems: 'center',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      border: '1px solid rgba(0, 0, 0, 0.08)',
      position: 'relative',
      maxWidth: 'fit-content'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          position: 'relative',
          minWidth: '140px'
        }}>
          <select 
            value={selectedMonth}
            onChange={handleMonthChange}
            onFocus={() => setIsMonthOpen(true)}
            onBlur={() => setIsMonthOpen(false)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              paddingRight: '2.5rem',
              fontSize: '0.9375rem',
              borderRadius: '8px',
              border: '1px solid rgba(0, 0, 0, 0.12)',
              backgroundColor: 'white',
              cursor: 'pointer',
              appearance: 'none',
              color: '#1a1a1a',
              transition: 'all 0.2s ease',
              outline: 'none',
              ...(isMonthOpen && {
                borderColor: '#2563eb',
                boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)'
              })
            }}
          >
            {months.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
          <div style={{
            position: 'absolute',
            right: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: '#666'
          }}>
            ▼
          </div>
        </div>

        <div style={{
          position: 'relative',
          minWidth: '100px'
        }}>
          <select
            value={selectedYear}
            onChange={handleYearChange}
            onFocus={() => setIsYearOpen(true)}
            onBlur={() => setIsYearOpen(false)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              paddingRight: '2.5rem',
              fontSize: '0.9375rem',
              borderRadius: '8px',
              border: '1px solid rgba(0, 0, 0, 0.12)',
              backgroundColor: 'white',
              cursor: 'pointer',
              appearance: 'none',
              color: '#1a1a1a',
              transition: 'all 0.2s ease',
              outline: 'none',
              ...(isYearOpen && {
                borderColor: '#2563eb',
                boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)'
              })
            }}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <div style={{
            position: 'absolute',
            right: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: '#666'
          }}>
            ▼
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthYearFilter; 