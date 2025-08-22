import React from 'react';
import { Link } from 'react-router-dom';

function Homepage() {
  return (
    <div>
      {/* Navbar will be rendered by App.js */}

      {/* Hero Section */}
      <section className="bg-blue-600 text-white py-20 px-4 h-screen">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between h-full">
          <div className="md:w-1/2 md:pr-8 mb-8 md:mb-0">
          <h1 className="text-4xl font-bold mb-4">Welcome to PresencePro</h1>
          <p className="text-xl mb-8">Your smart attendance system using QR codes.</p>
            {/* Call to Action Button */}
            <Link to="/login" className="bg-white text-blue-600 font-bold py-3 px-8 rounded-full text-lg hover:bg-gray-200 transition duration-300">
              Get Started
            </Link>
          </div>
           <div className="md:w-1/2">
            {/* Image Placeholder */}
            <img src="placeholder-hero.png" alt="PresencePro Hero" className="w-full h-auto rounded-lg shadow-lg" />
          </div>
        </div>
      </section>

      {/* About Section (moved here) */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">About PresencePro</h2>
          <p className="text-gray-700 leading-relaxed">
            PresencePro is a modern and efficient attendance management system designed to streamline the process of recording and tracking attendance using secure QR code technology. Our platform provides a simple and reliable solution for educational institutions and organizations to ensure accurate attendance records for students and participants.
          </p>
          {/* More detailed description can go here */}

          {/* Image Cards Section */}
          <div className="flex flex-col md:flex-row justify-center items-center space-y-8 md:space-y-0 md:space-x-8 mt-12"> {/* Added mt-12 for spacing */}
            {/* Image Card 1 */}
            <div className="max-w-sm rounded overflow-hidden shadow-lg bg-white">
              <img className="w-full h-48 object-cover" src="placeholder-about1.png" alt="About Image 1" />
              <div className="px-6 py-4 text-center">
                <div className="font-bold text-xl mb-2">Streamlined Process</div>
                <p className="text-gray-700 text-base">
                  Efficiently manage attendance with our easy-to-use system.
                </p>
              </div>
            </div>

            {/* Image Card 2 */}
            <div className="max-w-sm rounded overflow-hidden shadow-lg bg-white">
              <img className="w-full h-48 object-cover" src="placeholder-about2.png" alt="About Image 2" />
              <div className="px-6 py-4 text-center">
                <div className="font-bold text-xl mb-2">Secure Technology</div>
                <p className="text-gray-700 text-base">
                  Leverage secure QR code technology for reliable tracking.
                </p>
              </div>
            </div>

            {/* Image Card 3 */}
            <div className="max-w-sm rounded overflow-hidden shadow-lg bg-white">
              <img className="w-full h-48 object-cover" src="placeholder-about3.png" alt="About Image 3" />
              <div className="px-6 py-4 text-center">
                <div className="font-bold text-xl mb-2">Accurate Records</div>
                <p className="text-gray-700 text-base">
                  Ensure precise and reliable attendance records.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Features/Benefits Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">Why Choose PresencePro?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center">
              <img src="placeholder-feature1.png" alt="Feature 1" className="mx-auto mb-4 w-32 h-32 rounded-full object-cover shadow-md" />
              <h3 className="text-xl font-semibold mb-2">Efficient Attendance Tracking</h3>
              <p className="text-gray-700">Streamline attendance recording with quick and reliable QR code scanning.</p>
            </div>
            {/* Feature 2 */}
            <div className="text-center">
              <img src="placeholder-feature2.png" alt="Feature 2" className="mx-auto mb-4 w-32 h-32 rounded-full object-cover shadow-md" />
              <h3 className="text-xl font-semibold mb-2">User-Friendly Interface</h3>
              <p className="text-gray-700">An intuitive design for administrators, lecturers, and students.</p>
            </div>
            {/* Feature 3 */}
            <div className="text-center">
              <img src="placeholder-feature3.png" alt="Feature 3" className="mx-auto mb-4 w-32 h-32 rounded-full object-cover shadow-md" />
              <h3 className="text-xl font-semibold mb-2">Comprehensive Reporting</h3>
              <p className="text-gray-700">Generate detailed attendance reports for analysis and record-keeping.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto text-center px-4">
          <h2 className="text-3xl font-bold mb-8">Contact Us</h2>
          <p className="text-gray-700">
            If you have any questions or inquiries, please feel free to contact us.
          </p>
          <p className="text-gray-700 mt-4">Email: support@presencepro.com</p>
          {/* Contact Us Button/Link - Updated to link to /contact */}
          <Link to="/contact" className="mt-8 inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full text-lg transition duration-300">
            Contact Us Form
          </Link>
        </div>
      </section>

      {/* Footer can be added here or as a separate component */}
      <footer className="bg-gray-800 text-white py-8 text-center">
        <div className="container mx-auto px-4">
          <p>&copy; 2023 PresencePro. All rights reserved.</p>
          {/* Add links to privacy policy, terms, etc. */}
        </div>
      </footer>
    </div>
  );
}

export default Homepage;
