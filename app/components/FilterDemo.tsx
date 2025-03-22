import React from 'react';
import MonthYearFilter from './MonthYearFilter';

const FilterDemo: React.FC = () => {
  const handleFilterChange = (month: string, year: number) => {
    console.log(`Filter changed: ${month} ${year}`);
    // Here you would typically:
    // 1. Make an API call to fetch data for the selected month/year
    // 2. Update some state with the fetched data
    // 3. Re-render a data grid or chart with the new data
  };

  return (
    <div style={{ 
      padding: '2rem',
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        marginBottom: '2.5rem',
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        paddingBottom: '1.5rem'
      }}>
        <h1 style={{ 
          fontSize: '1.875rem',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '0.75rem'
        }}>
          Analytics Dashboard
        </h1>
        <p style={{
          fontSize: '1rem',
          color: '#6B7280',
          maxWidth: '600px',
          lineHeight: '1.5'
        }}>
          Select a month and year to view your analytics data. The dashboard will automatically update to show the relevant metrics.
        </p>
      </div>

      <div style={{
        backgroundColor: '#F9FAFB',
        padding: '1.5rem',
        borderRadius: '16px',
        border: '1px solid rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{
          marginBottom: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            Time Period
          </h2>
          <MonthYearFilter onFilterChange={handleFilterChange} />
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#6B7280',
            fontSize: '0.875rem'
          }}>
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 16 16" 
              fill="none" 
              style={{ flexShrink: 0 }}
            >
              <path 
                d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm1-3H7v-2h2v2zm0-3H7V4h2v6z" 
                fill="currentColor"
              />
            </svg>
            <p>Selected data will appear here. Check the console for filter change events.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterDemo; 