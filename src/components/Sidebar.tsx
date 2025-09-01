"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PanelLeftClose, PanelLeftOpen, ChevronLeft } from "lucide-react";

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className = "" }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  useEffect(() => {
    const savedCollapsed = localStorage.getItem("sidebar-collapsed");
    const savedSection = localStorage.getItem("sidebar-active-section");
    if (savedCollapsed !== null) {
      setIsCollapsed(JSON.parse(savedCollapsed));
    }
    if (savedSection) {
      setActiveSection(savedSection);
    }
  }, []);

  const toggleCollapsed = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newCollapsed));
  };

  const handleNavClick = (section: string) => {
    setActiveSection(section);
    localStorage.setItem("sidebar-active-section", section);
    // Emit custom event for parent components to listen to
    const event = new CustomEvent("sidebar-navigation", {
      detail: { section },
    });
    window.dispatchEvent(event);
    window.location.hash = section;
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "attendance", label: "Attendance Details", icon: "📝" },
    { id: "logger", label: "Live Logger", icon: "🔴" },
    { id: "students", label: "Add Student", icon: "👤" },
  ];

  const profileMenuItems = [
    { label: "Profile", action: () => console.log("Profile clicked") },
    { label: "Settings", action: () => console.log("Settings clicked") },
    { label: "Sign out", action: () => console.log("Sign out clicked") },
  ];

  return (
    <Card
      className={`
        ${className}
        h-screen bg-sidebar border-sidebar-border shadow-lg rounded-r-lg rounded-l-none
        flex flex-col transition-all duration-300 ease-in-out
        ${isCollapsed ? "w-20" : "w-64"}
      `}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Brand Row */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div className="flex items-center space-x-3 min-w-0">
          <div
            className="text-2xl flex-shrink-0"
            role="img"
            aria-label="CheckinMate logo"
          >
            🔐
          </div>
          {!isCollapsed && (
            <h1 className="font-display font-bold text-lg text-sidebar-primary truncate">
              CheckinMate
            </h1>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapsed}
          className="flex-shrink-0 h-8 w-8 p-0 hover:bg-sidebar-accent"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-4 w-4 text-sidebar-foreground" />
          ) : (
            <PanelLeftClose className="h-4 w-4 text-sidebar-foreground" />
          )}
        </Button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-2" role="list">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            className={`
              w-full flex items-center space-x-3 p-3 mb-1 rounded-lg text-left
              transition-all duration-200 ease-in-out
              hover:bg-sidebar-accent focus:outline-none focus:ring-2 focus:ring-sidebar-ring
              ${
                activeSection === item.id
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:text-sidebar-primary"
              }
            `}
            role="listitem"
            aria-current={activeSection === item.id ? "page" : undefined}
          >
            <span
              className="text-lg flex-shrink-0"
              role="img"
              aria-hidden="true"
            >
              {item.icon}
            </span>
            {!isCollapsed && (
              <span className="font-medium truncate">{item.label}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Profile Card */}
      <div className="p-4 border-t border-sidebar-border">
        <Popover open={isProfileMenuOpen} onOpenChange={setIsProfileMenuOpen}>
          <PopoverTrigger asChild>
            <button
              className={`
                w-full flex items-center space-x-3 p-3 rounded-lg text-left
                transition-all duration-200 ease-in-out
                hover:bg-sidebar-accent focus:outline-none focus:ring-2 focus:ring-sidebar-ring
                ${isCollapsed ? "justify-center" : ""}
              `}
              aria-label="User menu"
              aria-expanded={isProfileMenuOpen}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src="/api/placeholder/32/32" alt="Admin User" />
                <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                  AU
                </AvatarFallback>
              </Avatar>

              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sidebar-primary truncate">
                    Admin User
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    Team Manager
                  </div>
                </div>
              )}

              {!isCollapsed && (
                <ChevronLeft
                  className={`h-4 w-4 text-sidebar-foreground transition-transform duration-200 ${
                    isProfileMenuOpen ? "rotate-90" : "-rotate-90"
                  }`}
                />
              )}
            </button>
          </PopoverTrigger>

          <PopoverContent
            className="w-56 p-2"
            align={isCollapsed ? "end" : "start"}
            side="top"
          >
            <div className="space-y-1">
              {profileMenuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    item.action();
                    setIsProfileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors duration-150"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </Card>
  );
};

export default Sidebar;
