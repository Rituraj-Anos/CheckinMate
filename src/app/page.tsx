"use client";

import { useState, useEffect } from "react";
import { SidebarProvider, Sidebar, SidebarTrigger } from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import DashboardSection from "@/components/ui/DashboardSection";
import AttendanceSection from "@/components/ui/AttendanceSection";
import LoggerSection from "@/components/ui/LoggerSection";
import StudentsSection from "@/components/StudentsSection";
import Footer from "@/components/Footer";

export default function Page() {
  const [activeSection, setActiveSection] = useState("dashboard");

  useEffect(() => {
    const handleSidebarNavigation = (event: CustomEvent) => {
      setActiveSection(event.detail.section);
    };

    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (["dashboard", "attendance", "logger", "students"].includes(hash)) {
        setActiveSection(hash);
      }
    };

    if (typeof window !== "undefined") {
      const initialHash = window.location.hash.slice(1);
      if (
        ["dashboard", "attendance", "logger", "students"].includes(initialHash)
      ) {
        setActiveSection(initialHash);
      }
    }

    window.addEventListener(
      "sidebar-navigation",
      handleSidebarNavigation as EventListener
    );
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener(
        "sidebar-navigation",
        handleSidebarNavigation as EventListener
      );
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const renderActiveSection = () => {
    switch (activeSection) {
      case "attendance":
        return <AttendanceSection />;
      case "logger":
        return <LoggerSection />;
      case "students":
        return <StudentsSection />;
      default:
        return <DashboardSection />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex">
        {/* Hamburger trigger for mobile */}
        <div className="md:hidden fixed top-2 left-2 z-[100]">
          <SidebarTrigger />
        </div>

        {/* Sidebar (responsive) */}
        <Sidebar />

        {/* Main content */}
        <div className="flex-1 flex flex-col md:ml-64 min-h-screen">
          <TopHeader />
          <main className="flex-1 px-4 md:px-6 lg:px-8 py-6">
            <div className="max-w-7xl mx-auto">{renderActiveSection()}</div>
          </main>
          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
}
