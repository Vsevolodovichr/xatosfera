import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  FileText,
  Plus,
  Upload,
  Trash2,
  Download,
  FolderOpen,
  FileCheck,
  Building2,
  Handshake,
} from 'lucide-react';
import { cloudflareApi } from '@/integrations/cloudflare/client';
import { toast } from 'sonner';
import { validateFile } from '@/lib/file-validation';

const API_URL = import.meta.env.VITE_API_URL || 'https://crm-api.0991597753r.workers.dev';

interface Document {
  id: string;
  title: string;
  category: string;
  file_url: string;
  file_name: string;
  created_at: string;
}

const CATEGORIES = [
  { value: 'fop', label: 'Документи ФОП', icon: FileCheck },
  { value: 'rent_contract', label: 'Договори оренди', icon: Building2 },
  { value: 'sale_contract', label: 'Договори продажу', icon: FileText },
  { value: 'agency_contract', label: 'Договори представництва', icon: Handshake },
];

export const DocumentsPage = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newDocument, setNewDocument] = useState({
    title: '',
    category: 'fop',
    file: null as File | null,
  });

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const fetchDocuments = async () => {
    if (!user) return;

    try {
      const { data, error } = await cloudflareApi
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast.error('Помилка завантаження документів');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewDocument((prev) => ({ ...prev, file }));
    }
  };

  const handleUpload = async () => {
    if (!user || !newDocument.file || !newDocument.title) {
      toast.error('Заповніть всі поля');
      return;
    }

    const validation = validateFile(newDocument.file);
    if (!validation.valid) {
      toast.error(validation.error || 'Невалідний файл');
      return;
    }

    setUploading(true);
    try {
      // 1. Upload file to R2
      const path = `documents/${Date.now()}_${newDocument.file.name}`;
      const uploadRes = await cloudflareApi.storage.from('documents').upload(path, newDocument.file);
      if (uploadRes.error) throw uploadRes.error;

      // 2. Save record to DB
      const { error: dbError } = await cloudflareApi.from('documents').insert({
        title: newDocument.title,
        category: newDocument.category,
        file_url: path,
        file_name: newDocument.file.name,
        user_id: user.id
      });

      if (dbError) throw dbError;

      toast.success('Документ завантажено');
      setDialogOpen(false);
      setNewDocument({ title: '', category: 'fop', file: null });
      fetchDocuments();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error('Помилка завантаження');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm('Ви впевнені, що хочете видалити цей документ?')) return;

    try {
      // Remove from DB
      const { error } = await cloudflareApi.from('documents').delete().eq('id', doc.id);
      if (error) throw error;

      // Remove from storage
      await cloudflareApi.storage.from('documents').remove([doc.file_url]);

      toast.success('Документ видалено');
      fetchDocuments();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error('Помилка видалення');
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const res = cloudflareApi.storage.from('documents').getPublicUrl(doc.file_url);
      if (res.data?.publicUrl) {
        window.open(res.data.publicUrl, '_blank');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Помилка завантаження документа');
    }
  };

  const filteredDocuments = documents.filter(
    (doc) => selectedCategory === 'all' || doc.category === selectedCategory
  );

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat?.icon || FileText;
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {language === 'uk' ? 'Документи' : 'Documents'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {filteredDocuments.length} {language === 'uk' ? 'документів' : 'documents'}
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-accent text-accent-foreground shadow-accent hover:opacity-90">
                <Plus className="mr-2 h-4 w-4" />
                {language === 'uk' ? 'Додати документ' : 'Add Document'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {language === 'uk' ? 'Завантажити документ' : 'Upload Document'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{language === 'uk' ? 'Назва' : 'Title'}</Label>
                  <Input
                    value={newDocument.title}
                    onChange={(e) =>
                      setNewDocument((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder={language === 'uk' ? 'Назва документа' : 'Document title'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'uk' ? 'Категорія' : 'Category'}</Label>
                  <Select
                    value={newDocument.category}
                    onValueChange={(value) =>
                      setNewDocument((prev) => ({ ...prev, category: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{language === 'uk' ? 'Файл' : 'File'}</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {newDocument.file
                          ? newDocument.file.name
                          : language === 'uk'
                          ? 'Натисніть для вибору файлу'
                          : 'Click to select file'}
                      </span>
                    </label>
                  </div>
                </div>
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !newDocument.file || !newDocument.title}
                  className="w-full gradient-primary"
                >
                  {uploading
                    ? language === 'uk'
                      ? 'Завантаження...'
                      : 'Uploading...'
                    : language === 'uk'
                    ? 'Завантажити'
                    : 'Upload'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-card border-0">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                {language === 'uk' ? 'Всі' : 'All'}
              </Button>
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <Button
                    key={cat.value}
                    variant={selectedCategory === cat.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.value)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {cat.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="shadow-card border-0 animate-pulse">
                <CardContent className="p-6">
                  <div className="h-12 w-12 bg-muted rounded-lg mb-4" />
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDocuments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((doc, index) => {
              const Icon = getCategoryIcon(doc.category);
              return (
                <Card
                  key={doc.id}
                  className="shadow-card border-0 hover:shadow-lg transition-all duration-300 animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="p-3 rounded-xl bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(doc)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="font-semibold text-foreground truncate">{doc.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getCategoryLabel(doc.category)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(doc.created_at).toLocaleDateString('uk-UA')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="shadow-card border-0">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {language === 'uk' ? 'Немає документів' : 'No Documents'}
              </h3>
              <p className="text-muted-foreground text-center mb-6">
                {language === 'uk'
                  ? 'Завантажте перший документ для початку'
                  : 'Upload your first document to get started'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};
