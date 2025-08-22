import React, { useState } from 'react';
import QRCode from 'qrcode.react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

function GenerateQRCode() {
  const [timeFrame, setTimeFrame] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [qrCodeValue, setQrCodeValue] = useState('');

  const handleGenerateQRCode = () => {
    // In a real application, you would interact with your backend here
    // to generate a unique attendance token based on the input details.
    // For demonstration, we'll just combine the inputs as the QR code value.
    const valueToEncode = `Time: ${timeFrame}, Course: ${courseCode}, Session: ${sessionCode}`;
    setQrCodeValue(valueToEncode);
  };

  const handleDownloadPDF = () => {
    const input = document.getElementById('qrcode-container'); // Give the QR code div an ID
    if (!input) {
      console.error('QR code container not found.');
      return;
    }

    html2canvas(input)
      .then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF();
        const imgWidth = 50; // Adjust as needed
        const pageHeight = pdf.internal.pageSize.height;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const marginLeft = (pdf.internal.pageSize.width - imgWidth) / 2;
        const marginTop = (pageHeight - imgHeight) / 2;

        pdf.addImage(imgData, 'PNG', marginLeft, marginTop, imgWidth, imgHeight);
        pdf.save('attendance_qr_code.pdf');
      })
      .catch((error) => {
        console.error('Error generating PDF:', error);
      });
  };

  const handleProject = () => {
    console.log('Project QR code');
  };

  return (
    <div>
      <h2>Generate Attendance QR Code</h2>
      <div>
        <label htmlFor="timeFrame">Time Frame:</label>
        <input
          type="text"
          id="timeFrame"
          value={timeFrame}
          onChange={(e) => setTimeFrame(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="courseCode">Course Code:</label>
        <input
          type="text"
          id="courseCode"
          value={courseCode}
          onChange={(e) => setCourseCode(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="sessionCode">Session Code:</label>
        <input
          type="text"
          id="sessionCode"
          value={sessionCode}
          onChange={(e) => setSessionCode(e.target.value)}
        />
      </div>
      <button onClick={handleGenerateQRCode}>Generate QR Code</button>

      {qrCodeValue && (
        <div>
          <h3 id="qrcode-container">Generated QR Code:</h3> {/* Added ID for PDF capture */}
          <QRCode value={qrCodeValue} size={256} level="H" />
          <div>
            <button onClick={handleDownloadPDF}>Download as PDF</button>
            <button onClick={handleProject}>Project</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GenerateQRCode;