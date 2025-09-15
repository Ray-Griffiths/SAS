import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { 
    MagnifyingGlassIcon, FunnelIcon, ArrowDownTrayIcon, ChevronDownIcon, 
    ExclamationTriangleIcon, InformationCircleIcon, ShieldCheckIcon 
} from '@heroicons/react/24/solid';

// Log Level styling
const logLevelStyles = {
    INFO: {
        icon: <InformationCircleIcon className="h-5 w-5 text-blue-500" />,
        badge: "bg-blue-100 text-blue-800",
        text: "text-blue-700",
    },
    WARNING: {
        icon: <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />,
        badge: "bg-yellow-100 text-yellow-800",
        text: "text-yellow-700",
    },
    ERROR: {
        icon: <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />,
        badge: "bg-red-100 text-red-800",
        text: "text-red-700",
    },
    SECURITY: {
        icon: <ShieldCheckIcon className="h-5 w-5 text-purple-500" />,
        badge: "bg-purple-100 text-purple-800",
        text: "text-purple-700",
    },
    default: {
        icon: <InformationCircleIcon className="h-5 w-5 text-gray-500" />,
        badge: "bg-gray-100 text-gray-800",
        text: "text-gray-700",
    }
};

const SystemLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedLogRow, setExpandedLogRow] = useState(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [logLevel, setLogLevel] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/admin/system-logs', {
                params: {
                    page: currentPage,
                    search: searchTerm,
                    level: logLevel,
                    start_date: dateRange.start,
                    end_date: dateRange.end,
                },
            });
            setLogs(response.data.logs || []);
            setTotalPages(response.data.pages || 1);
            setError('');
        } catch (err) {
            setError('Failed to fetch system logs. Please try again later.');
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchTerm, logLevel, dateRange]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Real-time updates
    useEffect(() => {
        const interval = setInterval(() => {
            fetchLogs();
        }, 30000); // Poll every 30 seconds

        return () => clearInterval(interval);
    }, [fetchLogs]);

    const handleExport = async () => {
        try {
            const params = {
                search: searchTerm,
                level: logLevel,
                start_date: dateRange.start,
                end_date: dateRange.end,
            };

            const response = await api.get('/api/admin/system-logs/export', {
                params,
                responseType: 'blob', // Important to handle file downloads
            });

            // Create a URL from the response blob
            const url = window.URL.createObjectURL(new Blob([response.data]));
            
            // Create a temporary link to trigger the download
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'system_logs_export.csv');
            
            // Append, click, and remove the link
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            
            // Clean up the object URL
            window.URL.revokeObjectURL(url);

        } catch (err) {
            console.error('Failed to export system logs:', err);
            setError('Failed to export logs. The server might be down or an error occurred.');
        }
    };

    const handleRowClick = (logId) => {
        setExpandedLogRow(expandedLogRow === logId ? null : logId);
    };

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">System Logs</h1>

            {/* Filter and Control Bar */}
            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute top-1/2 left-3 -translate-y-1/2"/>
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1); // Reset to first page
                            }}
                            className="w-full p-3 pl-10 border border-gray-300 rounded-lg"
                        />
                    </div>
                    {/* Log Level Filter */}
                    <div>
                        <select
                            value={logLevel}
                            onChange={(e) => {
                                setLogLevel(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full p-3 border border-gray-300 rounded-lg"
                        >
                            <option value="all">All Levels</option>
                            <option value="INFO">Info</option>
                            <option value="WARNING">Warning</option>
                            <option value="ERROR">Error</option>
                            <option value="SECURITY">Security</option>
                        </select>
                    </div>
                    {/* Date Range Filter */}
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-lg"
                        />
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-lg"
                        />
                    </div>
                    {/* Export Button */}
                    <div className="flex items-center">
                        <button
                            onClick={handleExport}
                            className="w-full md:w-auto inline-flex items-center justify-center px-4 py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition-colors"
                        >
                            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                            Export
                        </button>
                    </div>
                </div>
            </div>

            {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

            {/* Logs Table */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Timestamp</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Action</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Description</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan="5" className="text-center py-10">Loading logs...</td></tr>
                            ) : logs.length > 0 ? (
                                logs.map((log) => (
                                    <React.Fragment key={log.id}>
                                        <tr onClick={() => handleRowClick(log.id)} className="hover:bg-gray-50 cursor-pointer">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${logLevelStyles[log.level]?.badge || logLevelStyles.default.badge}`}>
                                                    {log.level}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(log.timestamp).toLocaleString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-medium">{log.user || 'System'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{log.action}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-xs">{log.description}</td>
                                        </tr>
                                        {expandedLogRow === log.id && (
                                            <tr className="bg-gray-100">
                                                <td colSpan="5" className="px-6 py-4">
                                                    <div className="text-sm text-gray-800">
                                                        <h4 className="font-bold mb-2">Log Details:</h4>
                                                        <pre className="whitespace-pre-wrap bg-gray-200 p-3 rounded-md">{JSON.stringify(log.details, null, 2)}</pre>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            ) : (
                                <tr><td colSpan="5" className="text-center py-10 text-gray-500">No logs found matching your criteria.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-6">
                <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                    Previous
                </button>
                <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
                <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default SystemLogs;
