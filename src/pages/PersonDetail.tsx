import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Mail, Phone, Building2, Calendar, QrCode as QrCodeIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { generateStyledQRCode } from "@/lib/qrcode-generator";

interface Person {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  qr_code: string;
  photo_url: string | null;
  department: string | null;
  notes: string | null;
  created_at: string;
}

interface AttendanceRecord {
  id: string;
  check_in_time: string;
  check_out_time: string | null;
  method: string;
}

export default function PersonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [person, setPerson] = useState<Person | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadPersonData();
    }
  }, [id]);

  const loadPersonData = async () => {
    try {
      const { data: personData, error: personError } = await supabase
        .from("people")
        .select("*")
        .eq("id", id)
        .single();

      if (personError) throw personError;
      setPerson(personData);

      const qrData = await generateStyledQRCode({
        data: personData.qr_code,
        size: 300,
        colorDark: "#1A1A1A",
        colorLight: "#FFFFFF",
        bodyType: "dot",
        eyeFrameType: "frame13",
        eyeBallType: "ball15",
      });
      setQrDataUrl(qrData);

      const { data: attendanceData } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("person_id", id)
        .order("check_in_time", { ascending: false })
        .limit(10);

      setAttendance(attendanceData || []);
    } catch (error: any) {
      console.error("Error loading person:", error);
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/people")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="h-6 w-32" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Data tidak ditemukan</p>
        <Button onClick={() => navigate("/people")} className="mt-4">
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => navigate("/people")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Kembali
      </Button>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <Avatar className="h-24 w-24 border-4 border-primary/20">
              <AvatarImage src={person.photo_url || ""} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {person.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{person.name}</h2>
              {person.department && (
                <p className="text-muted-foreground">{person.department}</p>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {person.email && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">{person.email}</span>
              </div>
            )}
            {person.phone && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">{person.phone}</span>
              </div>
            )}
            {person.notes && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">{person.notes}</p>
              </div>
            )}
          </div>

          {qrDataUrl && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <QrCodeIcon className="h-4 w-4" />
                QR Code
              </h3>
              <div className="p-4 bg-white rounded-lg">
                <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
              </div>
              <p className="text-xs text-muted-foreground">{person.qr_code}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Riwayat Absensi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attendance.length > 0 ? (
            <div className="space-y-3">
              {attendance.map((record) => (
                <div
                  key={record.id}
                  className="flex justify-between items-center p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {new Date(record.check_in_time).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(record.check_in_time).toLocaleTimeString("id-ID")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-success">Hadir</p>
                    <p className="text-xs text-muted-foreground capitalize">{record.method}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Belum ada riwayat absensi
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
