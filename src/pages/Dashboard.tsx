import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, CheckCircle, Clock, Calendar, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface Stats {
  totalPeople: number;
  presentCount: number;
  absentCount: number;
  totalAttendance: number;
}

interface Event {
  id: string;
  name: string;
  event_date: string;
  is_active: boolean;
}

interface AttendanceRecord {
  id: string;
  check_in_time: string;
  method: string;
  person: {
    id: string;
    name: string;
    department: string | null;
  };
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadStats(selectedEventId);
      loadAttendance(selectedEventId);
    }
  }, [selectedEventId]);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, event_date, is_active")
        .order("event_date", { ascending: false });

      if (error) throw error;

      setEvents(data || []);

      // Auto-select active event or most recent
      const activeEvent = data?.find((e) => e.is_active);
      if (activeEvent) {
        setSelectedEventId(activeEvent.id);
      } else if (data && data.length > 0) {
        setSelectedEventId(data[0].id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error loading events:", error);
      setLoading(false);
    }
  };

  const loadStats = async (eventId: string) => {
    try {
      setLoading(true);

      const { data: people } = await supabase
        .from("people")
        .select("id")
        .eq("is_active", true);

      const { data: attendanceData } = await supabase
        .from("attendance_records")
        .select("person_id")
        .eq("event_id", eventId);

      const totalPeople = people?.length || 0;
      const uniqueAttendees = new Set(attendanceData?.map((a) => a.person_id));
      const presentCount = uniqueAttendees.size;

      setStats({
        totalPeople,
        presentCount,
        absentCount: totalPeople - presentCount,
        totalAttendance: attendanceData?.length || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async (eventId: string) => {
    try {
      setLoadingAttendance(true);

      const { data, error } = await supabase
        .from("attendance_records")
        .select(
          `
          id,
          check_in_time,
          method,
          person:people(id, name, department)
        `
        )
        .eq("event_id", eventId)
        .order("check_in_time", { ascending: false });

      if (error) throw error;

      setAttendance((data as unknown as AttendanceRecord[]) || []);
    } catch (error) {
      console.error("Error loading attendance:", error);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  const statCards = [
    {
      title: "Total Orang",
      value: stats?.totalPeople || 0,
      icon: Users,
      description: "Terdaftar aktif",
    },
    {
      title: "Hadir",
      value: stats?.presentCount || 0,
      icon: CheckCircle,
      description: "Sudah absen",
      className: "text-success",
    },
    {
      title: "Belum Hadir",
      value: stats?.absentCount || 0,
      icon: Clock,
      description: "Belum absen",
      className: "text-destructive",
    },
    {
      title: "Total Absensi",
      value: stats?.totalAttendance || 0,
      icon: Calendar,
      description: "Event ini",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Ringkasan absensi berdasarkan event
          </p>
        </div>

        {/* Event Filter */}
        <div className="w-full sm:w-64">
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih event..." />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  <div className="flex items-center gap-2">
                    {event.is_active && (
                      <div className="h-2 w-2 rounded-full bg-success" />
                    )}
                    <span>{event.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Selected Event Info */}
      {selectedEvent && (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {format(new Date(selectedEvent.event_date), "EEEE, dd MMMM yyyy", {
            locale: localeId,
          })}
          {selectedEvent.is_active && (
            <Badge variant="secondary" className="ml-2">
              Aktif
            </Badge>
          )}
        </div>
      )}

      {/* Stats Cards */}
      {loading ? (
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
      ) : events.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Belum ada event. Buat event untuk mulai absensi.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <Card
              key={card.title}
              className="transition-shadow hover:shadow-md"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <card.icon
                  className={`h-4 w-4 ${
                    card.className || "text-muted-foreground"
                  }`}
                />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${card.className || ""}`}>
                  {card.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Attendance Table */}
      {selectedEventId && (
        <Card>
          <CardHeader>
            <CardTitle>Daftar Hadir</CardTitle>
            <CardDescription>
              Peserta yang sudah absen di event ini
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAttendance ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : attendance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Belum ada yang absen di event ini.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Departemen
                      </TableHead>
                      <TableHead>Waktu</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Metode
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((record, index) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          {record.person?.name || "-"}
                          <p className="sm:hidden text-xs text-muted-foreground">
                            {record.person?.department || "-"}
                          </p>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {record.person?.department || "-"}
                        </TableCell>
                        <TableCell>
                          {record.check_in_time
                            ? format(new Date(record.check_in_time), "HH:mm", {
                                locale: localeId,
                              })
                            : "-"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge
                            variant={
                              record.method === "qr_scan"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {record.method === "qr_scan" ? "QR" : "Manual"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
