import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  borderColor?: 'green' | 'blue' | 'red' | 'none';
}

export function Card({ children, className = '', borderColor = 'none' }: CardProps) {
  const borders = {
    none: "",
    green: "border-t-4 border-green-500",
    blue: "border-t-4 border-blue-500",
    red: "border-t-4 border-red-500"
  };

  return (
    <div className={`bg-white p-6 rounded shadow-md ${borders[borderColor]} ${className}`}>
      {children}
    </div>
  );
}