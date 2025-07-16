import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  gradient?: boolean;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  gradient = false,
  hover = true
}) => {
  const paddings = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const baseClasses = `rounded-2xl shadow-lg border transition-all duration-300 ${
    hover ? 'hover:shadow-2xl hover:-translate-y-1' : ''
  }`;

  const backgroundClasses = gradient
    ? 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-gray-200/50 dark:border-gray-700/50'
    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
  return (
    <div className={`${baseClasses} ${backgroundClasses} ${paddings[padding]} ${className}`}>
      {children}
    </div>
  );
};