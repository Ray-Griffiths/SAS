import React, { useEffect, useState, useRef } from 'react'; // Import useRef
import { getSessionsForCourse, deleteSession, importStudents, exportStudents } from '../../services/api'; // Import importStudents and exportStudents API functions
import EditSessionForm from './EditSessionForm'; // Import the new EditSessionForm
import Papa from 'papaparse'; // Import papaparse

const ViewSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null); // State for selected file
  const [importLoading, setImportLoading] = useState(false); // State for import loading
  const [importError, setImportError] = useState(null); // State for import error
  const [importSuccess, setImportSuccess] = useState(false); // State for import success

  // State for export filters
  const [exportStudentId, setExportStudentId] = useState('');
  const [exportName, setExportName] = useState('');
  const [exportCourseName, setExportCourseName] = useState('');
  const [exportFormat, setExportFormat] = useState('csv'); // Default export format

  // State for export loading and error
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState(null);


  // Ref for the hidden file input
  const fileInputRef = useRef(null);

  // Moved fetchSessions inside the component to be accessible by handleEditSuccess
  const fetchSessions = async () => {
    setLoading(true); // Set loading to true when fetching starts
    setError(null);
    try {
      // Placeholder API call
      // You will need to replace 'YOUR_COURSE_ID' with the actual course ID
      const fetchedSessions = await getSessionsForCourse('YOUR_COURSE_ID'); // Corrected function call and added placeholder for course ID
      setSessions(fetchedSessions);
      setError(null); // Clear any previous errors on successful fetch
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setError('Failed to fetch sessions.');
      setSessions([]); // Set sessions to empty array on error
    } finally {
      setLoading(false); // Set loading to false when fetching finishes
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Placeholder function for editing a session
  const handleEditClick = (session) => {
    console.log('Edit session clicked:', session);
    setEditingSession(session);
    setShowEditForm(true); // Show the edit form
  };

  const [showEditForm, setShowEditForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);

  const handleEditSuccess = () => {
    setShowEditForm(false);
    setEditingSession(null);
    fetchSessions(); // Refresh the sessions list after successful edit
  };

  const handleEditCancel = () => {
    setShowEditForm(false);
    setEditingSession(null);
  };

  // Placeholder function for deleting a session
  const handleDeleteClick = async (sessionId) => {
    console.log('Delete session clicked:', sessionId);
    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        // Call the placeholder delete API
        await deleteSession(sessionId); // Corrected function call
        console.log(`Session with ID ${sessionId} deleted successfully (placeholder)`);
        fetchSessions(); // Refetch sessions after deletion
      } catch (error) {
        console.error(`Error deleting session ${sessionId} (placeholder):`, error);
      }
    }
  };

  // Handler for file selection
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setImportError(null); // Clear previous import errors
    setImportSuccess(false); // Reset success state

    if (file) {
      Papa.parse(file, {
        header: true, // Assuming the CSV has a header row
        complete: (results) => {
          console.log('Parsed CSV data:', results.data);
          // Now you would send results.data to your backend API
          importStudentsData(results.data); // Call the function to send data to backend
        },
        error: (err) => {
          console.error('Error parsing CSV:', err);
          setImportError('Failed to parse CSV file.');
        }
      });
    }
  };

  // Function to send parsed data to backend
  const importStudentsData = async (studentData) => {
    setImportLoading(true);
    setImportError(null);
    setImportSuccess(false);
    try {
      // Call the API function to import students
      const response = await importStudents(studentData);
      console.log('Import response:', response);
      // Handle success response from backend
      if (response && response.failed_count === 0) { // Assuming backend sends a failed_count
        setImportSuccess(true);
        // Optionally, refresh the sessions list or show imported students
      } else if (response && response.failed_count > 0) {
         setImportError(`Import failed for ${response.failed_count} students. Check console for details.`);
         console.error('Import failed details:', response.failed_students);
      }
       else {
        setImportError(response.message || 'Import failed.'); // Assuming backend sends a message field on error
      }
    } catch (error) {
      console.error('Error importing students:', error);
      setImportError('An error occurred during import.');
    } finally {
      setImportLoading(false);
    }
  };


  // Click handler for Import Students button
  const handleImportStudentsClick = () => {
    // Trigger the hidden file input click
    fileInputRef.current.click();
  };

  // Click handler for Export Student Records
  const handleExportStudentRecordsClick = async () => {
    setExportLoading(true);
    setExportError(null);
    try {
      const filters = {
        student_id: exportStudentId,
        name: exportName,
        course_name: exportCourseName,
        format: exportFormat,
      };
      // Remove empty filter values
      Object.keys(filters).forEach(key => filters[key] === '' && delete filters[key]);


      const response = await exportStudents(filters);

      if (!response.ok) {
          const errorData = await response.json();
          setExportError(errorData.message || `Export failed with status: ${response.status}`);
          console.error('Export failed:', errorData);
          return;
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'students_export';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }


      // Create a temporary URL and link to trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `students.${exportFormat}`; // Use filename from header or default
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url); // Clean up the temporary URL

    } catch (error) {
      console.error('Error exporting students:', error);
      setExportError('An error occurred during export.');
    } finally {
      setExportLoading(false);
    }
  };


  // Click handler for Print Student Records
  const handlePrintStudentRecordsClick = () => {
    window.print();
  };

  // Placeholder data for demonstration if API call is commented out
  const placeholderSessions = [
    { id: 2001, course: 'Biology 101', date: '2023-10-28', time: '09:00 AM', status: 'Active' },
    { id: 2002, course: 'Chemistry 201', date: '2023-10-28', time: '01:00 PM', status: 'Inactive' }
  ];

  // Use the fetched sessions or placeholder if fetch failed/loading and no sessions were fetched
  const sessionsToDisplay = (!loading && sessions.length === 0 && !error) ? placeholderSessions : sessions;

  return (
    <div className="container mx-auto px-4 py-6">
      <style>
        {`
          @media print {
            /* Hide elements not needed in print */
            .mb-4.flex.justify-end.space-x-2, /* Hide buttons and filters */
            .min-w-full.divide-y.divide-gray-200 td:last-child /* Hide Actions column */
             {
              display: none;
            }

            /* Show only the table for printing */
            .overflow-x-auto {
              overflow-x: visible !important;
            }

            table {
              width: 100% !important;
              border-collapse: collapse;
            }

            th, td {
              border: 1px solid #ddd;
              padding: 8px;
            }

            th {
              background-color: #f2f2f2;
              text-align: left;
            }
          }
        `}
      </style>
      <h2 className="text-2xl font-bold mb-4">View Sessions</h2>

      {/* Placeholder buttons for Import/Export/Print */}
      <div className="mb-4 flex justify-end space-x-2">
        <label htmlFor="importStudentsFile" className="px-4 py-2 text-sm text-gray-700">
          Select CSV file:
        </label>
        {/* Hidden file input */}
        <input
          type="file"
          id="importStudentsFile"
          ref={fileInputRef} // Attach the ref
          onChange={handleFileChange} // Handle file selection change
          className="hidden"
          accept=".csv" // Accept only CSV files
        />
        <button
          onClick={handleImportStudentsClick}
          className={`px-4 py-2 text-sm text-white rounded-md ${importLoading ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50`}
          disabled={importLoading} // Disable button while importing
        >
          {importLoading ? 'Importing...' : 'Import Students'}
        </button>
        {selectedFile && ( // Display selected file name if a file is selected
          <span className="ml-2 text-sm text-gray-600">
            Selected: {selectedFile.name}
          </span>
        )}
        {importError && ( // Display import error
          <span className="ml-2 text-sm text-red-500">
            Error: {importError}
          </span>
        )}
         {importSuccess && ( // Display import success message
          <span className="ml-2 text-sm text-green-500">
            Import successful!
          </span>
        )}

        {/* Export Filters */}
        <input
          type="text"
          placeholder="Student ID Filter"
          className="px-2 py-1 border rounded-md text-sm"
          value={exportStudentId}
          onChange={(e) => setExportStudentId(e.target.value)}
        />
         <input
          type="text"
          placeholder="Name Filter"
          className="px-2 py-1 border rounded-md text-sm"
          value={exportName}
          onChange={(e) => setExportName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Course Name Filter"
          className="px-2 py-1 border rounded-md text-sm"
          value={exportCourseName}
          onChange={(e) => setExportCourseName(e.target.value)}
        />
        <select
          className="px-2 py-1 border rounded-md text-sm"
          value={exportFormat}
          onChange={(e) => setExportFormat(e.target.value)}
        >
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
          <option value="excel">Excel</option>
        </select>

        <button
          onClick={handleExportStudentRecordsClick}
          className={`px-4 py-2 text-sm text-white rounded-md ${exportLoading ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50`}
          disabled={exportLoading} // Disable button while exporting
        >
          {exportLoading ? 'Exporting...' : 'Export Student Records'}
        </button>
         {exportError && ( // Display export error
          <span className="ml-2 text-sm text-red-500">
            Export Error: {exportError}
          </span>
        )}

        <button
          onClick={handlePrintStudentRecordsClick}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50"
        >
          Print Student Records
        </button>
      </div>

      {showEditForm && <EditSessionForm session={editingSession} onSuccess={handleEditSuccess} onCancel={handleEditCancel} />}\n\n      {loading && <p>Loading sessions...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && sessionsToDisplay.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                {/* Add headers for Duration and Location if you added them */}
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessionsToDisplay.map((session) => (
                <tr key={session.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session.course}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session.time}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditClick(session)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button onClick={() => handleDeleteClick(session.id)} className="text-red-600 hover:text-red-900">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
       {!loading && !error && sessionsToDisplay.length === 0 && (
        <p>No sessions found.</p>
      )}
    </div>
  );
};

export default ViewSessions;
