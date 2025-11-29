import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Calendar, Plus, Play, Square, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface Event {
  id: string;
  name: string;
  event_date: string;
  is_active: boolean;
  created_at: string;
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error loading events:", error);
      toast.error("Gagal memuat daftar event");
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama event harus diisi");
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.from("events").insert({
        name: name.trim(),
        event_date: eventDate,
        is_active: false,
      });

      if (error) throw error;

      toast.success("Event berhasil dibuat");
      setName("");
      setEventDate(format(new Date(), "yyyy-MM-dd"));
      loadEvents();
    } catch (error: any) {
      console.error("Error creating event:", error);
      toast.error("Gagal membuat event");
    } finally {
      setCreating(false);
    }
  };

  const toggleEventActive = async (eventId: string, currentStatus: boolean) => {
    try {
      // If activating, first deactivate all other events
      if (!currentStatus) {
        await supabase
          .from("events")
          .update({ is_active: false })
          .neq("id", eventId);
      }

      const { error } = await supabase
        .from("events")
        .update({ is_active: !currentStatus })
        .eq("id", eventId);

      if (error) throw error;

      toast.success(currentStatus ? "Absensi diakhiri" : "Absensi dimulai");
      loadEvents();
    } catch (error) {
      console.error("Error toggling event:", error);
      toast.error("Gagal mengubah status event");
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;

      toast.success("Event berhasil dihapus");
      loadEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Gagal menghapus event");
    }
  };

  const activeEvent = events.find((e) => e.is_active);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Kelola Event</h2>
        <p className="text-muted-foreground">
          Buat dan kelola event untuk absensi
        </p>
      </div>

      {/* Active Event Banner */}
      {activeEvent && (
        <Card className="border-primary bg-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
                <div>
                  <p className="font-semibold text-lg">{activeEvent.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(
                      new Date(activeEvent.event_date),
                      "EEEE, dd MMMM yyyy",
                      { locale: id }
                    )}
                  </p>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => toggleEventActive(activeEvent.id, true)}
              >
                <Square className="h-4 w-4 mr-2" />
                Akhiri Absensi
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Event Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Buat Event Baru
          </CardTitle>
          <CardDescription>
            Buat event baru untuk memulai sesi absensi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createEvent} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Event</Label>
                <Input
                  id="name"
                  placeholder="Contoh: Rapat Bulanan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Tanggal Event</Label>
                <Input
                  id="date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Membuat...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Buat Event
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daftar Event
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Belum ada event. Buat event baru untuk memulai.
            </p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    {event.is_active && (
                      <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{event.name}</p>
                        {event.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            Aktif
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(
                          new Date(event.event_date),
                          "EEEE, dd MMMM yyyy",
                          { locale: id }
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!event.is_active ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleEventActive(event.id, false)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Mulai
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => toggleEventActive(event.id, true)}
                      >
                        <Square className="h-4 w-4 mr-2" />
                        Akhiri
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={event.is_active}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus Event?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tindakan ini tidak dapat dibatalkan. Event "
                            {event.name}" akan dihapus permanen.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteEvent(event.id)}
                          >
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
