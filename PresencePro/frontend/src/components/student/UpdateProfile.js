import React, {useEffect, useState} from 'react';
import {getMyProfile, updateMyProfile} from '../../services/api'; // Corrected named imports

const UpdateProfile = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState(null); // State for the selected file
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Fetch user profile data on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        // Use the directly imported getMyProfile function
        const response = await getMyProfile(); // Corrected function call

        if (!response.ok) {
             const errorData = await response.json();
             throw new Error(errorData.message || `Failed to fetch profile with status: ${response.status}`);
        }

        const data = await response.json();
        setName(data.name);
        setEmail(data.email);
        // You might also set other profile fields here if they exist in the backend response
        // setProfilePictureUrl(data.profile_picture_url);

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
      setErrorMessage('Password and Confirm Password do not match.');
      setUpdating(false);
      return;
    }

    // For now, sending only name and email in JSON format.
    // Profile picture and password updates will require backend support
    // to handle different data formats (FormData for file) or separate endpoints.
    const updatedData = {
        name: name,
        email: email
    };

     // Add password to update data if provided
    if (password) {
       updatedData.password = password;
    }

     // *** Profile picture upload requires a different approach, likely FormData ***
     // If you need to upload a file, you\'ll need to switch back to FormData
     // and ensure your backend can handle file uploads on this endpoint or a separate one.
     // Example (if using FormData for profile picture):
     /*
     const formData = new FormData();
     formData.append('name', name);
     formData.append('email', email);
     if (password) {
       formData.append('password', password);
     }
     if (profilePicture) {
       formData.append('profilePicture', profilePicture); // 'profilePicture' should match backend field name
     }
     // Then call updateMyProfile with formData and appropriate headers (like 'Content-Type': 'multipart/form-data' - though fetch might set this automatically with FormData)
     // const response = await updateMyProfile(formData);
     */


    try {
      // Use the directly imported updateMyProfile function
      // Assuming updateMyProfile in api.js sends JSON for this case
      const response = await updateMyProfile(updatedData); // Corrected function call

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to update profile with status: ${response.status}`);
      }

      // Assuming a successful update response might not have a body or a specific success status
      // If your backend returns a success message in JSON:
      const result = await response.json();
      setSuccessMessage(result.message || 'Profile updated successfully!');

      // Clear password fields after successful update
      setPassword('');
      setConfirmPassword('');
      setErrorMessage(null); // Clear any previous errors on success

    } catch (error) {
      console.error('Error updating profile:', error);
      setErrorMessage(`Failed to update profile: ${error.message || 'An unexpected error occurred.'}`);
      setSuccessMessage(null); // Clear any previous success on error
    } finally {
      setUpdating(false);
    }
  };

  const handleFileChange = (e) => {
    // Store the selected file in state
    setProfilePicture(e.target.files[0]);
    // You might want to display a preview of the selected image here
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Update Profile</h2>

      {loading && <p>Loading profile data...</p>}
      {updating && <p>Updating profile...</p>}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md">
          {errorMessage}
        </div>
      )}

      {!loading && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-md shadow-md">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">Name:</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
              required
              disabled={updating} // Disable input while updating
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
              required
               disabled={updating} // Disable input while updating
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
               disabled={updating} // Disable input while updating
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">Confirm Password:</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
               disabled={updating} // Disable input while updating
            />
          </div>
          {/* Profile Picture Input - requires backend support for file upload */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="profilePicture">Profile Picture:</label>
            <input
              type="file"
              id="profilePicture"
              accept="image/*" // Accept image files
              onChange={handleFileChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
               disabled={updating} // Disable input while updating
            />
             {/* You might want to show a preview of the selected image here */}
             {/* {profilePicture && <img src={URL.createObjectURL(profilePicture)} alt="Profile Preview" className="mt-2 w-20 h-20 object-cover rounded-full"/>} */}
             {/* Or show the existing profile picture from fetched data */}
             {/* {profilePictureUrl && !profilePicture && <img src={profilePictureUrl} alt="Current Profile" className="mt-2 w-20 h-20 object-cover rounded-full"/>} */}

          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50 disabled:opacity-50"
              disabled={updating}
            >
              {updating ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default UpdateProfile;
