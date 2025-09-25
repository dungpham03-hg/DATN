import React, { createContext, useContext, useState } from 'react';
import './Sidebar.css';

const SidebarContext = createContext();

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export const SidebarProvider = ({ children }) => {
  const [state, setState] = useState('expanded'); // 'expanded' | 'collapsed'

  const toggle = () => {
    setState(state === 'expanded' ? 'collapsed' : 'expanded');
  };

  return (
    <SidebarContext.Provider value={{ state, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({ className = '', children, ...props }) => {
  const { state } = useSidebar();
  return (
    <aside 
      className={`sidebar ${state === 'collapsed' ? 'collapsed' : ''} ${className}`}
      {...props}
    >
      {children}
    </aside>
  );
};

export const SidebarHeader = ({ className = '', children, ...props }) => (
  <div className={`sidebar-header ${className}`} {...props}>
    {children}
  </div>
);

export const SidebarContent = ({ className = '', children, ...props }) => (
  <div className={`sidebar-content ${className}`} {...props}>
    {children}
  </div>
);

export const SidebarFooter = ({ className = '', children, ...props }) => (
  <div className={`sidebar-footer ${className}`} {...props}>
    {children}
  </div>
);

export const SidebarGroup = ({ children }) => (
  <div className="sidebar-group">{children}</div>
);

export const SidebarGroupLabel = ({ children }) => (
  <div className="sidebar-group-label">{children}</div>
);

export const SidebarGroupContent = ({ children }) => (
  <div className="sidebar-group-content">{children}</div>
);

export const SidebarMenu = ({ children }) => (
  <div className="sidebar-menu">{children}</div>
);

export const SidebarMenuItem = ({ children }) => (
  <div className="sidebar-menu-item">{children}</div>
);

export const SidebarMenuButton = ({ asChild, className = '', children, ...props }) => {
  const Component = asChild ? 'div' : 'button';
  return (
    <Component className={`sidebar-menu-button ${className}`} {...props}>
      {children}
    </Component>
  );
};

export const SidebarTrigger = ({ className = '', ...props }) => {
  const { toggle } = useSidebar();
  return (
    <button 
      className={`sidebar-trigger ${className}`}
      onClick={toggle}
      {...props}
    />
  );
}; 