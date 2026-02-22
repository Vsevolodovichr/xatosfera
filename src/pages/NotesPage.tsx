import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  StickyNote,
  Plus,
  Search,
  Edit,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import pb from '@/integrations/pocketbase/client';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

interface Note {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export const NotesPage = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await pb
        .from('user_notes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error: any) {
      console.error('Error fetching notes:', error);
      toast.error('Помилка завантаження нотаток');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !title.trim()) {
      toast.error('Введіть заголовок');
      return;
    }

    try {
      if (editingNote) {
        const { error } = await pb
          .from('user_notes')
          .update({ title, content })
          .eq('id', editingNote.id);

        if (error) throw error;
        toast.success('Нотатку оновлено');
      } else {
        const { error } = await pb
          .from('user_notes')
          .insert({ user_id: user.id, title, content });

        if (error) throw error;
        toast.success('Нотатку створено');
      }

      setDialogOpen(false);
      setEditingNote(null);
      setTitle('');
      setContent('');
      fetchNotes();
    } catch (error: any) {
      console.error('Error saving note:', error);
      toast.error('Помилка збереження');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Видалити цю нотатку?')) return;

    try {
      const { error } = await pb
        .from('user_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Нотатку видалено');
      fetchNotes();
    } catch (error: any) {
      console.error('Error deleting note:', error);
      toast.error('Помилка видалення');
    }
  };

  const openEditDialog = (note: Note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content || '');
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingNote(null);
    setTitle('');
    setContent('');
    setDialogOpen(true);
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {language === 'uk' ? 'Нотатки' : 'Notes'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === 'uk' ? 'Ваші особисті нотатки' : 'Your personal notes'}
            </p>
          </div>
          <Button onClick={openCreateDialog} className="gradient-primary shadow-accent">
            <Plus className="mr-2 h-4 w-4" />
            {language === 'uk' ? 'Додати нотатку' : 'Add Note'}
          </Button>
        </div>

        {/* Search */}
        <Card className="shadow-card border-0">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === 'uk' ? 'Пошук нотаток...' : 'Search notes...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notes Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="shadow-card border-0 animate-pulse">
                <CardContent className="p-6 h-40">
                  <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                  <div className="h-3 bg-muted rounded w-full mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredNotes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note, index) => (
              <Card
                key={note.id}
                className="shadow-card border-0 hover:shadow-lg transition-all animate-slide-up group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-foreground line-clamp-1">
                      {note.title}
                    </h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(note)}>
                          <Edit className="mr-2 h-4 w-4" />
                          {t('properties.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(note.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('properties.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {note.content || 'Без вмісту'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(note.updated_at), 'd MMM yyyy, HH:mm', {
                      locale: language === 'uk' ? uk : undefined,
                    })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="shadow-card border-0">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <StickyNote className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t('common.noData')}
              </h3>
              <p className="text-muted-foreground mb-4">
                {language === 'uk' ? 'Нотаток поки немає' : 'No notes yet'}
              </p>
              <Button onClick={openCreateDialog} className="gradient-primary">
                <Plus className="mr-2 h-4 w-4" />
                {language === 'uk' ? 'Створити першу нотатку' : 'Create first note'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingNote
                  ? language === 'uk'
                    ? 'Редагувати нотатку'
                    : 'Edit Note'
                  : language === 'uk'
                  ? 'Нова нотатка'
                  : 'New Note'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{language === 'uk' ? 'Заголовок' : 'Title'}</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={language === 'uk' ? 'Введіть заголовок' : 'Enter title'}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'uk' ? 'Вміст' : 'Content'}</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={language === 'uk' ? 'Введіть текст нотатки' : 'Enter note content'}
                  rows={6}
                />
              </div>
              <Button onClick={handleSave} className="w-full gradient-primary">
                {t('common.save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};
