"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SunMoon, Menu } from "lucide-react";

interface TopHeaderProps {
  className?: string;
  isMobile?: boolean;
  onMenuClick?: () => void;
}

export default function TopHeader({
  className,
  isMobile = false,
  onMenuClick,
}: TopHeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentSection, setCurrentSection] = useState("Dashboard");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme") as
        | "light"
        | "dark"
        | null;
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      const initialTheme = savedTheme || (prefersDark ? "dark" : "light");

      setTheme(initialTheme);
      document.documentElement.classList.toggle(
        "dark",
        initialTheme === "dark"
      );
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleNavigationChange = (event: CustomEvent) => {
      setCurrentSection(event.detail.section || "Dashboard");
    };

    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      switch (hash) {
        case "dashboard":
          setCurrentSection("Dashboard");
          break;
        case "attendance":
          setCurrentSection("Attendance Details");
          break;
        case "logger":
          setCurrentSection("Live Logger");
          break;
        case "students":
          setCurrentSection("Add/Edit Students");
          break;
        default:
          setCurrentSection("Dashboard");
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener(
        "navigation-change" as any,
        handleNavigationChange
      );
      window.addEventListener("hashchange", handleHashChange);

      handleHashChange();
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "navigation-change" as any,
          handleNavigationChange
        );
        window.removeEventListener("hashchange", handleHashChange);
      }
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);

    if (typeof window !== "undefined") {
      document.documentElement.classList.toggle("dark", newTheme === "dark");
      localStorage.setItem("theme", newTheme);

      window.dispatchEvent(
        new CustomEvent("theme-change", {
          detail: { theme: newTheme },
        })
      );
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <header
      className={`
        sticky top-0 z-50 h-16 w-full
        bg-card/95 backdrop-blur-md border-b border-border/50
        flex items-center px-4 md:px-6
        transition-all duration-200 ease-out
        ${className || ""}
      `}
    >
      {/* Mobile hamburger button to left */}
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="mr-2 p-2 rounded-full bg-white shadow"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      )}

      {/* Section Title */}
      <div className="flex-1">
        <h1
          className="
            text-lg font-semibold text-foreground font-display
            transition-all duration-200 ease-out
            animate-in fade-in slide-in-from-top-1
          "
          key={currentSection}
        >
          {currentSection}
        </h1>
      </div>

      {/* Right: Clock, Date & Theme Toggle */}
      <div className="flex items-center gap-4">
        <div className="text-right select-none">
          <div className="text-sm font-mono font-medium text-foreground">
            {formatTime(currentTime)}
          </div>
          <div className="text-xs text-muted-foreground font-medium">
            {formatDate(currentTime)}
          </div>
        </div>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="
            h-9 w-9 p-0
            hover:bg-accent/50
            transition-all duration-200 ease-out
          "
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
        >
          <SunMoon
            className={`
              h-4 w-4 transition-all duration-200 ease-out
              ${theme === "dark" ? "rotate-180" : "rotate-0"}
            `}
          />
        </Button>
      </div>
    </header>
  );
}
