import axios from 'axios';

const api = axios.create({
  // Use /api as the base URL since backend will serve frontend and APIs under /api
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Attach token automatically for all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ------------------ AUTH ------------------

export const login = async (username, password) => {
  const response = await api.post('/login', { username, password });
  return response.data;
};

export const register = async (userData) => {
  const response = await api.post('/register', userData);
  return response.data;
};

// Explicit JWT logout + clear localStorage
export const logoutApi = async () => {
  try {
    const response = await api.post('/logout', {}); // interceptor attaches token
    if (response.status === 200) {
      localStorage.removeItem('jwt_token'); // clear token locally
    }
    return response.data;
  } catch (error) {
    // Always clear token locally even if backend logout fails
    localStorage.removeItem('jwt_token');
    throw error;
  }
};

export const fetchUserProfile = async (token = null) => {
  const config = {};
  if (token) { // If token is explicitly passed, use it for this specific request
    config.headers = {
      Authorization: `Bearer ${token}`,
    };
  }
  const response = await api.get('/my-profile', config);
  return response.data;
};

export const getMyProfile = async () => {
  const response = await api.get('/my-profile');
  return response.data;
};

export const updateMyProfile = async (profileData) => {
  const response = await api.put('/my-profile', profileData);
  return response.data;
};

// ------------------ USERS ------------------

export const getUsers = async (page = 1, per_page = 20) => {
  const response = await api.get(`/users?page=${page}&per_page=${per_page}`);
  return response.data;
};

export const createUser = async (userData) => {
  const response = await api.post('/users', userData);
  return response.data;
};

export const getUser = async (userId) => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};

export const updateUser = async (userId, userData) => {
  const response = await api.put(`/users/${userId}`, userData);
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await api.delete(`/users/${userId}`);
  return response.data;
};

// ------------------ COURSES ------------------

export const getCourses = async (page = 1, per_page = 20) => {
  const response = await api.get(`/courses?page=${page}&per_page=${per_page}`);
  return response.data;
};

export const createCourse = async (courseData) => {
  const response = await api.post('/courses', courseData);
  return response.data;
};

export const getCourse = async (courseId) => {
  const response = await api.get(`/courses/${courseId}`);
  return response.data;
};

export const updateCourse = async (courseId, courseData) => {
  const response = await api.put(`/courses/${courseId}`, courseData);
  return response.data;
};

export const deleteCourse = async (courseId) => {
  const response = await api.delete(`/courses/${courseId}`);
  return response.data;
};

export const enrollStudents = async (courseId, studentIds) => {
  const response = await api.post(`/courses/${courseId}/students`, {
    student_ids: studentIds,
  });
  return response.data;
};

export const unenrollStudents = async (courseId, studentIds) => {
  const response = await api.delete(`/courses/${courseId}/students`, {
    data: { student_ids: studentIds },
  });
  return response.data;
};

export const getEnrolledStudents = async (courseId) => {
  const response = await api.get(`/courses/${courseId}/students`);
  return response.data;
};

// ------------------ STUDENTS ------------------

export const getStudents = async (page = 1, per_page = 20, filters = {}) => {
  const params = new URLSearchParams({ page, per_page, ...filters });
  const response = await api.get(`/students?${params.toString()}`);
  return response.data;
};

export const createStudent = async (studentData) => {
  const response = await api.post('/students', studentData);
  return response.data;
};

export const getStudent = async (studentDbId) => {
  const response = await api.get(`/students/${studentDbId}`);
  return response.data;
};

export const updateStudent = async (studentDbId, studentData) => {
  const response = await api.put(`/students/${studentDbId}`, studentData);
  return response.data;
};

export const deleteStudent = async (studentDbId) => {
  const response = await api.delete(`/students/${studentDbId}`);
  return response.data;
};

// ------------------ SESSIONS ------------------

export const createSession = async (sessionData) => {
  const response = await api.post('/sessions', sessionData);
  return response.data;
};

export const getSessionsForCourse = async (courseId) => {
  const response = await api.get(`/courses/${courseId}/sessions`);
  return response.data;
};

export const getSession = async (sessionId) => {
  const response = await api.get(`/sessions/${sessionId}`);
  return response.data;
};

export const updateSession = async (sessionId, sessionData) => {
  const response = await api.put(`/sessions/${sessionId}`, sessionData);
  return response.data;
};

export const deleteSession = async (sessionId) => {
  const response = await api.delete(`/sessions/${sessionId}`);
  return response.data;
};

// ------------------ QR CODES ------------------

export const createQrCode = async (sessionId, duration) => {
  const response = await api.post(`/sessions/${sessionId}/qr`, { duration });
  return response.data;
};

export const deactivateQrCode = async (sessionId) => {
  const response = await api.delete(`/sessions/${sessionId}/qr`);
  return response.data;
};

export const getQrCodeStatus = async (sessionId) => {
  const response = await api.get(`/sessions/${sessionId}/qr`);
  return response.data;
};

// ------------------ ATTENDANCE ------------------

export const recordAttendance = async (
  sessionId,
  studentIndexNumber,
  qrCodeUuid
) => {
  const response = await api.post(`/sessions/${sessionId}/attendance`, {
    student_index_number: studentIndexNumber,
    qr_code_uuid: qrCodeUuid,
  });
  return response.data;
};

export const getSessionAttendance = async (sessionId) => {
  const response = await api.get(`/sessions/${sessionId}/attendance`);
  return response.data;
};

export const getStudentAttendance = async (studentDbId, courseId = null) => {
  const params = new URLSearchParams();
  if (courseId) {
    params.append('course_id', courseId);
  }
  const response = await api.get(
    `/students/${studentDbId}/attendance?${params.toString()}`
  );
  return response.data;
};

export const getCourseAttendanceSummary = async (courseId) => {
  const response = await api.get(`/courses/${courseId}/attendance_summary`);
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
  const response = await api.get(`/reports/attendance?${params.toString()}`);
  return response.data;
};

// ------------------ IMPORT/EXPORT ------------------

export const exportStudents = async (filters = {}, exportFormat = 'csv') => {
  const params = new URLSearchParams({ format: exportFormat, ...filters });
  const response = await api.get(`/export_students?${params.toString()}`, {
    responseType: 'blob',
  });
  return response.data;
};

export const importStudents = async (studentsData) => {
  const response = await api.post('/import-students', studentsData);
  return response.data;
};

// ------------------ BACKEND STATUS ------------------

export const getBackendStatus = async () => {
  try {
    const response = await api.get('/status');
    return response.data;
  } catch (error) {
    console.error('Error fetching backend status:', error);
    return { status: 'error', message: 'Failed to connect to backend' };
  }
};

export { api };
