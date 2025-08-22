import React, { useEffect, useState, useRef } from 'react'; // Import useRef
import { Html5QrcodeScanner } from 'html5-qrcode';
import { recordAttendance } from '../../services/api'; // Corrected named import

const ScanQrCode = ({ onScanSuccess: propOnScanSuccess }) => { // Accept onScanSuccess as a prop
  const [scanResult, setScanResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [studentIndexInput, setStudentIndexInput] = useState(''); // State for student index input
  const [scannedSessionId, setScannedSessionId] = useState(null); // State for scanned session ID
  const [scannedQrCodeUuid, setScannedQrCodeUuid] = useState(null); // State for scanned QR code UUID
  const [isSubmitting, setIsSubmitting] = useState(false); // State for submission loading
  const scannerRef = useRef(null); // Ref to store the scanner instance

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'reader',
      {
        qrbox: {
          width: 250,
          height: 250,
        },
        fps: 5,
      },
      false // Verbose mode
    );

    scannerRef.current = scanner; // Store the scanner instance in the ref

    const onScanSuccess = async (decodedText, decodedResult) => { // Define onScanSuccess inside useEffect
      // Handle the scanned code
      console.log(`QR Code scanned: ${decodedText}`);
      setScanResult(decodedText);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        // Assume decodedText is a JSON string containing sessionId and qrCodeUuid
        const qrData = JSON.parse(decodedText);
        const sessionId = qrData.sessionId;
        const qrCodeUuid = qrData.qrCodeUuid;

        if (!sessionId || !qrCodeUuid) {
          setErrorMessage('Scanned QR code does not contain valid session data.');
          // Optionally stop scanning or show a specific error UI
          // scanner.clear();
          return;
        }

        // Set the scanned session ID and QR code UUID
        setScannedSessionId(sessionId);
        setScannedQrCodeUuid(qrCodeUuid);


        // Stop scanning after a successful scan
        if (scannerRef.current) {
           scannerRef.current.clear();
           console.log('Scanner stopped.');
        }

        // Call the prop function if provided
        if (propOnScanSuccess) {
          propOnScanSuccess(qrData);
        }


      } catch (error) {
        console.error('Error parsing QR code data:', error);
        setErrorMessage(`Failed to process QR code: ${error.message || 'Invalid QR code format.'}`);
        setSuccessMessage(null); // Clear any previous success
         // Optionally keep scanning or show a specific error UI
         // scanner.clear();
      }
    };

    const onScanError = (errorMessage) => {
      // Handle scan errors
      // console.error(`QR Code scan error: ${errorMessage}`);
      // setErrorMessage(`Scanning error: ${errorMessage}`); // Optional: display scanning errors
    };

    // Start the scanner
    scanner.render(onScanSuccess, onScanError);

    // Cleanup function to stop the scanner when the component unmounts
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
          console.log('Scanner cleaned up.');
        } catch (error) {
          console.error('Error cleaning up scanner:', error);
        }
      }
    };
  }, []);

   // Effect to clear messages after a few seconds
  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setErrorMessage(null);
      }, 5000); // Clear after 5 seconds

      return () => clearTimeout(timer); // Clear timeout if component unmounts or messages change
    }
  }, [successMessage, errorMessage]); // Rerun effect when successMessage or errorMessage changes


  // Handle student index number submission
  const handleSubmitAttendance = async (event) => {
    event.preventDefault(); // Prevent default form submission

    if (!studentIndexInput) {
      setErrorMessage('Please enter your Student Index Number.');
      return;
    }

    if (!scannedSessionId || !scannedQrCodeUuid) {
        setErrorMessage('No session data scanned. Please scan the QR code again.');
        return;
    }

    setIsSubmitting(true); // Set submitting state to true
    setErrorMessage(null); // Clear previous errors
    setSuccessMessage(null); // Clear previous success message

    try {
      console.log(`Attempting to record attendance for session: ${scannedSessionId} with student index: ${studentIndexInput}`);
      // Call the backend API to record attendance
      const response = await recordAttendance(scannedSessionId, studentIndexInput, scannedQrCodeUuid); // Pass all required data

      if (response.status === 'success') { // Assuming backend sends a status field on success
        setSuccessMessage('Attendance recorded successfully!');
        setErrorMessage(null); // Clear any previous error

         // Clear states and restart scanner for the next scan
        setStudentIndexInput('');
        setScannedSessionId(null);
        setScannedQrCodeUuid(null);
        if (scannerRef.current) {
             // Note: We don't need to pass onScanSuccess and onScanError again
             // if they are stable function references outside of handleSubmitAttendance.
             // However, passing them ensures the scanner uses the latest state if needed.
             // For simplicity here, I'm passing them again. Consider memoization if needed.
             scannerRef.current.render(onScanSuccess, onScanError); // Restart scanner
             console.log('Scanner restarted.');
          }


      } else { // Assuming backend sends a message field on error
          setErrorMessage(response.message || 'Failed to record attendance.');
           setSuccessMessage(null); // Clear any previous success
           // Keep the scanned data and input field visible for correction
      }

    } catch (error) {
      console.error('Error recording attendance:', error);
      setErrorMessage(`Failed to record attendance: ${error.message || 'An unexpected error occurred.'}`);
      setSuccessMessage(null); // Clear any previous success
      // Keep the scanned data and input field visible for correction
    } finally {
        setIsSubmitting(false); // Set submitting state to false
    }
  };


  return (
    <div className="container mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Scan QR Code for Attendance</h2>
      <div id="reader" className="w-full max-w-md mx-auto"></div>

      {/* Conditionally render input for student index */}
      {scannedSessionId && !successMessage && !errorMessage && (
          <form onSubmit={handleSubmitAttendance} className="mt-4 flex flex-col items-center">
              <label htmlFor="studentIndex" className="block text-gray-700 text-sm font-bold mb-2">
                  Enter your Student Index Number:
              </label>
              <input
                  type="text"
                  id="studentIndex"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline max-w-sm"
                  value={studentIndexInput}
                  onChange={(e) => setStudentIndexInput(e.target.value)}
                  required
                  disabled={isSubmitting} // Disable input while submitting
              />
              <button
                  type="submit"
                  className={`mt-4 px-4 py-2 font-semibold rounded-md shadow focus:outline-none focus:ring-2 focus:ring-opacity-50 ${isSubmitting ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}`}
                  disabled={isSubmitting} // Disable button while submitting
              >
                  {isSubmitting ? 'Submitting...' : 'Submit Attendance'}
              </button>
          </form>
      )}


      {successMessage && (
        <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-md">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-md">
          {errorMessage}
        </div>
      )}

      {/* The scanResult display is now less relevant with the input workflow */}
      {/* You might choose to remove or modify this based on your UI preference */}
      {/* {scanResult && !successMessage && !errorMessage && !scannedSessionId && (
        <div className="mt-4 p-3 bg-blue-100 text-blue-800 rounded-md">
          Last scanned raw data: {scanResult}
        </div>
      )} */}
    </div>
  );
};

export default ScanQrCode;
