import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { QrCode, User, Loader2, CheckCircle, Camera, AlertCircle, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import QRScanner from "@/components/QRScanner";

interface Person {
  id: string;
  name: string;
  qr_code: string;
}

interface Event {
  id: string;
  name: string;
  event_date: string;
}

export default function Attendance() {
  const [qrInput, setQrInput] = useState("");
  const [selectedPerson, setSelectedPerson] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);

  useEffect(() => {
    loadActiveEvent();
    loadPeople();
  }, []);

  const loadActiveEvent = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, event_date")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      setActiveEvent(data);
    } catch (error) {
      console.error("Error loading active event:", error);
    } finally {
      setLoadingEvent(false);
    }
  };

  const loadPeople = async () => {
    const { data } = await supabase
      .from("people")
      .select("id, name, qr_code")
      .eq("is_active", true)
      .order("name");
    setPeople(data || []);
  };

  const markAttendance = async (personId: string, method: "qr_scan" | "manual") => {
    if (!activeEvent) {
      toast.error("Tidak ada event aktif");
      return;
    }

    setLoading(true);
    try {
      const { data: person } = await supabase
        .from("people")
        .select("name")
        .eq("id", personId)
        .single();

      if (!person) {
        toast.error("Orang tidak ditemukan");
        return;
      }

      // Check if already attended this event
      const { data: existingAttendance } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("person_id", personId)
        .eq("event_id", activeEvent.id)
        .maybeSingle();

      if (existingAttendance) {
        toast.error(`${person.name} sudah absen di event ini`);
        return;
      }

      const { error } = await supabase.from("attendance_records").insert({
        person_id: personId,
        event_id: activeEvent.id,
        method,
      });

      if (error) throw error;

      toast.success(`${person.name} berhasil absen!`, {
        icon: <CheckCircle className="h-5 w-5 text-success" />,
      });
      
      setQrInput("");
      setSelectedPerson("");
    } catch (error: any) {
      console.error("Error marking attendance:", error);
      toast.error("Gagal mencatat absensi");
    } finally {
      setLoading(false);
    }
  };

  const handleQRSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await processQRCode(qrInput.trim());
  };

  const processQRCode = async (qrCode: string) => {
    if (!activeEvent) {
      toast.error("Tidak ada event aktif");
      return;
    }

    setLoading(true);

    try {
      const { data: person } = await supabase
        .from("people")
        .select("id")
        .eq("qr_code", qrCode)
        .eq("is_active", true)
        .single();

      if (!person) {
        toast.error("QR Code tidak valid");
        setLoading(false);
        return;
      }

      await markAttendance(person.id, "qr_scan");
    } catch (error) {
      toast.error("QR Code tidak ditemukan");
      setLoading(false);
    }
  };

  const handleScanSuccess = (decodedText: string) => {
    setScanning(false);
    setQrInput(decodedText);
    processQRCode(decodedText);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson) {
      toast.error("Pilih orang terlebih dahulu");
      return;
    }
    await markAttendance(selectedPerson, "manual");
  };

  if (loadingEvent) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No active event - show prompt to create/start one
  if (!activeEvent) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Absensi</h2>
          <p className="text-muted-foreground">Catat kehadiran dengan QR atau manual</p>
        </div>

        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Tidak Ada Event Aktif</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Untuk memulai absensi, Anda harus membuat atau mengaktifkan event terlebih dahulu.
              </p>
              <Button asChild>
                <Link to="/events">
                  <Calendar className="mr-2 h-4 w-4" />
                  Kelola Event
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {scanning && <QRScanner onScan={handleScanSuccess} onClose={() => setScanning(false)} />}

      <div>
        <h2 className="text-3xl font-bold tracking-tight">Absensi</h2>
        <p className="text-muted-foreground">Catat kehadiran dengan QR atau manual</p>
      </div>

      {/* Active Event Info */}
      <Card className="border-primary bg-primary/10">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
            <div>
              <p className="font-semibold">{activeEvent.name}</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(activeEvent.event_date), "EEEE, dd MMMM yyyy", { locale: localeId })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="qr" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="qr" className="gap-2">
            <QrCode className="h-4 w-4" />
            Scan QR
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <User className="h-4 w-4" />
            Manual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="qr">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Scan QR Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setScanning(true)}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Buka Kamera
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">atau</span>
                  </div>
                </div>

                <form onSubmit={handleQRSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="qrcode">Masukkan Kode QR Manual</Label>
                    <Input
                      id="qrcode"
                      type="text"
                      placeholder="HG050-XXX-..."
                      value={qrInput}
                      onChange={(e) => setQrInput(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Ketik kode QR secara manual
                    </p>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Catat Kehadiran
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Absensi Manual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="person">Pilih Orang</Label>
                  <Select value={selectedPerson} onValueChange={setSelectedPerson}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih orang..." />
                    </SelectTrigger>
                    <SelectContent>
                      {people.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Catat Kehadiran
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
