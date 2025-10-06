
import React, { useState, useEffect, useRef } from 'react';
import { api, updateMyProfile, updateMyProfilePicture } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const Section = ({ title, children }) => (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-xl font-semibold text-gray-800 border-b pb-3 mb-4">{title}</h3>
        {children}
    </div>
);

const UpdateProfile = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState({ name: '', email: '' });
    const [password, setPassword] = useState({ current: '', new: '', confirm: '' });
    const [profilePicture, setProfilePicture] = useState(null);
    const [preview, setPreview] = useState(null);
    const fileInputRef = useRef();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState({ info: false, password: false, picture: false });
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    useEffect(() => {
        const fetchProfileData = async () => {
            setLoading(true);
            try {
                const res = await api.get('/api/my-profile');
                // --- FIX START: Correctly access nested profile data ---
                const profileData = res.data.profile; 
                
                // For students, the main display name is in `student_profile.name`.
                // For others, it's the `username`. This handles both cases.
                const displayName = profileData.student_profile?.name || profileData.username;

                setProfile({ name: displayName, email: profileData.email });
                setPreview(profileData.profile_picture_url || null);
                // --- FIX END ---
            } catch (error) {
                setFeedback({ type: 'error', message: 'Could not load your profile data.' });
            }
            setLoading(false);
        };
        fetchProfileData();
    }, [user]);

    const handleProfileChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });
    const handlePasswordChange = (e) => setPassword({ ...password, [e.target.name]: e.target.value });
    const handlePictureChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfilePicture(file);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleUpdateInfo = async (e) => {
        e.preventDefault();
        setSaving({ ...saving, info: true });
        setFeedback({ type: '', message: '' });
        try {
            await updateMyProfile(profile);
            setFeedback({ type: 'success', message: 'Profile information updated successfully!' });
        } catch (error) {
            setFeedback({ type: 'error', message: error.response?.data?.message || 'Failed to update profile.' });
        }
        setSaving({ ...saving, info: false });
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (password.new !== password.confirm) {
            setFeedback({ type: 'error', message: 'New passwords do not match.' });
            return;
        }
        setSaving({ ...saving, password: true });
        setFeedback({ type: '', message: '' });
        try {
            await updateMyProfile({ current_password: password.current, new_password: password.new });
            setFeedback({ type: 'success', message: 'Password changed successfully!' });
            setPassword({ current: '', new: '', confirm: '' });
        } catch (error) {
            setFeedback({ type: 'error', message: error.response?.data?.message || 'Failed to change password.' });
        }
        setSaving({ ...saving, password: false });
    };

    const handleUpdatePicture = async (e) => {
        e.preventDefault();
        if (!profilePicture) {
            setFeedback({ type: 'error', message: 'Please select an image file first.' });
            return;
        }
        setSaving({ ...saving, picture: true });
        setFeedback({ type: '', message: '' });
        const formData = new FormData();
        formData.append('profile_picture', profilePicture);
        try {
            const res = await updateMyProfilePicture(formData);
            setFeedback({ type: 'success', message: 'Profile picture updated successfully!' });
            // --- FIX START: Access the URL from the direct response data ---
            setPreview(res.profile_picture_url); 
            // --- FIX END ---
            fileInputRef.current.value = null; 
            setProfilePicture(null);
        } catch (error) {
            setFeedback({ type: 'error', message: error.response?.data?.message || 'Failed to upload picture.' });
        }
        setSaving({ ...saving, picture: false });
    };

    if (loading) return <div className="text-center p-10">Loading Profile...</div>;

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Update My Profile</h2>

            {feedback.message && (
                <div className={`p-4 rounded-md mb-6 ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {feedback.message}
                </div>
            )}

            <Section title="Profile Picture">
                <form onSubmit={handleUpdatePicture} className="flex items-center gap-6">
                    <img src={preview || '/default-avatar.png'} alt="Profile Preview" className="w-24 h-24 rounded-full object-cover" />
                    <div className="flex-grow">
                        <input type="file" accept="image/*" onChange={handlePictureChange} ref={fileInputRef} className="w-full p-2 border rounded-md file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                        <p className="text-xs text-gray-500 mt-2">Upload a new photo. Square images work best.</p>
                    </div>
                    <button type="submit" disabled={saving.picture || !profilePicture} className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                        {saving.picture ? 'Saving...' : 'Save'}
                    </button>
                </form>
            </Section>

            <Section title="Personal Information">
                <form onSubmit={handleUpdateInfo}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input type="text" name="name" value={profile.name} onChange={handleProfileChange} className="w-full p-2 border rounded-md" />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" name="email" value={profile.email} onChange={handleProfileChange} className="w-full p-2 border rounded-md" />
                    </div>
                    <div className="text-right">
                        <button type="submit" disabled={saving.info} className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                            {saving.info ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </Section>

            <Section title="Change Password">
                <form onSubmit={handleUpdatePassword}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input type="password" name="current" placeholder="Current Password" value={password.current} onChange={handlePasswordChange} className="p-2 border rounded-md" required />
                        <input type="password" name="new" placeholder="New Password" value={password.new} onChange={handlePasswordChange} className="p-2 border rounded-md" required />
                        <input type="password" name="confirm" placeholder="Confirm New Password" value={password.confirm} onChange={handlePasswordChange} className="p-2 border rounded-md" required />
                    </div>
                    <div className="text-right mt-4">
                        <button type="submit" disabled={saving.password} className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                            {saving.password ? 'Saving...' : 'Change Password'}
                        </button>
                    </div>
                </form>
            </Section>
        </div>
    );
};

export default UpdateProfile;
