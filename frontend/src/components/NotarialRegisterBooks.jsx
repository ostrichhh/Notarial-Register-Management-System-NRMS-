import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Search } from 'lucide-react';
import AxiosInstance from './Axios';
import AddRegisterBookModal from './modal/AddRegisterBookModal';
import EditRegisterBookModal from './modal/EditRegisterBookModal';
import Alert from './ui/Alert';
import AlertDialog from './ui/AlertDialog';
import AppButton from './ui/AppButton';
import BookCard from './ui/BookCard';
import { Input } from './ui/shadcn/Input';
import PageHeader from './ui/PageHeader';

const MAX_ENTRIES_PER_BOOK = 525;

export default function NotarialRegisterBooks() {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [editSubmitError, setEditSubmitError] = useState('');
  const [archiveConfirm, setArchiveConfirm] = useState({ open: false, book: null });
  const [isArchiving, setIsArchiving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [booksResponse, entriesResponse] = await Promise.all([
        AxiosInstance.get('/books/'),
        AxiosInstance.get('/entries/?lite=true'),
      ]);
      setBooks(booksResponse.data || []);
      setEntries(entriesResponse.data || []);
    } catch {
      setError('Failed to load register books. Please check your backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const [booksResponse, entriesResponse] = await Promise.all([
          AxiosInstance.get('/books/'),
          AxiosInstance.get('/entries/?lite=true'),
        ]);

        if (!isMounted) {
          return;
        }

        setBooks(booksResponse.data || []);
        setEntries(entriesResponse.data || []);
      } catch {
        if (isMounted) {
          setError('Failed to load register books. Please check your backend connection.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  const entriesByBook = useMemo(() => {
    return entries.reduce((accumulator, entry) => {
      const bookId = entry.book;
      accumulator[bookId] = (accumulator[bookId] || 0) + 1;
      return accumulator;
    }, {});
  }, [entries]);

  const activeBook = useMemo(() => {
    return books.find((book) => {
      const count = entriesByBook[book.id] || 0;
      return count < MAX_ENTRIES_PER_BOOK;
    });
  }, [books, entriesByBook]);

  const sortedBooks = useMemo(() => {
    return [...books].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime; // LIFO: newest first
      return b.id - a.id;
    });
  }, [books]);

  const visibleBooks = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return sortedBooks;
    return sortedBooks.filter((book) => {
      return (
        String(book.book_number || '').toLowerCase().includes(q) ||
        String(book.appointment_date || '').toLowerCase().includes(q) ||
        String(book.expiration_date || '').toLowerCase().includes(q)
      );
    });
  }, [sortedBooks, searchTerm]);

  const addBookRestriction = activeBook
    ? `Book ${activeBook.book_number} is still active (${entriesByBook[activeBook.id] || 0}/${MAX_ENTRIES_PER_BOOK} entries). Fill it first before adding a new register book.`
    : '';

  const handleOpenEntries = (book) => {
    navigate(`/notarial-entries?bookId=${book.id}&bookNumber=${encodeURIComponent(book.book_number)}`);
  };

  const handleAddBook = async (payload) => {
    if (addBookRestriction) {
      return;
    }

    try {
      setIsSubmitting(true);
      await AxiosInstance.post('/books/', payload);
      setIsModalOpen(false);
      setSuccessMessage('Register book added successfully.');
      await fetchData();
    } catch (requestError) {
      const apiMessage = requestError?.response?.data?.book_number?.[0];
      setError(apiMessage || 'Unable to add register book right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditBook = (book) => {
    setEditingBook(book);
    setEditSubmitError('');
  };

  const handleUpdateBook = async (bookId, payload) => {
    try {
      setIsSubmitting(true);
      setEditSubmitError('');
      await AxiosInstance.patch(`/books/${bookId}/`, payload);
      setEditingBook(null);
      setSuccessMessage('Register book updated successfully.');
      await fetchData();
    } catch (requestError) {
      const responseData = requestError?.response?.data;
      const apiMessage =
        responseData?.book_number?.[0] ||
        responseData?.total_pages?.[0] ||
        responseData?.appointment_date?.[0] ||
        responseData?.expiration_date?.[0] ||
        responseData?.detail;
      setEditSubmitError(apiMessage || 'Unable to update register book right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestArchive = (book) => {
    setArchiveConfirm({ open: true, book });
  };

  const handleConfirmArchive = async () => {
    const book = archiveConfirm.book;

    if (!book) {
      return;
    }

    try {
      setIsArchiving(true);
      await AxiosInstance.post(`/books/${book.id}/archive/`);
      setArchiveConfirm({ open: false, book: null });
      setSuccessMessage('Register book and its entries archived successfully.');
      await fetchData();
    } catch (requestError) {
      const apiMessage = requestError?.response?.data?.detail;
      setError(apiMessage || 'Unable to archive register book right now.');
      setArchiveConfirm({ open: false, book: null });
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Register Management"
        title="Notarial Register Books"
        subtitle="Select a book card to manage its entries."
        actions={
          <AppButton type="button" variant="primary" onClick={() => setIsModalOpen(true)}>
            Add Register Book
          </AppButton>
        }
      />

      {successMessage && (
        <Alert variant="success" dismissible onDismiss={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}

      {!loading ? (
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search book number or date…"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-9"
          />
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-600">Loading books...</p>
      ) : books.length === 0 ? (
        <p className="text-sm text-slate-600">No register books found.</p>
      ) : visibleBooks.length === 0 ? (
        <p className="text-sm text-slate-600">No register books match your search.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleBooks.map((book) => {
            const count = entriesByBook[book.id] || 0;
            const isFull = count >= MAX_ENTRIES_PER_BOOK;
            const progressPercent = Math.min(100, Math.round((count / MAX_ENTRIES_PER_BOOK) * 100));

            return (
              <BookCard
                key={book.id}
                book={book}
                entryCount={count}
                isFull={isFull}
                progressPercent={progressPercent}
                onOpen={() => handleOpenEntries(book)}
                onEdit={handleEditBook}
                onArchive={handleRequestArchive}
              />
            );
          })}
        </div>
      )}

      <AddRegisterBookModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddBook}
        disabledReason={addBookRestriction}
        submitting={isSubmitting}
      />

      <EditRegisterBookModal
        isOpen={!!editingBook}
        onClose={() => {
          setEditingBook(null);
          setEditSubmitError('');
        }}
        onSubmit={handleUpdateBook}
        book={editingBook}
        submitting={isSubmitting}
        errorMessage={editSubmitError}
      />

      <AlertDialog
        isOpen={archiveConfirm.open}
        title="Archive this register book?"
        description={
          archiveConfirm.book
            ? `Book ${archiveConfirm.book.book_number} and all of its entries will be moved to the archive. You can restore them later from Archived Books.`
            : ''
        }
        variant="warning"
        confirmLabel="Archive"
        loading={isArchiving}
        onConfirm={handleConfirmArchive}
        onCancel={() => setArchiveConfirm({ open: false, book: null })}
      />
    </section>
  );
}
