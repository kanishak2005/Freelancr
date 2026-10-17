import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import clsx from "clsx";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  exact?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

interface DashboardSidebarProps {
  groups: NavGroup[];
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function DashboardSidebar({ groups, mobileOpen, onCloseMobile }: DashboardSidebarProps) {
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);

  const isActive = (item: NavItem) => {
    if (item.exact) {
      return location.pathname === item.href;
    }
    return location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
  };

  return (
    <>
      {/* Mobile Drawer Overlay & Sidebar */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 text-slate-300 transition-all duration-200 ease-in-out lg:hidden",
          mobileOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">
          <Link to="/" className="flex items-center gap-2" onClick={onCloseMobile}>
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              F
            </div>
            <span className="text-base font-bold text-white tracking-tight">Freelancr</span>
          </Link>
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          {groups.map((group) => (
            <div key={group.title}>
              <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {group.title}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(item);
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={onCloseMobile}
                      className={clsx(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        active
                          ? "bg-indigo-600 text-white shadow-sm font-semibold"
                          : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                      )}
                    >
                      <span className="w-5 h-5 flex items-center justify-center">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Desktop Collapsed-by-Default Hover-Expand Sidebar */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={clsx(
          "hidden lg:flex fixed top-0 bottom-0 left-0 z-40 flex-col bg-slate-900 text-slate-300 border-r border-slate-800 transition-[width] duration-200 ease-in-out shadow-lg",
          isHovered ? "w-64" : "w-[68px]"
        )}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center px-4 border-b border-slate-800/80 overflow-hidden">
          <Link to="/" className="flex items-center gap-3 min-w-max">
            <div className="h-9 w-9 shrink-0 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm group-hover:bg-indigo-500 transition-colors">
              F
            </div>
            <div
              className={clsx(
                "transition-opacity duration-200 whitespace-nowrap",
                isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            >
              <span className="text-base font-bold text-white tracking-tight block leading-tight">
                Freelancr
              </span>
              <span className="text-[10px] uppercase font-semibold text-indigo-400 tracking-wider">
                Workspace Engine
              </span>
            </div>
          </Link>
        </div>

        {/* Scrollable Navigation Groups */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-6">
          {groups.map((group) => (
            <div key={group.title}>
              {/* Group Title: hidden when collapsed */}
              <div
                className={clsx(
                  "px-2.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 transition-opacity duration-200 truncate",
                  isHovered ? "opacity-100 h-auto" : "opacity-0 h-0 overflow-hidden"
                )}
              >
                {group.title}
              </div>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(item);
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      title={!isHovered ? item.label : undefined}
                      className={clsx(
                        "group relative flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 overflow-hidden",
                        active
                          ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30"
                          : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-100"
                      )}
                    >
                      {/* Active Indicator bar */}
                      {active && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-white" />
                      )}

                      {/* Icon */}
                      <span className="shrink-0 w-5 h-5 flex items-center justify-center text-slate-300 group-hover:text-white transition-colors">
                        {item.icon}
                      </span>

                      {/* Label */}
                      <span
                        className={clsx(
                          "whitespace-nowrap transition-opacity duration-200",
                          isHovered ? "opacity-100" : "opacity-0 pointer-events-none w-0"
                        )}
                      >
                        {item.label}
                      </span>

                      {/* Badge if present */}
                      {item.badge && isHovered && (
                        <span className="ml-auto text-[10px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded-md font-semibold">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info area */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 overflow-hidden">
          <div className="flex items-center gap-3 min-w-max">
            <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 ml-1.5" />
            <div
              className={clsx(
                "text-xs transition-opacity duration-200 whitespace-nowrap text-slate-400",
                isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            >
              <span>Platform Connected</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
