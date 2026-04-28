import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import AxiosInstance from './Axios';
import AddRegisterBookModal from './modal/AddRegisterBookModal';
import AppButton from './ui/AppButton';
import BookCard from './ui/BookCard';
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

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [booksResponse, entriesResponse] = await Promise.all([
        AxiosInstance.get('/books/'),
        AxiosInstance.get('/entries/'),
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
          AxiosInstance.get('/entries/'),
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
      await fetchData();
    } catch (requestError) {
      const apiMessage = requestError?.response?.data?.book_number?.[0];
      setError(apiMessage || 'Unable to add register book right now.');
    } finally {
      setIsSubmitting(false);
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

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-600">Loading books...</p>
      ) : books.length === 0 ? (
        <p className="text-sm text-slate-600">No register books found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {books.map((book) => {
            const count = entriesByBook[book.id] || 0;
            const isFull = count >= MAX_ENTRIES_PER_BOOK;
            const progressPercent = Math.min(100, Math.round((count / MAX_ENTRIES_PER_BOOK) * 100));

            return (
              <BookCard
                key={book.id}
                bookNumber={book.book_number}
                entryCount={count}
                isFull={isFull}
                progressPercent={progressPercent}
                onOpen={() => handleOpenEntries(book)}
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
    </section>
  );
}
