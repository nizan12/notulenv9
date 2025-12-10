
import React from 'react';

// --- Donut Chart ---

interface DonutData {
  label: string;
  value: number;
  color: string;
}

export const DonutChart: React.FC<{ data: DonutData[], title?: string }> = ({ data, title }) => {
  const total = data.reduce((acc, cur) => acc + cur.value, 0);
  let cumulativePercent = 0;

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  if (total === 0) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center h-full min-h-[300px] w-full">
        {title && <h3 className="text-lg font-bold text-slate-900 mb-6 self-start">{title}</h3>}
        <div className="flex-1 flex items-center justify-center">
           <p className="text-slate-400">Belum ada data untuk ditampilkan</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full w-full">
      {title && <h3 className="text-lg font-bold text-slate-900 mb-6 shrink-0">{title}</h3>}
      
      <div className="flex flex-col sm:flex-row items-center justify-center gap-8 flex-1">
        {/* SVG Chart */}
        <div className="relative w-40 h-40 sm:w-48 sm:h-48 shrink-0">
          <svg viewBox="-1 -1 2 2" className="transform -rotate-90 w-full h-full">
            {data.map((slice, i) => {
              if (slice.value === 0) return null;
              
              const startPercent = cumulativePercent;
              const slicePercent = slice.value / total;
              cumulativePercent += slicePercent;
              const endPercent = cumulativePercent;

              // If singular slice (100%), draw circle
              if (slicePercent === 1) {
                return (
                  <circle key={i} cx="0" cy="0" r="0.8" fill="none" stroke={slice.color} strokeWidth="0.4" />
                );
              }

              const [startX, startY] = getCoordinatesForPercent(startPercent);
              const [endX, endY] = getCoordinatesForPercent(endPercent);
              const largeArcFlag = slicePercent > 0.5 ? 1 : 0;

              const pathData = [
                `M ${startX} ${startY}`, // Move
                `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, // Arc
                `L 0 0`, // Line to center
              ].join(' ');

              return (
                <path
                  key={i}
                  d={pathData}
                  fill={slice.color}
                  className="transition-all duration-300 hover:opacity-90"
                />
              );
            })}
             {/* Inner White Circle to make it a Donut */}
             <circle cx="0" cy="0" r="0.6" fill="white" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
            <span className="text-xl sm:text-2xl font-bold text-slate-800">{total}</span>
            <span className="text-[10px] sm:text-xs text-slate-500 uppercase">Total</span>
          </div>
        </div>

        {/* Legend */}
        <div className="w-full space-y-3 pr-1">
          {data.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                <span className="text-slate-600 truncate" title={item.label}>{item.label}</span>
              </div>
              <span className="font-semibold text-slate-900 ml-2 shrink-0">{item.value} ({Math.round((item.value/total)*100)}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


// --- Bar Chart (Refactored to Horizontal List) ---

interface BarData {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarData[];
  title?: string;
  color?: string;
  headerAction?: React.ReactNode;
}

export const BarChart: React.FC<BarChartProps> = ({ data, title, color = "bg-primary", headerAction }) => {
  // 1. Sort data descending (Highest first) for better readability
  const sortedData = [...data].sort((a, b) => b.value - a.value);
  
  // 2. Find max value for percentage calculation
  const maxValue = Math.max(...data.map(d => d.value), 1); 

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full w-full max-h-[500px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4 shrink-0">
        {title && <h3 className="text-lg font-bold text-slate-900">{title}</h3>}
        {headerAction && <div className="flex items-center gap-2">{headerAction}</div>}
      </div>
      
      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center min-h-[200px]">
           <p className="text-slate-400">Belum ada data statistik</p>
        </div>
      ) : (
        <div className="flex-1 w-full overflow-y-auto pr-2 custom-scrollbar">
           <div className="space-y-4">
              {sortedData.map((item, index) => {
                 const percentage = (item.value / maxValue) * 100;
                 return (
                    <div key={index} className="w-full">
                       <div className="flex justify-between items-end mb-1">
                          <span className="text-sm font-medium text-slate-700 truncate pr-2 max-w-[70%]" title={item.label}>
                             {index + 1}. {item.label}
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                             {item.value} Rapat
                          </span>
                       </div>
                       <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                          <div 
                             className={`h-full rounded-full ${color} transition-all duration-700 ease-out`}
                             style={{ width: `${percentage}%` }}
                          ></div>
                       </div>
                    </div>
                 );
              })}
           </div>
        </div>
      )}
    </div>
  );
};
