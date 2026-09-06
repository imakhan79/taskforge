"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function ExecutionsOverTimeChart({ data }: { data: { date: string; completed: number; failed: number }[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Executions over time</CardTitle></CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" width={30} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="completed" name="Completed" fill="var(--chart-1)" radius={[4, 4, 0, 0]} stackId="a" />
            <Bar dataKey="failed" name="Failed" fill="var(--chart-4)" radius={[4, 4, 0, 0]} stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ToolUsageChart({ data }: { data: { name: string; count: number }[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Tool usage</CardTitle></CardHeader>
        <CardContent className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          No tool calls recorded yet.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Tool usage</CardTitle></CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
