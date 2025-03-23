"use client";

import { useState, useEffect } from "react";
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
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/database.types';

type Demo = Database['public']['Tables']['demos']['Row'];

// Helper function to group demos by month
const groupDemosByMonth = (demos: Demo[]) => {
  const monthlyData = new Map<string, { total: number, showed: number }>();
  
  demos.forEach(demo => {
    const date = new Date(demo.demo_date);
    const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    
    const current = monthlyData.get(monthKey) || { total: 0, showed: 0 };
    current.total += 1;
    if (demo.showed === 'Yes') current.showed += 1;
    
    monthlyData.set(monthKey, current);
  });

  return Array.from(monthlyData.entries()).map(([month, data]) => ({
    month,
    rate: data.total > 0 ? (data.showed / data.total) * 100 : 0
  }));
};

// Helper function to group demos by time of day
const groupDemosByTimeOfDay = (demos: Demo[]) => {
  type TimeSlot = '8-10 AM' | '10-12 PM' | '12-2 PM' | '2-4 PM' | '4-6 PM';
  type TimeSlotData = { total: number; showed: number };
  
  const timeSlots: Record<TimeSlot, TimeSlotData> = {
    '8-10 AM': { total: 0, showed: 0 },
    '10-12 PM': { total: 0, showed: 0 },
    '12-2 PM': { total: 0, showed: 0 },
    '2-4 PM': { total: 0, showed: 0 },
    '4-6 PM': { total: 0, showed: 0 }
  };

  demos.forEach(demo => {
    const time = demo.demo_time;
    if (!time) return;

    const hour = parseInt(time.split(':')[0]);
    let slot: TimeSlot | undefined;
    if (hour >= 8 && hour < 10) slot = '8-10 AM';
    else if (hour >= 10 && hour < 12) slot = '10-12 PM';
    else if (hour >= 12 && hour < 14) slot = '12-2 PM';
    else if (hour >= 14 && hour < 16) slot = '2-4 PM';
    else if (hour >= 16 && hour < 18) slot = '4-6 PM';
    else return;

    timeSlots[slot].total += 1;
    if (demo.showed === 'Yes') timeSlots[slot].showed += 1;
  });

  return Object.entries(timeSlots).map(([timeSlot, data]) => ({
    timeSlot,
    rate: data.total > 0 ? (data.showed / data.total) * 100 : 0
  }));
};

// Helper function to calculate status distribution
const calculateStatusDistribution = (demos: Demo[]) => {
  const distribution = {
    'Showed': { value: 0, color: '#22c55e' },
    'No Show': { value: 0, color: '#ef4444' },
    'Rebooked': { value: 0, color: '#3b82f6' }
  };

  demos.forEach(demo => {
    if (demo.showed === 'Yes') distribution['Showed'].value++;
    else if (demo.showed === 'No') distribution['No Show'].value++;
    if (demo.status === 'Rebooked') distribution['Rebooked'].value++;
  });

  return Object.entries(distribution).map(([name, { value, color }]) => ({
    name,
    value,
    color
  }));
};

export default function AnalyticsPage() {
  const [currentMonth, setCurrentMonth] = useState<string>(new Date().toLocaleString('default', { month: 'long' }));
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [demos, setDemos] = useState<Demo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadDemos = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setError('Please sign in to view analytics');
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('demos')
          .select('*')
          .eq('user_id', user.id);

        if (fetchError) throw fetchError;
        setDemos(data || []);
      } catch (err) {
        console.error('Error loading demos:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    loadDemos();
  }, []);

  const handleFilterChange = (month: string, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  };

  if (loading) {
    return <div className="p-8 text-center">Loading analytics...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  // Filter demos based on selected month and year
  const filteredDemos = demos.filter(demo => {
    const demoDate = new Date(demo.demo_date);
    return (
      demoDate.getMonth() === new Date(`${currentMonth} 1`).getMonth() &&
      demoDate.getFullYear() === currentYear
    );
  });

  // Calculate summary metrics
  const showRate = demos.length > 0 
    ? (demos.filter(d => d.showed === 'Yes').length / demos.length) * 100 
    : 0;

  const timeSlotData = groupDemosByTimeOfDay(demos);
  const bestTimeSlot = [...timeSlotData].sort((a, b) => b.rate - a.rate)[0];

  const showRateData = groupDemosByMonth(demos);
  const statusDistribution = calculateStatusDistribution(demos);

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
            <div className="text-2xl font-bold">{showRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">All time average</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Best Performing Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bestTimeSlot?.timeSlot || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">{bestTimeSlot ? `${bestTimeSlot.rate.toFixed(1)}% show rate` : 'No data'}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Demos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredDemos.length}</div>
            <p className="text-xs text-muted-foreground">{`${currentMonth} ${currentYear}`}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Demos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{demos.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <Tabs defaultValue="trends">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="timing">Timing Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Show Rate Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={showRateData}>
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
                    data={statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {statusDistribution.map((entry, index) => (
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
        
        <TabsContent value="timing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Show Rate by Time of Day</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeSlotData}>
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
                  data={demos.reduce((acc, demo) => {
                    const day = new Date(demo.demo_date).toLocaleString('en-US', { weekday: 'long' });
                    const existing = acc.find(d => d.day === day);
                    if (existing) {
                      existing.total++;
                      if (demo.showed === 'Yes') existing.showed++;
                    } else {
                      acc.push({ 
                        day, 
                        total: 1, 
                        showed: demo.showed === 'Yes' ? 1 : 0,
                        rate: demo.showed === 'Yes' ? 100 : 0
                      });
                    }
                    return acc.map(d => ({
                      ...d,
                      rate: (d.showed / d.total) * 100
                    }));
                  }, [] as Array<{ day: string; total: number; showed: number; rate: number }>)
                  .sort((a, b) => {
                    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    return days.indexOf(a.day) - days.indexOf(b.day);
                  })}
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