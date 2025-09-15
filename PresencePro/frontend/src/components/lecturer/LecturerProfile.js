import React, {useEffect, useState} from 'react';
import { api } from '../../services/api';
import { FaBook } from 'react-icons/fa'; // Import the icon

const LecturerProfile = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [taughtCourses, setTaughtCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const response = await api.get('/api/lecturer/profile');
        const data = response.data.profile;
        setName(data.name);
        setEmail(data.email);
        setTaughtCourses(data.taught_courses || []);
      } catch (err) {
        setErrorMessage('Failed to fetch profile data.');
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      setUpdating(false);
      return;
    }

    const updatedData = { name, email };
    if (password) {
       updatedData.password = password;
    }

    try {
      const response = await api.put('/api/lecturer/profile', updatedData);
      setSuccessMessage(response.data.message || 'Profile updated successfully!');
      setPassword('');
      setConfirmPassword('');
      setErrorMessage(null);
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrorMessage(`Failed to update profile: ${error.response?.data?.message || 'An unexpected error occurred.'}`);
      setSuccessMessage(null);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">My Profile</h1>

            {loading && <div className="text-center py-8">Loading profile...</div>}

            {successMessage && (
                <div className="mb-4 p-4 bg-green-100 text-green-800 rounded-lg shadow">
                {successMessage}
                </div>
            )}

            {errorMessage && (
                <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-lg shadow">
                {errorMessage}
                </div>
            )}

            {!loading && (
              <>
                <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg mb-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">Full Name</label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                                disabled={updating}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                                disabled={updating}
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">New Password</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                placeholder="Leave blank to keep current password"
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                disabled={updating}
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">Confirm New Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                placeholder="Confirm new password"
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                disabled={updating}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end mt-8">
                        <button
                        type="submit"
                        className="px-6 py-3 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-opacity-50 disabled:opacity-50 transition-colors"
                        disabled={updating}
                        >
                        {updating ? 'Updating...' : 'Update Profile'}
                        </button>
                    </div>
                </form>

                {/* --- Taught Courses Section (Card Layout) --- */}
                <div className="mt-10">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">My Taught Courses</h2>
                    {taughtCourses.length === 0 ? (
                      <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded-lg bg-white">
                        <FaBook className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">No Courses Assigned</h3>
                        <p className="mt-2 text-sm text-gray-500">
                          You are not currently assigned to teach any courses.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {taughtCourses.map((course) => (
                          <div key={course.id} className="bg-white rounded-xl shadow-md p-6 flex flex-col justify-between">
                              <h3 className="text-lg font-bold text-gray-800 truncate">{course.name}</h3>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </>
            )}
        </div>
    </div>
  );
};

export default LecturerProfile;
