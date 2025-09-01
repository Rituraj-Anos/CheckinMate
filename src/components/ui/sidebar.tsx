"use client";
import * as React from "react";
import { PanelLeftIcon } from "lucide-react";

// Sidebar Context
type SidebarContextProps = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context)
    throw new Error("useSidebar must be used within a SidebarProvider.");
  return context;
}

function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true);
  const [openMobile, setOpenMobile] = React.useState(false);

  // Simple mobile detection
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleSidebar = () =>
    isMobile ? setOpenMobile((prev) => !prev) : setOpen((prev) => !prev);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "b" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  const state = open ? "expanded" : "collapsed";
  const contextValue: SidebarContextProps = {
    state,
    open,
    setOpen,
    openMobile,
    setOpenMobile,
    isMobile,
    toggleSidebar,
  };

  return (
    <SidebarContext.Provider value={contextValue}>
      {children}
    </SidebarContext.Provider>
  );
}

function Sidebar() {
  const { isMobile, openMobile, setOpenMobile, open } = useSidebar();
  return isMobile ? (
    openMobile ? (
      <aside
        className="fixed inset-0 z-50 bg-black/50 flex"
        onClick={() => setOpenMobile(false)}
      >
        <nav
          className="bg-white h-full w-64 shadow-2xl p-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* --- Paste your sidebar/menu content here --- */}
          <div className="font-bold mb-6">CheckinMate Menu</div>
          <ul className="space-y-4">
            <li>Dashboard</li>
            <li>Attendance Details</li>
            <li>Live Logger</li>
            <li>Add Student</li>
          </ul>
        </nav>
      </aside>
    ) : null
  ) : (
    open && (
      <nav className="fixed top-0 left-0 z-40 bg-white md:w-64 w-0 h-full shadow-xl p-4 hidden md:block">
        {/* --- Paste your sidebar/menu content here --- */}
        <div className="font-bold mb-6">CheckinMate Menu</div>
        <ul className="space-y-4">
          <li>Dashboard</li>
          <li>Attendance Details</li>
          <li>Live Logger</li>
          <li>Add Student</li>
        </ul>
      </nav>
    )
  );
}

function SidebarTrigger() {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      className="bg-white p-2 rounded-full shadow border flex items-center justify-center"
      onClick={toggleSidebar}
      aria-label="Toggle Sidebar"
    >
      <PanelLeftIcon className="h-6 w-6" />
    </button>
  );
}

export { SidebarProvider, Sidebar, SidebarTrigger, useSidebar };
