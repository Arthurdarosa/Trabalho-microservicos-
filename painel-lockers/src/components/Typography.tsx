import type { ReactNode } from 'react';

export function Title({ children }: { children: ReactNode }) {
  return <h1 className="text-3xl font-bold text-gray-800 mb-8">{children}</h1>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-xl font-semibold mb-4 border-b pb-2 text-gray-800">{children}</h2>;
}