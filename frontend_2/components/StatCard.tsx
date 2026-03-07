'use client';

import { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: number; // percentage change
  highlighted?: boolean;
}

export function StatCard({
  icon,
  label,
  value,
  sublabel,
  trend,
  highlighted,
}: StatCardProps) {
  return (
    <div
      className={`p-6 rounded-lg border transition-all duration-300 ${
        highlighted
          ? 'bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30 shadow-md'
          : 'bg-card border-border hover:border-primary/50'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-lg bg-primary/10">
          <div className="text-primary">{icon}</div>
        </div>
        {trend && (
          <div
            className={`text-sm font-semibold px-2 py-1 rounded ${
              trend > 0
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {trend > 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>
      <p className="text-muted-foreground text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-foreground mb-1">{value}</p>
      {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
    </div>
  );
}
