import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import Papa from 'papaparse';

// --- MODAL FOR ENROLLING STUDENTS ---
const EnrollStudentModal = ({ isOpen, onClose, allStudents, enrolledStudentIds, onEnroll, onEnrollById }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [studentIdInput, setStudentIdInput] = useState('');
  
  const availableStudents = useMemo(() => {
    if (!allStudents) return [];
    return allStudents.filter(s => 
      !enrolledStudentIds.includes(s.id) &&
      (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       s.student_id.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [allStudents, enrolledStudentIds, searchTerm]);

  if (!isOpen) return null;

  const handleEnrollById = () => {
    if (studentIdInput.trim()) {
      onEnrollById(studentIdInput.trim());
      setStudentIdInput('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h3 className="text-xl font-bold mb-4">Enroll Students</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Enroll by Student ID</label>
          <div className="flex">
            <input
              type="text"
              placeholder="Enter Student ID"
              className="w-full p-2 border rounded-l-md"
              value={studentIdInput}
              onChange={(e) => setStudentIdInput(e.target.value)}
            />
            <button 
              onClick={handleEnrollById}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-r-md"
            >
              Add
            </button>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Or Search and Enroll</label>
          <input
            type="text"
            placeholder="Search by name or student ID..."
            className="w-full p-2 border rounded-md"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="max-h-60 overflow-y-auto">
          {availableStudents.length > 0 ? (
            availableStudents.map(student => (
              <div key={student.id} className="flex justify-between items-center p-2 border-b">
                <span>{student.name} ({student.student_id})</span>
                <button
                  onClick={() => onEnroll(student.id)}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded-md text-sm"
                >
                  Enroll
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No other students available to enroll.</p>
          )}
        </div>
        <button onClick={onClose} className="mt-4 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
          Close
        </button>
      </div>
    </div>
  );
};

// --- MODAL FOR IMPORTING STUDENTS ---
const ImportStudentsModal = ({ isOpen, onClose, onImport }) => {
  const [studentIds, setStudentIds] = useState('');
  const [file, setFile] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleImportClick = () => {
    if (file) {
      Papa.parse(file, {
        complete: (results) => {
          const ids = results.data.flat().map(id => id.trim()).filter(Boolean);
          onImport(ids);
        },
        header: false
      });
    } else if (studentIds.trim()) {
      const ids = studentIds.split(/[,\n\s]+/).map(id => id.trim()).filter(Boolean);
      onImport(ids);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h3 className="text-xl font-bold mb-4">Import Students by ID</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Import from CSV/Excel</label>
          <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileChange} className="w-full p-2 border rounded-md" />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Or Paste Student IDs</label>
          <textarea 
            className="w-full p-2 border rounded-md" 
            rows="8" 
            placeholder="Enter student IDs, separated by commas, spaces, or new lines..."
            value={studentIds}
            onChange={(e) => setStudentIds(e.target.value)}
          />
        </div>
        <div className="flex justify-end space-x-2">
          <button onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
            Cancel
          </button>
          <button onClick={handleImportClick} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
            Import
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MODAL FOR EDITING A STUDENT ---
const EditStudentModal = ({ isOpen, onClose, student, onSave }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (student) {
      setName(student.name);
      setEmail(student.email || '');
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const handleSave = () => {
    onSave(student.id, { name, email });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h3 className="text-xl font-bold mb-4">Edit Student Details</h3>
        <p className="text-gray-600 mb-4">Student ID: {student.student_id} (cannot be changed)</p>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            className="w-full p-2 border rounded-md"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            className="w-full p-2 border rounded-md"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <button onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
            Cancel
          </button>
          <button onClick={handleSave} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};


const ManageCourseStudents = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [courseRes, enrolledRes, allStudentsRes] = await Promise.all([
          api.get(`/api/courses/${courseId}`),
          api.get(`/api/courses/${courseId}/students`),
          api.get('/api/students')
        ]);
        
        setCourse(courseRes.data);
        setEnrolledStudents(enrolledRes.data.students || []);
        setAllStudents(allStudentsRes.data.students || []);

      } catch (err) {
        const errorMessage = err.response?.data?.message || `An error occurred: ${err.message}`;
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId]);

  const handleUnenroll = async (studentDbId) => {
    if (window.confirm('Are you sure you want to unenroll this student from this course?')) {
      try {
        await api.delete(`/api/courses/${courseId}/students`, { data: { student_ids: [studentDbId] } });
        setEnrolledStudents(prev => prev.filter(s => s.id !== studentDbId));
      } catch (err) {
        const errorMessage = err.response?.data?.message || `Failed to unenroll student: ${err.message}`;
        alert(`Error: ${errorMessage}`);
      }
    }
  };
  
  // *** THIS FUNCTION IS NOW FIXED ***
  const handleEnroll = async (studentDbId) => {
    try {
      // Find the student in the main list to get their student_id string (the public one)
      const studentToEnroll = allStudents.find(s => s.id === studentDbId);
      if (!studentToEnroll) {
        alert("Error: Could not find the details for the selected student.");
        return;
      }

      // The backend expects the student_id string, not the database ID
      const response = await api.post(`/api/courses/${courseId}/students`, { student_ids: [studentToEnroll.student_id] });

      if (response.data && response.data.message) {
        alert(response.data.message);
      }
      
      // Refresh enrolled students list
      const enrolledRes = await api.get(`/api/courses/${courseId}/students`);
      setEnrolledStudents(enrolledRes.data.students || []);

    } catch (err) {
      const errorMessage = err.response?.data?.message || `Failed to enroll student: ${err.message}`;
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleEnrollById = async (studentIdString) => {
    try {
      const response = await api.post(`/api/courses/${courseId}/students`, { student_ids: [studentIdString] });
      if (response.data && response.data.message) {
        alert(response.data.message);
      }
      const [enrolledRes, allStudentsRes] = await Promise.all([
        api.get(`/api/courses/${courseId}/students`),
        api.get('/api/students')
      ]);
      setEnrolledStudents(enrolledRes.data.students || []);
      setAllStudents(allStudentsRes.data.students || []);
    } catch (err)
 {
      const errorMessage = err.response?.data?.message || `Failed to enroll student: ${err.message}`;
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleImport = async (studentIds) => {
    const uniqueStudentIds = [...new Set(studentIds.map(id => id.trim()).filter(Boolean))];
    if (uniqueStudentIds.length === 0) {
      alert('The list of student IDs is empty. Please provide at least one valid student ID.');
      return;
    }
    try {
      const response = await api.post(`/api/courses/${courseId}/students`, { student_ids: uniqueStudentIds });
      if (response.data && response.data.message) {
        alert(response.data.message);
      }
      const [enrolledRes, allStudentsRes] = await Promise.all([
        api.get(`/api/courses/${courseId}/students`),
        api.get('/api/students')
      ]);
      setEnrolledStudents(enrolledRes.data.students || []);
      setAllStudents(allStudentsRes.data.students || []);
      setIsImportModalOpen(false);
    } catch (err) {
      const errorMessage = err.response?.data?.message || `An unexpected error occurred: ${err.message}`;
      alert(`Error: ${errorMessage}`);
    }
  };

  const openEditModal = (student) => {
    setStudentToEdit(student);
    setIsEditModalOpen(true);
  };
  
  const handleUpdateStudent = async (studentDbId, updatedData) => {
    try {
      await api.put(`/api/students/${studentDbId}`, updatedData);
      
      const [enrolledRes, allStudentsRes] = await Promise.all([
        api.get(`/api/courses/${courseId}/students`),
        api.get('/api/students')
      ]);
      setEnrolledStudents(enrolledRes.data.students || []);
      setAllStudents(allStudentsRes.data.students || []);

      setIsEditModalOpen(false);
      setStudentToEdit(null);
      alert("Student details updated successfully!");

    } catch (err) {
      const errorMessage = err.response?.data?.message || `Failed to update student: ${err.message}`;
      alert(`Error: ${errorMessage}`);
    }
  };

  if (loading) return <p className="text-lg text-gray-500">Loading student data...</p>;
  if (error) return <div className="text-center p-4 bg-red-100 text-red-700 rounded-md"><strong>Error:</strong> {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <button onClick={() => navigate('/lecturer/courses')} className="text-blue-500 hover:underline mb-4">&larr; Back to My Courses</button>
      
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Manage Students</h2>
      <p className="text-xl text-gray-600 mb-6">Course: <strong>{course?.name}</strong></p>

      <div className="mb-6 flex space-x-2">
          <button 
            onClick={() => setIsEnrollModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all"
          >
            Enroll Students
          </button>
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all"
          >
            Import Students
          </button>
      </div>

      <EnrollStudentModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        allStudents={allStudents}
        enrolledStudentIds={enrolledStudents.map(s => s.id)}
        onEnroll={handleEnroll}
        onEnrollById={handleEnrollById}
      />

      <ImportStudentsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
      />
      
      <EditStudentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        student={studentToEdit}
        onSave={handleUpdateStudent}
      />

      <div className="shadow-md rounded-lg overflow-x-auto">
        <h3 className="text-lg font-semibold p-4 bg-gray-100">Enrolled Students ({enrolledStudents.length})</h3>
        {enrolledStudents.length > 0 ? (
          <table className="min-w-full bg-white">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Student ID</th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Name</th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Email</th>
                <th className="text-center py-3 px-4 uppercase font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {enrolledStudents.map((student) => (
                <tr key={student.id} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="text-left py-3 px-4">{student.student_id}</td>
                  <td className="text-left py-3 px-4">{student.name}</td>
                  <td className="text-left py-3 px-4">{student.email || '-'}</td>
                  <td className="text-center py-3 px-4 space-x-2">
                    <button 
                        onClick={() => openEditModal(student)} 
                        className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors duration-200"
                    >
                        Edit
                    </button>
                    <button 
                        onClick={() => handleUnenroll(student.id)} 
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors duration-200"
                    >
                        Unenroll
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-4 text-gray-500">No students are currently enrolled in this course.</p>
        )}
      </div>
    </div>
  );
};

export default ManageCourseStudents;
