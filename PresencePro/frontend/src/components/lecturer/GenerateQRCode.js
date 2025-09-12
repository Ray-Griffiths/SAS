import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// This component is a modal for generating and displaying a QR code for a session.
const GenerateQRCodeModal = ({ isOpen, onClose, session }) => {
  const [duration, setDuration] = useState(10); // Default duration of 10 minutes
  const [qrCodeValue, setQrCodeValue] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when the modal is closed or the session changes
  useEffect(() => {
    if (!isOpen) {
      setQrCodeValue(null);
      setExpiresAt(null);
      setError(null);
      setDuration(10);
    }
  }, [isOpen]);

  if (!isOpen || !session) return null;

  // Function to call the backend and generate the QR code
  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post(`/api/sessions/${session.id}/qr`, { duration });
      // --- FIX: The backend now sends a base64 data URL, which is stored in state ---
      setQrCodeValue(response.data.qr_code_data);
      setExpiresAt(response.data.expires_at);
    } catch (err) {
      const errorMessage = err.response?.data?.message || `Failed to generate QR code: ${err.message}`;
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to download the displayed QR code as a PDF
  const handleDownloadPDF = () => {
    const input = document.getElementById('qr-code-display');
    if (input) {
      html2canvas(input, { scale: 4 }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = 100; // QR code size in PDF
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const x = (pdfWidth - imgWidth) / 2;
        const y = (pdfHeight - imgHeight) / 2;
        
        pdf.text(`QR Code for ${session.course_name}`, pdfWidth / 2, y - 20, { align: 'center' });
        pdf.text(`Session: ${session.session_date}`, pdfWidth / 2, y - 10, { align: 'center' });
        pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
        pdf.save(`qrcode-session-${session.id}.pdf`);
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
        <h3 className="text-2xl font-bold mb-4 text-gray-800">Generate QR Code</h3>
        <p className="text-gray-600 mb-4">Session on: <strong>{session.session_date}</strong> at <strong>{session.start_time}</strong></p>
        
        {error && <div className="p-3 mb-4 bg-red-100 text-red-700 rounded-md"><strong>Error:</strong> {error}</div>}

        {qrCodeValue ? (
          // View to display when QR code is generated
          <div className="text-center">
            <div id="qr-code-display" className="p-4 bg-white inline-block">
                {/* --- FIX: Display the QR code using an <img> tag with the base64 data URL --- */}
                <img src={qrCodeValue} alt="Generated QR Code" style={{ width: 256, height: 256 }} />
            </div>
            {expiresAt && (
              <p className="text-sm text-gray-600 mt-2">
                Expires at: {new Date(expiresAt).toLocaleTimeString()}
              </p>
            )}
            <div className="flex justify-center space-x-3 mt-4">
              <button onClick={handleDownloadPDF} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors">
                Download PDF
              </button>
              <button onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors">
                Close
              </button>
            </div>
          </div>
        ) : (
          // Initial view to set duration and generate
          <div>
            <div className="mb-4">
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">Set Active Duration (minutes)</label>
              <input
                type="number"
                id="duration"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                min="1"
              />
            </div>
            <div className="flex justify-end space-x-2">
               <button onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
                Cancel
              </button>
              <button onClick={handleGenerate} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-blue-300">
                {isLoading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerateQRCodeModal;
