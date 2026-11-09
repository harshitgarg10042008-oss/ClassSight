'use client';

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <article className={`ui-card ${className}`} {...props}>
      {children}
    </article>
  );
}
