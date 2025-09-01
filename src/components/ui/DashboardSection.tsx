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
    timestamp: number; // Use timestamp as number for SSR consistency
    avatar?: string;
  }>;
  leaderboard: Array<{
    id: string;
    name: string;
    checkinCount: number;
    avatar?: string;
  }>;
}

// Safe mock data for SSR and CSR
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
      // Store as timestamp, not Date object
      timestamp: Date.now() - 5 * 60 * 1000,
      avatar: "SJ",
    },
    {
      id: "2",
      name: "Mike Chen",
      action: "Marked late",
      timestamp: Date.now() - 12 * 60 * 1000,
      avatar: "MC",
    },
    {
      id: "3",
      name: "Emma Wilson",
      action: "Checked in",
      timestamp: Date.now() - 18 * 60 * 1000,
      avatar: "EW",
    },
    {
      id: "4",
      name: "Alex Rodriguez",
      action: "Checked out",
      timestamp: Date.now() - 25 * 60 * 1000,
      avatar: "AR",
    },
    {
      id: "5",
      name: "Lisa Park",
      action: "Checked in",
      timestamp: Date.now() - 32 * 60 * 1000,
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
  // Only initialize currentTime on client for hydration safety
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [data, setData] = useState<DashboardData>(mockData);
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

  const [detectorStatus, setDetectorStatus] = useState<"online" | "offline">(
    "online"
  );

  // Only set the current time on client (not SSR) to fix hydration error
  useEffect(() => {
    setCurrentTime(new Date());
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
              // drawBorder: false,
            },
            ticks: {
              color: textColor,
              font: { size: 12 },
            },
          },
          y: {
            grid: {
              color: gridColor,
              // drawBorder: false,
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
              color: gridColor,
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

  const getTimeAgo = (timestamp: number) => {
    // use currentTime if available, else default to Date.now()
    const now = currentTime ? currentTime.getTime() : Date.now();
    const diff = now - timestamp;
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

  // Safe display for date and time values, avoids hydration differences
  const displayDate = currentTime ? formatDate(currentTime) : "--";
  const displayTime = currentTime ? formatTime(currentTime) : "--";

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-accent p-8 md:p-12">
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-pulse"
          style={{ animationDuration: "3s" }}
        />
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-3">
                CheckinMate
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
                Real-time Student Tracking & Proxy Detection — by Team
                Area41
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Today:</span>
                <span className="font-medium">{displayDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Time:</span>
                <span className="font-medium font-mono">{displayTime}</span>
              </div>
              <Badge
                variant={
                  detectorStatus === "online" ? "default" : "destructive"
                }
                className="w-fit"
              >
                Detector {detectorStatus}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card, index) => {
          const IconComponent = card.icon;
          return (
            <Card
              key={card.title}
              className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {card.title}
                    </p>
                    <p className="text-3xl font-bold text-foreground">
                      {card.value.toLocaleString()}
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-full bg-gradient-to-br ${card.gradient} shadow-lg`}
                  >
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                </div>
                {/* Mini sparkline placeholder */}
                <div className="mt-4 h-8 bg-muted/30 rounded animate-pulse" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Attendance Trend */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartArea className="h-5 w-5" />
              Weekly Attendance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-64">
              <canvas ref={weeklyCanvasRef} />
            </div>
          </CardContent>
        </Card>

        {/* Attendance by Class */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartPie className="h-5 w-5" />
              Attendance by Class
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-64">
              <canvas ref={classCanvasRef} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentActivity.map((activity, index) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300"
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {activity.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {activity.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.action}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {getTimeAgo(activity.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Top Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.leaderboard.map((student, index) => (
                <div
                  key={student.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-all duration-300 animate-in slide-in-from-left duration-400"
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-bold">
                      {getRankIcon(index)}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {student.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {student.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-1000"
                            style={{
                              width: `${Math.min(
                                (student.checkinCount / 100) * 100,
                                100
                              )}%`,
                              animationDelay: `${index * 200}ms`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold text-foreground min-w-fit">
                          {student.checkinCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
