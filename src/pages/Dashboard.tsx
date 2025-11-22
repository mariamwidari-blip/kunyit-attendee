import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle, Clock, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  totalPeople: number;
  presentToday: number;
  absentToday: number;
  totalAttendanceToday: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: people } = await supabase
        .from("people")
        .select("id")
        .eq("is_active", true);

      const { data: attendance } = await supabase
        .from("attendance_records")
        .select("person_id")
        .gte("check_in_time", today.toISOString());

      const totalPeople = people?.length || 0;
      const uniqueAttendees = new Set(attendance?.map((a) => a.person_id));
      const presentToday = uniqueAttendees.size;

      setStats({
        totalPeople,
        presentToday,
        absentToday: totalPeople - presentToday,
        totalAttendanceToday: attendance?.length || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Orang",
      value: stats?.totalPeople || 0,
      icon: Users,
      description: "Terdaftar aktif",
    },
    {
      title: "Hadir Hari Ini",
      value: stats?.presentToday || 0,
      icon: CheckCircle,
      description: "Sudah absen",
      className: "text-success",
    },
    {
      title: "Belum Hadir",
      value: stats?.absentToday || 0,
      icon: Clock,
      description: "Belum absen",
      className: "text-destructive",
    },
    {
      title: "Total Absensi",
      value: stats?.totalAttendanceToday || 0,
      icon: Calendar,
      description: "Hari ini",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Ringkasan absensi hari ini</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.className || "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${card.className || ""}`}>{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
