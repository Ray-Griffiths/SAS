
import React, { useState, useEffect } from 'react';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

// A helper component for each setting row
const SettingInput = ({ a_key, description, value, onChange, type = 'text', a_placeholder }) => (
    <div>
        <label htmlFor={a_key} className="block text-sm font-medium text-gray-700">
            {description}
        </label>
        <div className="mt-1">
            <input
                type={type}
                name={a_key}
                id={a_key}
                value={value}
                onChange={onChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder={a_placeholder}
            />
        </div>
    </div>
);


const Settings = () => {
  const [settings, setSettings] = useState({
    session_timeout: '',
    qr_code_expiration: '',
    late_grace_period: '',
    application_timezone: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Define labels and descriptions for each setting
  const settingMeta = {
    session_timeout: { label: 'Session Timeout (minutes)', description: 'Idle time before a user is logged out.' },
    qr_code_expiration: { label: 'QR Code Expiration (seconds)', description: 'How long a QR code is valid for scanning.' },
    late_grace_period: { label: 'Late Grace Period (minutes)', description: 'Time after a session starts where students are still marked "Present".' },
    application_timezone: { label: 'Application Timezone', description: 'The default timezone for the application (e.g., UTC, America/New_York).' },
  };

  const getAuthToken = () => {
    return localStorage.getItem('access_token');
  };

  useEffect(() => {
    const fetchSettings = async () => {
      setError('');
      setLoading(true);
      try {
        const token = getAuthToken();
        const response = await fetch('/api/admin/settings', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch settings. Please ensure you are logged in as an administrator.');
        }

        const data = await response.json();
        setSettings(prevSettings => ({ ...prevSettings, ...data }));

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSettings(prevSettings => ({
      ...prevSettings,
      [name]: value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const token = getAuthToken();
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save settings.');
      }
      
      const result = await response.json();
      setSuccess(result.message);

    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Cog6ToothIcon className="h-8 w-8 text-indigo-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-800">Application Settings</h1>
        </div>
        
        {loading && <p className="text-center text-gray-500">Loading settings...</p>}
        
        {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
                <p className="font-bold">Error</p>
                <p>{error}</p>
            </div>
        )}

        {!loading && !error && (
            <form onSubmit={handleSave} className="bg-white p-8 rounded-lg shadow-md space-y-6">
                
                {Object.keys(settingMeta).map(key => (
                    <SettingInput 
                        key={key}
                        a_key={key}
                        description={settingMeta[key].label}
                        value={settings[key] || ''}
                        onChange={handleInputChange}
                        type={key.includes('timeout') || key.includes('period') || key.includes('expiration') ? 'number' : 'text'}
                        a_placeholder={settingMeta[key].description}
                    />
                ))}

                <div className="pt-4 flex justify-end items-center">
                    {success && <p className="text-green-600 mr-4">{success}</p>}
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        )}
      </div>
    </div>
  );
};

export default Settings;
