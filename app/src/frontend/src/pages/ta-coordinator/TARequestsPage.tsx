import React, { useState, useEffect } from 'react';
import { taCoordinatorApi } from '../../api/taCoordinatorApi';

interface TARequest {
  need_id: number;
  course_id: number;
  course_code: string;
  course_title: string;
  course_term: string;
  hours_required: number;
  notes?: string;
  qualifications?: string;
  lab_tutorial_skills?: string;
  status: 'open' | 'filled' | 'cancelled';
  instructor_name?: string;
  instructor_email?: string;
  created_at: string;
  updated_at: string;
}

interface TARequestStats {
  total: number;
  open: number;
  filled: number;
  cancelled: number;
}

const TARequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<TARequest[]>([]);
  const [stats, setStats] = useState<TARequestStats>({ total: 0, open: 0, filled: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "filled" | "cancelled">("all");
  const [updatingNeedId, setUpdatingNeedId] = useState<number | null>(null);
  const [detailsRequest, setDetailsRequest] = useState<TARequest | null>(null);
  // Add bulk selection state
  const [selectedRequests, setSelectedRequests] = useState<{ [key: number]: boolean }>({});

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Clear selections when status filter changes
  useEffect(() => {
    setSelectedRequests({});
  }, [statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load requests and stats in parallel
      const [requestsData, statsData] = await Promise.all([
        taCoordinatorApi.taRequests.getAll(),
        taCoordinatorApi.taRequests.getStats()
      ]);
      
      setRequests(requestsData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading TA requests:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load requests by status
  const loadRequestsByStatus = async (status: "open" | "filled" | "cancelled") => {
    try {
      setLoading(true);
      setError(null);
      
      // Filter requests locally since we don't have a backend endpoint for this
      const allRequests = await taCoordinatorApi.taRequests.getAll();
      const filteredRequests = allRequests.filter(request => request.status === status);
      
      setRequests(filteredRequests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests by status');
      console.error('Error loading requests by status:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle status filter change
  const handleStatusFilterChange = (newStatus: "all" | "open" | "filled" | "cancelled") => {
    setStatusFilter(newStatus);
    if (newStatus === "all") {
      loadData();
    } else {
      loadRequestsByStatus(newStatus);
    }
  };

  const handleStatusChange = async (needId: number, newStatus: 'open' | 'filled' | 'cancelled') => {
    if (!confirm(`Are you sure you want to mark this request as ${newStatus}?`)) {
      return;
    }

    try {
      setUpdatingNeedId(needId);
      setError(null);
      
      await taCoordinatorApi.taRequests.updateStatus(needId, newStatus);
      
      // Reload data to reflect changes
      if (statusFilter === "all") {
      await loadData();
      } else {
        await loadRequestsByStatus(statusFilter);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update request status');
      console.error('Error updating request status:', err);
    } finally {
      setUpdatingNeedId(null);
    }
  };

  const handleDeleteRequest = async (needId: number) => {
    if (!confirm('Are you sure you want to delete this TA request? This action cannot be undone.')) {
      return;
    }

    try {
      setUpdatingNeedId(needId);
      setError(null);
      
      await taCoordinatorApi.taRequests.delete(needId);
      
      // Reload data to reflect changes
      if (statusFilter === "all") {
        await loadData();
      } else {
        await loadRequestsByStatus(statusFilter);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete TA request');
      console.error('Error deleting TA request:', err);
    } finally {
      setUpdatingNeedId(null);
    }
  };

  // Helper function to get currently filtered requests
  const filteredRequests = (): TARequest[] => {
    if (statusFilter === "all") {
      return requests;
    } else {
      return requests.filter(request => request.status === statusFilter);
    }
  };

  // Bulk selection handlers
  const handleSelectRequest = (needId: number) => {
    setSelectedRequests(prev => ({
      ...prev,
      [needId]: !prev[needId]
    }));
  };

  const handleSelectAllToggle = () => {
    const openRequests = filteredRequests().filter(request => request.status === 'open');
    const allOpenSelected = openRequests.every((request: TARequest) => selectedRequests[request.need_id]);
    
    if (allOpenSelected) {
      // Deselect all open requests
      const newSelected = { ...selectedRequests };
      openRequests.forEach(request => {
        delete newSelected[request.need_id];
      });
      setSelectedRequests(newSelected);
    } else {
      // Select all open requests
      const newSelected = { ...selectedRequests };
      openRequests.forEach((request: TARequest) => {
        newSelected[request.need_id] = true;
      });
      setSelectedRequests(newSelected);
    }
  };

  // Bulk action handlers
  const handleBulkApprove = async () => {
    const selectedIds = Object.keys(selectedRequests).filter(id => selectedRequests[parseInt(id)]).map(id => parseInt(id));
    // Only process requests that are currently open/pending
    const openSelectedRequests = requests.filter(request => 
      selectedIds.includes(request.need_id) && request.status === 'open'
    );
    
    if (openSelectedRequests.length === 0) {
      alert('No pending requests selected. Only pending requests can be approved.');
      return;
    }

    if (!confirm(`Are you sure you want to approve ${openSelectedRequests.length} selected pending request(s)?`)) {
      return;
    }

    try {
      for (const request of openSelectedRequests) {
        await taCoordinatorApi.taRequests.updateStatus(request.need_id, "filled");
      }
      
      setSelectedRequests({});
      if (statusFilter === "all") {
        await loadData();
      } else {
        await loadRequestsByStatus(statusFilter);
      }
    } catch (error) {
      console.error('Error approving requests:', error);
      setError(error instanceof Error ? error.message : 'Failed to approve requests');
    }
  };

  const handleBulkReject = async () => {
    const selectedIds = Object.keys(selectedRequests).filter(id => selectedRequests[parseInt(id)]).map(id => parseInt(id));
    // Only process requests that are currently open/pending
    const openSelectedRequests = requests.filter(request => 
      selectedIds.includes(request.need_id) && request.status === 'open'
    );
    
    if (openSelectedRequests.length === 0) {
      alert('No pending requests selected. Only pending requests can be rejected.');
      return;
    }

    if (!confirm(`Are you sure you want to reject ${openSelectedRequests.length} selected pending request(s)?`)) {
      return;
    }

    try {
      for (const request of openSelectedRequests) {
        await taCoordinatorApi.taRequests.updateStatus(request.need_id, "cancelled");
      }
      
      setSelectedRequests({});
      if (statusFilter === "all") {
        await loadData();
      } else {
        await loadRequestsByStatus(statusFilter);
      }
    } catch (error) {
      console.error('Error rejecting requests:', error);
      setError(error instanceof Error ? error.message : 'Failed to reject requests');
    }
  };

  const handleApproveAllOpen = async () => {
    const openRequests = requests.filter(request => request.status === 'open');
    if (openRequests.length === 0) return;

    if (!confirm(`Are you sure you want to approve all ${openRequests.length} open request(s)?`)) {
      return;
    }

    try {
      for (const request of openRequests) {
        await taCoordinatorApi.taRequests.updateStatus(request.need_id, "filled");
      }
      
      setSelectedRequests({});
      if (statusFilter === "all") {
        await loadData();
      } else {
        await loadRequestsByStatus(statusFilter);
      }
    } catch (error) {
      console.error('Error approving all open requests:', error);
      setError(error instanceof Error ? error.message : 'Failed to approve all open requests');
    }
  };

  const handleRejectAllOpen = async () => {
    const openRequests = requests.filter(request => request.status === 'open');
    if (openRequests.length === 0) return;

    if (!confirm(`Are you sure you want to reject all ${openRequests.length} open request(s)?`)) {
      return;
    }

    try {
      for (const request of openRequests) {
        await taCoordinatorApi.taRequests.updateStatus(request.need_id, "cancelled");
      }
      
      setSelectedRequests({});
      if (statusFilter === "all") {
        await loadData();
      } else {
        await loadRequestsByStatus(statusFilter);
      }
    } catch (error) {
      console.error('Error rejecting all open requests:', error);
      setError(error instanceof Error ? error.message : 'Failed to reject all open requests');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'filled': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'cancelled': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default: return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'open': return 'Pending';
      case 'filled': return 'Approved';
      case 'cancelled': return 'Rejected';
      default: return status;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && !requests.length) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          TA Requests
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Review and manage instructor-submitted TA needs
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="text-red-800 dark:text-red-200">{error}</div>
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-gray-500 dark:border-gray-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.total}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-yellow-500 dark:border-yellow-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {stats.open}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-green-500 dark:border-green-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Approved</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.filled}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-red-500 dark:border-red-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Rejected</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {stats.cancelled}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex flex-wrap gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-4">
            Filter by Status:
          </label>
          {(["all", "open", "filled", "cancelled"] as const).map((status) => (
            <button
              key={status}
              onClick={() => handleStatusFilterChange(status)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                statusFilter === status
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {status === "all"
                ? "All"
                : status === "open"
                ? "Pending"
                : status === "filled"
                ? "Approved"
                : "Rejected"}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Action Controls */}
      <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex flex-wrap gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-4 self-center">
            Bulk Actions:
          </label>
          
          {/* Selected Actions */}
          <button
            onClick={handleBulkApprove}
            disabled={Object.keys(selectedRequests).filter(id => selectedRequests[parseInt(id)] && requests.find(r => r.need_id === parseInt(id))?.status === 'open').length === 0}
            className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Approve Selected ({Object.keys(selectedRequests).filter(id => selectedRequests[parseInt(id)] && requests.find(r => r.need_id === parseInt(id))?.status === 'open').length} pending)
          </button>
          
          <button
            onClick={handleBulkReject}
            disabled={Object.keys(selectedRequests).filter(id => selectedRequests[parseInt(id)] && requests.find(r => r.need_id === parseInt(id))?.status === 'open').length === 0}
            className="px-4 py-2 bg-gray-700 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Reject Selected ({Object.keys(selectedRequests).filter(id => selectedRequests[parseInt(id)] && requests.find(r => r.need_id === parseInt(id))?.status === 'open').length} pending)
          </button>
          
          {/* Separator */}
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 self-center mx-2"></div>
          
          {/* All Open Actions */}
          <button
            onClick={handleApproveAllOpen}
            disabled={requests.filter(request => request.status === 'open').length === 0}
            className="px-4 py-2 bg-slate-600 text-white text-sm font-medium rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Approve All Open ({requests.filter(request => request.status === 'open').length})
          </button>
          
          <button
            onClick={handleRejectAllOpen}
            disabled={requests.filter(request => request.status === 'open').length === 0}
            className="px-4 py-2 bg-slate-700 text-white text-sm font-medium rounded-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Reject All Open ({requests.filter(request => request.status === 'open').length})
          </button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-16">
                {filteredRequests().filter(request => request.status === 'open').length > 0 ? (
                  <input
                    type="checkbox"
                    checked={filteredRequests().filter(request => request.status === 'open').length > 0 && 
                             filteredRequests().filter(request => request.status === 'open').every((request: TARequest) => selectedRequests[request.need_id])}
                    onChange={handleSelectAllToggle}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                ) : (
                  <div className="w-4 h-4"></div>
                )}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-48">
                Course
              </th>
                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-44">
                Instructor
              </th>
                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-28">
                Hours/Week
              </th>
                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24">
                Status
              </th>
                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-28">
                   Submitted
                 </th>
                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {requests.map((request) => (
              <tr
                key={request.need_id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td className="px-4 py-4 whitespace-nowrap">
                  {request.status === 'open' ? (
                    <input
                      type="checkbox"
                      checked={selectedRequests[request.need_id] || false}
                      onChange={() => handleSelectRequest(request.need_id)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  ) : (
                    <div className="w-4 h-4"></div>
                  )}
                </td>
                   <td className="px-4 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                         {request.course_code}
                    </div>
                       <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                         {request.course_title}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                         {request.course_term}
                    </div>
                  </div>
                </td>
                   <td className="px-4 py-4 whitespace-nowrap">
                     {request.instructor_name ? (
                       <div>
                         <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                           {request.instructor_name}
                         </div>
                         <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                           {request.instructor_email}
                         </div>
                       </div>
                     ) : (
                       <span className="text-sm text-gray-500 dark:text-gray-400">No instructor</span>
                     )}
                </td>
                   <td className="px-4 py-4 whitespace-nowrap">
                     <div className="text-sm font-medium text-gray-900 dark:text-white">
                       {request.hours_required} hrs/week
                  </div>
                </td>
                   <td className="px-4 py-4 whitespace-nowrap">
                     <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                       {getStatusDisplayName(request.status)}
                  </span>
                </td>
                   <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                     {formatDate(request.created_at)}
                   </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex flex-col space-y-2">
                       {request.status === 'open' && (
                         <>
                      <button
                             onClick={() => handleStatusChange(request.need_id, 'filled')}
                             disabled={updatingNeedId === request.need_id}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50"
                      >
                             ✓ Approve
                      </button>
                      <button
                             onClick={() => handleStatusChange(request.need_id, 'cancelled')}
                             disabled={updatingNeedId === request.need_id}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
                      >
                             ✗ Reject
                      </button>
                         </>
                  )}
                       {request.status !== 'open' && (
                    <button
                           onClick={() => handleStatusChange(request.need_id, 'open')}
                           disabled={updatingNeedId === request.need_id}
                        className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                           ↻ Reopen
                    </button>
                  )}
                    <button
                      onClick={() => setDetailsRequest(request)}
                      className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleDeleteRequest(request.need_id)}
                      disabled={updatingNeedId === request.need_id}
                      className="inline-flex items-center px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                     </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {requests.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {statusFilter === "all"
                ? "No TA requests found."
                : `No ${statusFilter === "open" ? "pending" : statusFilter === "filled" ? "approved" : "rejected"} requests found.`}
            </p>
          </div>
         )}
      </div>

      {/* Information Note */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex">
          <div>
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">About TA Requests</h3>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              These requests come from instructors who need TAs for their courses. 
              Once approved, they can be matched with qualified student applicants.
            </p>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {detailsRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">TA Request Details</h2>
              <button
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl p-1"
                onClick={() => setDetailsRequest(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              {/* Course Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                  Course Information
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">Course Code:</span>
                    <p className="text-gray-900 dark:text-white">{detailsRequest.course_code}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">Course Title:</span>
                    <p className="text-gray-900 dark:text-white">{detailsRequest.course_title}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">Term:</span>
                    <p className="text-gray-900 dark:text-white">{detailsRequest.course_term}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">Hours Required per Week:</span>
                    <p className="text-gray-900 dark:text-white text-lg font-semibold">{detailsRequest.hours_required}</p>
                  </div>
                </div>
              </div>

              {/* Instructor Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                  Instructor Information
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">Name:</span>
                    <p className="text-gray-900 dark:text-white">{detailsRequest.instructor_name || "Not assigned"}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">Email:</span>
                    <p className="text-gray-900 dark:text-white">{detailsRequest.instructor_email || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Required Qualifications */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                  Required Qualifications
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {detailsRequest.qualifications || "No specific qualifications specified"}
                  </p>
                </div>
              </div>

              {/* Lab/Tutorial Skills */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                  Lab/Tutorial Skills Needed
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {detailsRequest.lab_tutorial_skills || "No specific lab/tutorial skills specified"}
                  </p>
                </div>
              </div>

              {/* Additional Notes */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                  Additional Notes
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {detailsRequest.notes || "No additional notes provided"}
                  </p>
                </div>
              </div>

              {/* Request Status & Timestamps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                    Request Status
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">Status:</span>
                      <span
                        className={`ml-2 inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          detailsRequest.status
                        )}`}
                      >
                        {getStatusDisplayName(detailsRequest.status)}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">Submitted:</span>
                      <p className="text-gray-900 dark:text-white">{formatDate(detailsRequest.created_at)}</p>
                    </div>
                    {detailsRequest.updated_at !== detailsRequest.created_at && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Last Updated:</span>
                        <p className="text-gray-900 dark:text-white">{formatDate(detailsRequest.updated_at)}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                    Quick Actions
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                    {detailsRequest.status === 'open' && (
                      <>
                        <button
                          onClick={() => {
                            handleStatusChange(detailsRequest.need_id, 'filled');
                            setDetailsRequest(null);
                          }}
                          className="w-full px-4 py-2 text-sm bg-green-600 dark:bg-green-700 text-white rounded hover:bg-green-700 dark:hover:bg-green-600"
                        >
                          ✓ Approve Request
                        </button>
                        <button
                          onClick={() => {
                            handleStatusChange(detailsRequest.need_id, 'cancelled');
                            setDetailsRequest(null);
                          }}
                          className="w-full px-4 py-2 text-sm bg-red-600 dark:bg-red-700 text-white rounded hover:bg-red-700 dark:hover:bg-red-600"
                        >
                          ✗ Reject Request
                        </button>
                      </>
                    )}
                    {detailsRequest.status !== 'open' && (
                      <button
                        onClick={() => {
                          handleStatusChange(detailsRequest.need_id, 'open');
                          setDetailsRequest(null);
                        }}
                        className="w-full px-4 py-2 text-sm bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600"
                      >
                        ↻ Reopen Request
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TARequestsPage; 