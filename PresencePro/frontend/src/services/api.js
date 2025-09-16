import axios from 'axios';

// --- FIX: Removed baseURL to make all paths explicit ---
const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- FIX: Added explicit /api to all paths ---

export const login = async (identifier, password) => {
  const response = await api.post('/api/login', { identifier, password });
  return response.data;
};

export const register = async (userData) => {
  const response = await api.post('/api/register', userData);
  return response.data;
};

export const logoutApi = async () => {
  try {
    const response = await api.post('/api/logout', {});
    if (response.status === 200) {
      localStorage.removeItem('access_token');
    }
    return response.data;
  } catch (error) {
    localStorage.removeItem('access_token');
    throw error;
  }
};

export const fetchUserProfile = async () => {
  const response = await api.get('/api/my-profile');
  return response.data;
};

export const updateMyProfile = async (profileData) => {
  const response = await api.put('/api/my-profile', profileData);
  return response.data;
};

export const getUsers = async (page = 1, per_page = 20) => {
  const response = await api.get(`/api/users?page=${page}&per_page=${per_page}`);
  return response.data;
};

export const createUser = async (userData) => {
  const response = await api.post('/api/users', userData);
  return response.data;
};

export const getUser = async (userId) => {
  const response = await api.get(`/api/users/${userId}`);
  return response.data;
};

export const updateUser = async (userId, userData) => {
  const response = await api.put(`/api/users/${userId}`, userData);
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await api.delete(`/api/users/${userId}`);
  return response.data;
};

export const getLecturers = async () => {
    const response = await api.get('/api/lecturers');
    return response.data;
};

export const getCourses = async (page = 1, per_page = 20) => {
  const response = await api.get(`/api/courses?page=${page}&per_page=${per_page}`);
  return response.data;
};

export const createCourse = async (courseData) => {
  const response = await api.post('/api/courses', courseData);
  return response.data;
};

export const getCourse = async (courseId) => {
  const response = await api.get(`/api/courses/${courseId}`);
  return response.data;
};

export const updateCourse = async (courseId, courseData) => {
  const response = await api.put(`/api/courses/${courseId}`, courseData);
  return response.data;
};

export const deleteCourse = async (courseId) => {
  const response = await api.delete(`/api/courses/${courseId}`);
  return response.data;
};

export const enrollStudents = async (courseId, studentIds) => {
  const response = await api.post(`/api/courses/${courseId}/students`, {
    student_ids: studentIds,
  });
  return response.data;
};

export const unenrollStudents = async (courseId, studentIds) => {
  const response = await api.delete(`/api/courses/${courseId}/students`, {
    data: { student_ids: studentIds },
  });
  return response.data;
};

export const getEnrolledStudents = async (courseId) => {
  const response = await api.get(`/api/courses/${courseId}/students`);
  return response.data;
};

export const getStudents = async (page = 1, per_page = 20, filters = {}) => {
  const params = new URLSearchParams({ page, per_page, ...filters });
  const response = await api.get(`/api/students?${params.toString()}`);
  return response.data;
};

export const createStudent = async (studentData) => {
  const response = await api.post('/api/students', studentData);
  return response.data;
};

export const getStudent = async (studentDbId) => {
  const response = await api.get(`/api/students/${studentDbId}`);
  return response.data;
};

export const updateStudent = async (studentDbId, studentData) => {
  const response = await api.put(`/api/students/${studentDbId}`, studentData);
  return response.data;
};

export const deleteStudent = async (studentDbId) => {
  const response = await api.delete(`/api/students/${studentDbId}`);
  return response.data;
};

export const getSessions = async (page = 1, per_page = 20) => {
  const response = await api.get(`/api/sessions?page=${page}&per_page=${per_page}`);
  return response.data;
};

export const createSession = async (sessionData) => {
  const response = await api.post('/api/sessions', sessionData);
  return response.data;
};

export const getSessionsForCourse = async (courseId) => {
  const response = await api.get(`/api/courses/${courseId}/sessions`);
  return response.data;
};

export const getSession = async (sessionId) => {
  const response = await api.get(`/api/sessions/${sessionId}`);
  return response.data;
};

export const updateSession = async (sessionId, sessionData) => {
  const response = await api.put(`/api/sessions/${sessionId}`, sessionData);
  return response.data;
};

export const deleteSession = async (sessionId) => {
  const response = await api.delete(`/api/sessions/${sessionId}`);
  return response.data;
};

export const createQrCode = async (sessionId, duration) => {
  const response = await api.post(`/api/sessions/${sessionId}/qr`, { duration });
  return response.data;
};

export const deactivateQrCode = async (sessionId) => {
  const response = await api.delete(`/api/sessions/${sessionId}/qr`);
  return response.data;
};

export const getQrCodeStatus = async (sessionId) => {
  const response = await api.get(`/api/sessions/${sessionId}/qr`);
  return response.data;
};

export const recordAttendance = async (
  sessionId,
  studentIndexNumber,
  qrCodeUuid
) => {
  const response = await api.post(`/api/sessions/${sessionId}/attendance`, {
    student_index_number: studentIndexNumber,
    qr_code_uuid: qrCodeUuid,
  });
  return response.data;
};

export const getSessionAttendance = async (sessionId) => {
  const response = await api.get(`/api/sessions/${sessionId}/attendance`);
  return response.data;
};

export const getStudentAttendance = async (studentDbId, courseId = null) => {
  const params = new URLSearchParams();
  if (courseId) {
    params.append('course_id', courseId);
  }
  const response = await api.get(
    `/api/students/${studentDbId}/attendance?${params.toString()}`
  );
  return response.data;
};

export const getCourseAttendanceSummary = async (courseId) => {
  const response = await api.get(`/api/courses/${courseId}/attendance_summary`);
  return response.data;
};

export const getAttendanceReport = async (
  courseId,
  startDate = null,
  endDate = null
) => {
  const params = new URLSearchParams({ course_id: courseId });
  if (startDate) {
    params.append('start_date', startDate);
  }
  if (endDate) {
    params.append('end_date', endDate);
  }
  const response = await api.get(`/api/reports/attendance?${params.toString()}`);
  return response.data;
};

export const exportStudents = async (filters = {}, exportFormat = 'csv') => {
  const params = new URLSearchParams({ format: exportFormat, ...filters });
  const response = await api.get(`/api/export_students?${params.toString()}`, {
    responseType: 'blob',
  });
  return response.data;
};

export const importStudents = async (studentsData) => {
  const response = await api.post('/api/import-students', studentsData);
  return response.data;
};

export const getBackendStatus = async () => {
  try {
    const response = await api.get('/api/status');
    return response.data;
  } catch (error) {
    console.error('Error fetching backend status:', error);
    return { status: 'error', message: 'Failed to connect to backend' };
  }
};

export { api };