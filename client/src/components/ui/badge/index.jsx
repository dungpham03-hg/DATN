import React from 'react';
import './Badge.css';

export const Badge = ({ children, className = '', ...props }) => {
  return (
    <span className={`badge ${className}`} {...props}>
      {children}
    </span>
  );
}; 