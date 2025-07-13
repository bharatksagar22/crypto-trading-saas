import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Settings, 
  BarChart3, 
  Brain,
  Users,
  Gift,
  FileText,
  Activity,
  TestTube,
  X
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user, isAdmin } = useAuth();

  const userNavItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Trading Dashboard',
      href: '/trading-dashboard',
      icon: Activity,
    },
    {
      name: 'Trading',
      href: '/trading',
      icon: TrendingUp,
    },
    {
      name: 'AI Strategies',
      href: '/strategies',
      icon: Brain,
    },
    {
      name: 'Backtest Engine',
      href: '/backtest',
      icon: TestTube,
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: BarChart3,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ];

  const adminNavItems = [
    {
      name: 'Admin Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: Users,
    },
    {
      name: 'Coupons',
      href: '/admin/coupons',
      icon: Gift,
    },
    {
      name: 'Logs',
      href: '/admin/logs',
      icon: FileText,
    },
  ];

  const navItems = isAdmin ? [...userNavItems, ...adminNavItems] : userNavItems;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              Trading
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.subscriptionPlan?.toUpperCase() || 'FREE'} Plan
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            <p>AI Crypto Trading v1.0</p>
            <p className="mt-1">© 2024 All rights reserved</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;

