"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  Legend,
} from "recharts";
import DashboardDateFilter from "../../components/DashboardDateFilter";

// Mock data - in a real app, this would come from an API call
const mockShowRateData = [
  { month: "Jan", rate: 65 },
  { month: "Feb", rate: 72 },
  { month: "Mar", rate: 68 },
  { month: "Apr", rate: 75 },
  { month: "May", rate: 80 },
  { month: "Jun", rate: 85 },
];

const mockRepPerformance = [
  { name: "Alex", shows: 45, noshows: 12, rebooks: 8 },
  { name: "Jamie", shows: 52, noshows: 8, rebooks: 5 },
  { name: "Taylor", shows: 38, noshows: 15, rebooks: 10 },
  { name: "Morgan", shows: 49, noshows: 10, rebooks: 7 },
  { name: "Casey", shows: 42, noshows: 13, rebooks: 9 },
];

const mockStatusDistribution = [
  { name: "Showed", value: 65, color: "#22c55e" },
  { name: "No Show", value: 20, color: "#ef4444" },
  { name: "Rebooked", value: 15, color: "#3b82f6" },
];

const mockTimeOfDayData = [
  { timeSlot: "8-10 AM", rate: 78 },
  { timeSlot: "10-12 PM", rate: 82 },
  { timeSlot: "12-2 PM", rate: 65 },
  { timeSlot: "2-4 PM", rate: 72 },
  { timeSlot: "4-6 PM", rate: 68 },
];

export default function AnalyticsPage() {
  const [currentMonth, setCurrentMonth] = useState<string>(new Date().toLocaleString('default', { month: 'long' }));
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  
  // In a real app, we would fetch data based on the selected month and year
  const handleFilterChange = (month: string, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
    // Would trigger data fetching here
  };
  
  // Calculate summary metrics
  const avgShowRate = mockShowRateData.reduce((acc, curr) => acc + curr.rate, 0) / mockShowRateData.length;
  const bestTimeSlot = [...mockTimeOfDayData].sort((a, b) => b.rate - a.rate)[0];
  const topPerformer = [...mockRepPerformance].sort(
    (a, b) => b.shows / (b.shows + b.noshows) - a.shows / (a.shows + a.noshows)
  )[0];

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <DashboardDateFilter onFilterChange={handleFilterChange} />
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Show Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgShowRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Across all SDRs</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Best Performing Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bestTimeSlot.timeSlot}</div>
            <p className="text-xs text-muted-foreground">{bestTimeSlot.rate}% show rate</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top Performer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topPerformer.name}</div>
            <p className="text-xs text-muted-foreground">
              {(topPerformer.shows / (topPerformer.shows + topPerformer.noshows) * 100).toFixed(1)}% show rate
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Demos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockRepPerformance.reduce((acc, curr) => acc + curr.shows + curr.noshows, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Scheduled this period</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <Tabs defaultValue="trends">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="reps">Rep Performance</TabsTrigger>
          <TabsTrigger value="timing">Timing Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Show Rate Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockShowRateData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Demo Status Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockStatusDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {mockStatusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rep Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={mockRepPerformance}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="shows" fill="#22c55e" name="Shows" />
                  <Bar dataKey="noshows" fill="#ef4444" name="No Shows" />
                  <Bar dataKey="rebooks" fill="#3b82f6" name="Rebooks" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Show Rate by Rep</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={mockRepPerformance.map(rep => ({
                    name: rep.name,
                    rate: (rep.shows / (rep.shows + rep.noshows) * 100).toFixed(1)
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="rate" fill="#8884d8" name="Show Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="timing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Show Rate by Time of Day</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockTimeOfDayData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timeSlot" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="rate" fill="#8884d8" name="Show Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Day of Week Analysis</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { day: "Monday", rate: 72 },
                    { day: "Tuesday", rate: 78 },
                    { day: "Wednesday", rate: 81 },
                    { day: "Thursday", rate: 76 },
                    { day: "Friday", rate: 65 },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="rate" fill="#8884d8" name="Show Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 