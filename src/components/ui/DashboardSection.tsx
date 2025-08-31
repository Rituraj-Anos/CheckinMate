"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  ChartArea,
  ChartBar,
  ChartColumn,
  ChartPie,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  LineController,
  BarController,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  LineController,
  BarController,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface DashboardData {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  lateArrivals: number;
  weeklyTrend: number[];
  classCounts: { [key: string]: number };
  recentActivity: Array<{
    id: string;
    name: string;
    action: string;
    timestamp: Date;
    avatar?: string;
  }>;
  leaderboard: Array<{
    id: string;
    name: string;
    checkinCount: number;
    avatar?: string;
  }>;
}

const mockData: DashboardData = {
  totalStudents: 156,
  presentToday: 142,
  absentToday: 14,
  lateArrivals: 8,
  weeklyTrend: [120, 135, 128, 145, 142, 138, 142],
  classCounts: {
    "Grade 9": 45,
    "Grade 10": 38,
    "Grade 11": 32,
    "Grade 12": 27,
  },
  recentActivity: [
    {
      id: "1",
      name: "Sarah Johnson",
      action: "Checked in",
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      avatar: "SJ",
    },
    {
      id: "2",
      name: "Mike Chen",
      action: "Marked late",
      timestamp: new Date(Date.now() - 12 * 60 * 1000),
      avatar: "MC",
    },
    {
      id: "3",
      name: "Emma Wilson",
      action: "Checked in",
      timestamp: new Date(Date.now() - 18 * 60 * 1000),
      avatar: "EW",
    },
    {
      id: "4",
      name: "Alex Rodriguez",
      action: "Checked out",
      timestamp: new Date(Date.now() - 25 * 60 * 1000),
      avatar: "AR",
    },
    {
      id: "5",
      name: "Lisa Park",
      action: "Checked in",
      timestamp: new Date(Date.now() - 32 * 60 * 1000),
      avatar: "LP",
    },
  ],
  leaderboard: [
    { id: "1", name: "Sarah Johnson", checkinCount: 98, avatar: "SJ" },
    { id: "2", name: "Mike Chen", checkinCount: 95, avatar: "MC" },
    { id: "3", name: "Emma Wilson", checkinCount: 92, avatar: "EW" },
    { id: "4", name: "Alex Rodriguez", checkinCount: 89, avatar: "AR" },
    { id: "5", name: "Lisa Park", checkinCount: 85, avatar: "LP" },
  ],
};

export default function DashboardSection() {
  const [data, setData] = useState<DashboardData>(mockData);
  const [loading, setLoading] = useState(false);
  const [animatedValues, setAnimatedValues] = useState({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    lateArrivals: 0,
  });

  const weeklyChartRef = useRef<ChartJS | null>(null);
  const classChartRef = useRef<ChartJS | null>(null);
  const weeklyCanvasRef = useRef<HTMLCanvasElement>(null);
  const classCanvasRef = useRef<HTMLCanvasElement>(null);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [detectorStatus, setDetectorStatus] = useState<"online" | "offline">(
    "online"
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const interval = duration / steps;

    const animate = (
      key: keyof typeof animatedValues,
      target: number,
      step: number = 0
    ) => {
      if (step >= steps) {
        setAnimatedValues((prev) => ({ ...prev, [key]: target }));
        return;
      }
      const current = animatedValues[key];
      const increment = (target - current) / (steps - step);
      const newValue = Math.round(current + increment);
      setAnimatedValues((prev) => ({ ...prev, [key]: newValue }));
      setTimeout(() => animate(key, target, step + 1), interval);
    };

    animate("totalStudents", data.totalStudents);
    animate("presentToday", data.presentToday);
    animate("absentToday", data.absentToday);
    animate("lateArrivals", data.lateArrivals);
  }, [data]);

  useEffect(() => {
    const handleThemeChange = () => {
      if (weeklyChartRef.current) {
        weeklyChartRef.current.destroy();
        weeklyChartRef.current = null;
      }
      if (classChartRef.current) {
        classChartRef.current.destroy();
        classChartRef.current = null;
      }
      setTimeout(() => {
        createWeeklyChart();
        createClassChart();
      }, 100);
    };

    window.addEventListener("theme-change", handleThemeChange);
    return () => window.removeEventListener("theme-change", handleThemeChange);
  }, []);

  useEffect(() => {
    createWeeklyChart();
    createClassChart();

    return () => {
      if (weeklyChartRef.current) {
        weeklyChartRef.current.destroy();
      }
      if (classChartRef.current) {
        classChartRef.current.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createWeeklyChart = () => {
    if (!weeklyCanvasRef.current) return;
    const ctx = weeklyCanvasRef.current.getContext("2d");
    if (!ctx) return;
    const isDark = document.documentElement.classList.contains("dark");
    const textColor = isDark ? "#ffffff" : "#0f1420";
    const gridColor = isDark ? "#374151" : "#e3e6ea";

    weeklyChartRef.current = new ChartJS(ctx, {
      type: "line",
      data: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [
          {
            label: "Attendance",
            data: data.weeklyTrend,
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#10b981",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            grid: {
              color: gridColor,
              // drawBorder: false,  // REMOVED for compatibility
            },
            ticks: {
              color: textColor,
              font: { size: 12 },
            },
          },
          y: {
            grid: {
              color: gridColor,
              // drawBorder: false,  // REMOVED for compatibility
            },
            ticks: {
              color: textColor,
              font: { size: 12 },
            },
          },
        },
      },
    });
  };

  const createClassChart = () => {
    if (!classCanvasRef.current) return;
    const ctx = classCanvasRef.current.getContext("2d");
    if (!ctx) return;
    const isDark = document.documentElement.classList.contains("dark");
    const textColor = isDark ? "#ffffff" : "#0f1420";
    const gridColor = isDark ? "#374151" : "#e3e6ea";

    classChartRef.current = new ChartJS(ctx, {
      type: "bar",
      data: {
        labels: Object.keys(data.classCounts),
        datasets: [
          {
            label: "Students",
            data: Object.values(data.classCounts),
            backgroundColor: [
              "rgba(15, 20, 32, 0.8)",
              "rgba(16, 185, 129, 0.8)",
              "rgba(37, 99, 235, 0.8)",
              "rgba(245, 158, 11, 0.8)",
            ],
            borderColor: ["#0f1420", "#10b981", "#2563eb", "#f59e0b"],
            borderWidth: 1,
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { size: 12 } },
          },
          y: {
            grid: {
              color: gridColor /* Removed drawBorder for compatibility */,
            },
            ticks: { color: textColor, font: { size: 12 } },
          },
        },
      },
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}`;
  };

  const kpiCards = [
    {
      title: "Total Students",
      value: animatedValues.totalStudents,
      icon: LayoutDashboard,
      gradient: "from-blue-500 to-blue-600",
    },
    {
      title: "Present Today",
      value: animatedValues.presentToday,
      icon: ChartArea,
      gradient: "from-green-500 to-green-600",
    },
    {
      title: "Absent Today",
      value: animatedValues.absentToday,
      icon: ChartBar,
      gradient: "from-red-500 to-red-600",
    },
    {
      title: "Late Arrivals",
      value: animatedValues.lateArrivals,
      icon: ChartColumn,
      gradient: "from-yellow-500 to-yellow-600",
    },
  ];

  return (
    <div className="space-y-8">
      {/* (The rest of your component is unchanged) */}
      {/* ... */}
    </div>
  );
}
