import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  User,
  Plus,
  MoreVertical,
  Trash2,
  Eye,
  Edit,
  Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { generateStyledQRCode } from "@/lib/qrcode-generator";
import { jsPDF } from "jspdf";

interface Person {
  id: string;
  name: string;
  email: string | null;
  department: string | null;
  photo_url: string | null;
  is_active: boolean;
  qr_code: string | null;
}

export default function PeopleList() {
  const [people, setPeople] = useState<Person[]>([]);
  const [filteredPeople, setFilteredPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadPeople();
  }, []);

  useEffect(() => {
    if (search) {
      const filtered = people.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.email?.toLowerCase().includes(search.toLowerCase()) ||
          p.department?.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredPeople(filtered);
    } else {
      setFilteredPeople(people);
    }
  }, [search, people]);

  const loadPeople = async () => {
    try {
      const { data, error } = await supabase
        .from("people")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setPeople(data || []);
      setFilteredPeople(data || []);
    } catch (error) {
      console.error("Error loading people:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!personToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("people")
        .update({ is_active: false })
        .eq("id", personToDelete.id);

      if (error) throw error;

      toast.success(`${personToDelete.name} berhasil dihapus`);
      setPersonToDelete(null);
      loadPeople();
    } catch (error: any) {
      console.error("Error deleting person:", error);
      toast.error(error.message || "Gagal menghapus orang");
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadQRCode = async (person: Person) => {
    try {
      toast.loading("Membuat ID card...");

      // Generate styled QR code using the same API as PersonDetail
      const qrDataUrl = await generateStyledQRCode({
        data: person.qr_code,
        size: 1000,
        colorDark: "#1A1A1A",
        colorLight: "#FFFFFF",
        bodyType: "dot",
        eyeFrameType: "frame13",
        eyeBallType: "ball15",
      });

      // Load template and QR code images
      const [templateImg, qrImg] = await Promise.all([
        loadImage("/id_card_template.jpg"),
        loadImage(qrDataUrl),
      ]);

      // Create canvas and combine images
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to get canvas context");

      // Set canvas size to match template
      canvas.width = templateImg.width;
      canvas.height = templateImg.height;

      // Draw template
      ctx.drawImage(templateImg, 0, 0);

      // Draw QR code in the placeholder area (bottom right)
      // Adjust these coordinates based on your template layout
      const qrSize = 180; // Size of QR code
      const qrX = canvas.width - qrSize - 51; // 50px from right edge
      const qrY = canvas.height - qrSize - 35; // 50px from bottom edge
      const borderRadius = 10; // Border radius in pixels

      // Create rounded rectangle clipping path
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(qrX + borderRadius, qrY);
      ctx.lineTo(qrX + qrSize - borderRadius, qrY);
      ctx.quadraticCurveTo(qrX + qrSize, qrY, qrX + qrSize, qrY + borderRadius);
      ctx.lineTo(qrX + qrSize, qrY + qrSize - borderRadius);
      ctx.quadraticCurveTo(
        qrX + qrSize,
        qrY + qrSize,
        qrX + qrSize - borderRadius,
        qrY + qrSize
      );
      ctx.lineTo(qrX + borderRadius, qrY + qrSize);
      ctx.quadraticCurveTo(qrX, qrY + qrSize, qrX, qrY + qrSize - borderRadius);
      ctx.lineTo(qrX, qrY + borderRadius);
      ctx.quadraticCurveTo(qrX, qrY, qrX + borderRadius, qrY);
      ctx.closePath();
      ctx.clip();

      // Draw QR code with clipping applied
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      ctx.restore();

      // Add person's name and department text below the QR code
      ctx.fillStyle = "#000000";
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "center";

      // Calculate center position of QR code
      const qrCenterX = qrX + qrSize / 2;

      // Draw name below QR code
      const nameY = qrY + qrSize + 15; // 20px below QR code
      ctx.fillText(person.name.toUpperCase(), qrCenterX, nameY);

      // Draw department if available
      if (person.department) {
        ctx.font = "9px Arial";
        ctx.fillText(person.department, qrCenterX, nameY + 10); // 20px below name
      }

      // Convert canvas to blob
      const finalBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.95);
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });

      // Add image to PDF
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height);

      // Download PDF
      pdf.save(`id-card-${person.name.replace(/\s+/g, "-").toLowerCase()}.pdf`);

      // Clean up
      URL.revokeObjectURL(qrDataUrl);

      toast.dismiss();
      toast.success(`ID Card untuk ${person.name} berhasil diunduh`);
    } catch (error: any) {
      console.error("Error generating ID card:", error);
      toast.dismiss();
      toast.error("Gagal membuat ID Card");
    }
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Daftar Orang</h2>
        <Skeleton className="h-10 w-full" />
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Daftar Orang</h2>
          <p className="text-muted-foreground">Total: {people.length} orang</p>
        </div>
        <Button onClick={() => navigate("/add-person")}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari nama, email, atau departemen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-3">
        {filteredPeople.map((person) => (
          <Card key={person.id} className="transition-all hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  onClick={() => navigate(`/person/${person.id}`)}
                >
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarImage src={person.photo_url || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {person.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{person.name}</h3>

                    {person.department && (
                      <p className="text-xs text-muted-foreground">
                        {person.department}
                      </p>
                    )}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => navigate(`/person/${person.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Lihat Detail
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate(`/edit-person/${person.id}`)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadQRCode(person);
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download ID Card
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setPersonToDelete(person);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Hapus
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredPeople.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Tidak ada data ditemukan</p>
          </div>
        )}
      </div>

      <AlertDialog
        open={!!personToDelete}
        onOpenChange={() => setPersonToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus{" "}
              <strong>{personToDelete?.name}</strong>?
              <br />
              Data ini akan dinonaktifkan dan tidak akan muncul di daftar orang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
