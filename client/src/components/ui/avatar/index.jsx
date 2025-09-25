import React from 'react';
import './Avatar.css';

export const Avatar = ({ className = '', children, ...props }) => {
  return (
    <div className={`avatar ${className}`} {...props}>
      {children}
    </div>
  );
};

export const AvatarImage = ({ src, alt = '', className = '', ...props }) => {
  return (
    <img
      src={src}
      alt={alt}
      className={`avatar-image ${className}`}
      {...props}
    />
  );
};

export const AvatarFallback = ({ className = '', children, ...props }) => {
  return (
    <div className={`avatar-fallback ${className}`} {...props}>
      {children}
    </div>
  );
}; 