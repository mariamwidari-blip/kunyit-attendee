import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, UserPlus, ArrowLeft, Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import Papa from "papaparse";

const personSchema = z.object({
  name: z.string().trim().min(2, { message: "Nama minimal 2 karakter" }).max(100),
  email: z.string().trim().email({ message: "Email tidak valid" }).max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  department: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

type CSVRow = {
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  notes?: string;
};

type ImportResult = {
  success: number;
  failed: number;
  errors: string[];
};

export default function AddPerson() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const navigate = useNavigate();

  const generateQRCode = (name: string) => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `HG050-${name.substring(0, 3).toUpperCase()}-${timestamp}-${randomStr}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = personSchema.safeParse({
        name,
        email: email || "",
        phone: phone || "",
        department: department || "",
        notes: notes || "",
      });

      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      const qrCode = generateQRCode(name);

      const { error } = await supabase.from("people").insert({
        name: validation.data.name,
        email: validation.data.email || null,
        phone: validation.data.phone || null,
        department: validation.data.department || null,
        notes: validation.data.notes || null,
        qr_code: qrCode,
      });

      if (error) throw error;

      toast.success("Orang berhasil ditambahkan!");
      navigate("/people");
    } catch (error: any) {
      console.error("Error adding person:", error);
      toast.error(error.message || "Gagal menambahkan orang");
    } finally {
      setLoading(false);
    }
  };

  const handleCSVUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) {
      toast.error("Pilih file CSV terlebih dahulu");
      return;
    }

    setLoading(true);
    setImportResult(null);

    Papa.parse<CSVRow>(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const errors: string[] = [];
        const validRecords: any[] = [];

        results.data.forEach((row, index) => {
          const validation = personSchema.safeParse({
            name: row.name || "",
            email: row.email || "",
            phone: row.phone || "",
            department: row.department || "",
            notes: row.notes || "",
          });

          if (!validation.success) {
            errors.push(`Baris ${index + 2}: ${validation.error.errors[0].message}`);
          } else {
            const qrCode = generateQRCode(validation.data.name);
            validRecords.push({
              name: validation.data.name,
              email: validation.data.email || null,
              phone: validation.data.phone || null,
              department: validation.data.department || null,
              notes: validation.data.notes || null,
              qr_code: qrCode,
            });
          }
        });

        let successCount = 0;
        if (validRecords.length > 0) {
          try {
            const { error } = await supabase.from("people").insert(validRecords);
            if (error) throw error;
            successCount = validRecords.length;
          } catch (error: any) {
            console.error("Error bulk inserting people:", error);
            errors.push(`Database error: ${error.message}`);
          }
        }

        const result: ImportResult = {
          success: successCount,
          failed: results.data.length - successCount,
          errors,
        };

        setImportResult(result);
        setLoading(false);

        if (successCount > 0) {
          toast.success(`${successCount} orang berhasil ditambahkan!`);
          if (errors.length === 0) {
            setTimeout(() => navigate("/people"), 2000);
          }
        } else {
          toast.error("Tidak ada data yang berhasil diimpor");
        }
      },
      error: (error) => {
        console.error("CSV parsing error:", error);
        toast.error("Gagal membaca file CSV");
        setLoading(false);
      },
    });
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => navigate("/people")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Kembali
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Tambah Orang Baru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="single" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">
                <UserPlus className="h-4 w-4 mr-2" />
                Tambah Satu
              </TabsTrigger>
              <TabsTrigger value="bulk">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Import CSV
              </TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-4 mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nama Lengkap <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Masukkan nama lengkap"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@contoh.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Nomor Telepon</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="08xxxxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Departemen</Label>
                  <Input
                    id="department"
                    type="text"
                    placeholder="Contoh: IT, HR, Marketing"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Catatan</Label>
                  <Textarea
                    id="notes"
                    placeholder="Catatan tambahan (opsional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Simpan
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/people")}
                    disabled={loading}
                  >
                    Batal
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="bulk" className="space-y-4 mt-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  File CSV harus memiliki kolom: <strong>name</strong> (wajib), email, phone, department, notes.
                  <br />
                  <a
                    href="data:text/csv;charset=utf-8,name,email,phone,department,notes%0AJohn Doe,john@example.com,081234567890,IT,Test user%0AJane Smith,jane@example.com,081234567891,HR,"
                    download="template-import-people.csv"
                    className="text-primary underline hover:no-underline mt-1 inline-block"
                  >
                    Download template CSV
                  </a>
                </AlertDescription>
              </Alert>

              <form onSubmit={handleCSVUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="csvFile">
                    Pilih File CSV <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="csvFile"
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setCsvFile(file);
                      setImportResult(null);
                    }}
                    disabled={loading}
                    required
                  />
                </div>

                {importResult && (
                  <div className="space-y-2">
                    {importResult.success > 0 && (
                      <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800 dark:text-green-200">
                          <strong>{importResult.success}</strong> orang berhasil diimpor
                        </AlertDescription>
                      </Alert>
                    )}

                    {importResult.failed > 0 && (
                      <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800 dark:text-red-200">
                          <strong>{importResult.failed}</strong> data gagal diimpor
                          {importResult.errors.length > 0 && (
                            <ul className="mt-2 ml-4 list-disc text-sm">
                              {importResult.errors.slice(0, 10).map((error, idx) => (
                                <li key={idx}>{error}</li>
                              ))}
                              {importResult.errors.length > 10 && (
                                <li className="text-muted-foreground">
                                  ... dan {importResult.errors.length - 10} error lainnya
                                </li>
                              )}
                            </ul>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={loading || !csvFile}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Mengimpor...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Import CSV
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/people")}
                    disabled={loading}
                  >
                    Batal
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
