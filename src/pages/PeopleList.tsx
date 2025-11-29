import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, User, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface Person {
  id: string;
  name: string;
  email: string | null;
  department: string | null;
  photo_url: string | null;
  is_active: boolean;
}

export default function PeopleList() {
  const [people, setPeople] = useState<Person[]>([]);
  const [filteredPeople, setFilteredPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
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
          <Card
            key={person.id}
            className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
            onClick={() => navigate(`/person/${person.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
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
                  <p className="text-sm text-muted-foreground truncate">
                    {person.email || "Tidak ada email"}
                  </p>
                  {person.department && (
                    <p className="text-xs text-muted-foreground">{person.department}</p>
                  )}
                </div>
                <User className="h-5 w-5 text-muted-foreground" />
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
    </div>
  );
}
