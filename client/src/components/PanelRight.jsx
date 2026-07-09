import React from 'react';
import './PanelRight.css';

export function PanelRight({ animateOnHover, className = '', size = 20, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`animate-panel-right ${animateOnHover ? 'animate-hover' : ''} ${className}`}
      {...props}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" className="panel-rect" />
      <path d="M15 3v18" className="panel-line" />
    </svg>
  );
}

export function AnimateIcon({ animateOnHover, children, className = '', ...props }) {
  return (
    <span className={`animate-icon-wrapper ${animateOnHover ? 'animate-hover' : ''} ${className}`} {...props}>
      {children}
    </span>
  );
}
