import React, { useState, useEffect, useRef } from 'react';
import { taCoordinatorApi } from '../../api/taCoordinatorApi';

interface AcademicTerm {
  term_id?: number;
  name: string;
  start_date: string;
  end_date: string;
  status: 'upcoming';
  created_at?: string;
  updated_at?: string;
}

// Helper function to format dates
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Helper function to format date for input fields (YYYY-MM-DD)
const formatDateForInput = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

const AcademicTermsPage: React.FC = () => {
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTerm, setEditingTerm] = useState<AcademicTerm | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form refs
  const nameRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  // Load terms on component mount
  useEffect(() => {
    loadTerms();
  }, []);

  const loadTerms = async () => {
    try {
      setLoading(true);
      setError(null);
      const termsData = await taCoordinatorApi.terms.getAllTerms();
      setTerms(termsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load terms');
      console.error('Error loading terms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameRef.current || !startDateRef.current || !endDateRef.current) {
      return;
    }

    const formData = {
      name: nameRef.current.value,
      start_date: startDateRef.current.value,
      end_date: endDateRef.current.value,
    };

    try {
      setSubmitting(true);
      setError(null);

      if (editingTerm && editingTerm.term_id) {
        // Update existing term
        await taCoordinatorApi.terms.updateTerm(editingTerm.term_id, formData);
      } else {
        // Create new term
        await taCoordinatorApi.terms.createTerm(formData);
      }

      // Reload terms and close form
      await loadTerms();
    setShowForm(false);
    setEditingTerm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save term');
      console.error('Error saving term:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (term: AcademicTerm) => {
    setEditingTerm(term);
    setShowForm(true);
  };

  const handleDelete = async (term: AcademicTerm) => {
    if (!term.term_id) return;
    
    if (!confirm(`Are you sure you want to delete "${term.name}"?`)) {
      return;
    }

    try {
      setError(null);
      await taCoordinatorApi.terms.deleteTerm(term.term_id);
      await loadTerms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete term');
      console.error('Error deleting term:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="text-lg text-gray-900 dark:text-white">Loading terms...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Academic Terms</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Create and manage academic terms for TA allocation
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="text-red-800 dark:text-red-200">{error}</div>
        </div>
      )}

      <div className="mb-6">
        <button
          onClick={() => {
            setEditingTerm(null);
            setShowForm(true);
          }}
          className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
        >
          Add New Term
        </button>
      </div>

      {/* Terms List */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        {terms.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
            No terms found. Create your first term using the button above.
          </div>
        ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {terms.map((term) => (
              <li key={term.term_id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                        {term.name.split(' ')[0][0]}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {term.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(term.start_date)} - {formatDate(term.end_date)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                    Upcoming
                  </span>
                  <button
                      onClick={() => handleEdit(term)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                  >
                    Edit
                  </button>
                    <button
                      onClick={() => handleDelete(term)}
                      className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                    >
                      Delete
                    </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-600 w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {editingTerm ? 'Edit Academic Term' : 'Add New Academic Term'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Term Name
                  </label>
                  <input
                    ref={nameRef}
                    type="text"
                    defaultValue={editingTerm?.name || ''}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Start Date
                  </label>
                  <input
                    ref={startDateRef}
                    type="date"
                    defaultValue={editingTerm?.start_date ? formatDateForInput(editingTerm.start_date) : ''}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    End Date
                  </label>
                  <input
                    ref={endDateRef}
                    type="date"
                    defaultValue={editingTerm?.end_date ? formatDateForInput(editingTerm.end_date) : ''}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingTerm(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-500 dark:bg-blue-600 rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : (editingTerm ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicTermsPage; 