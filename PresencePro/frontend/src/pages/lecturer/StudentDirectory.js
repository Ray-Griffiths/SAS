
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { FaUsers } from 'react-icons/fa';

const StudentDirectory = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        // The existing /api/students endpoint already returns students
        // for the courses taught by the current lecturer.
        const response = await api.get(`/api/students?page=${page}&per_page=15&name=${searchTerm}`);
        setStudents(response.data.students);
        setTotalPages(response.data.pages);
      } catch (err) {
        setError('Failed to fetch students. Please try again.');
        console.error("Error fetching students:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [page, searchTerm]);

  const handleSearch = (e) => {
      setPage(1);
      setSearchTerm(e.target.value);
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Student Directory</h1>
        
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by student name..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {loading ? (
            <div className="text-center py-8">Loading students...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : students.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded-lg">
                <FaUsers className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No Students Found</h3>
                <p className="mt-2 text-sm text-gray-500">
                  There are no students matching your search or in any of your courses.
                </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student) => (
                      <tr key={student.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.student_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDirectory;

