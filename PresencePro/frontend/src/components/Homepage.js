
import React from 'react';
import { Link } from 'react-router-dom';
import { FaQrcode, FaChartLine, FaUsers, FaUniversity, FaSchool, FaBuilding, FaChalkboardTeacher } from 'react-icons/fa';

const FeatureCard = ({ icon, title, text }) => (
  <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center text-center transform hover:scale-105 transition-transform duration-300">
    <div className="text-indigo-500 mb-4">{icon}</div>
    <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
    <p className="text-gray-600">{text}</p>
  </div>
);

const StepCard = ({ icon, title, description }) => (
    <div className="bg-white rounded-xl shadow-lg p-8 flex items-center space-x-6">
        <div className="text-4xl text-indigo-600">{icon}</div>
        <div>
            <h3 className="text-2xl font-bold text-gray-800">{title}</h3>
            <p className="text-gray-600 mt-1">{description}</p>
        </div>
    </div>
);

const WhoIsItForCard = ({ icon, title }) => (
    <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-lg shadow-md">
        <div className="text-4xl text-indigo-500 mb-4">{icon}</div>
        <h4 className="text-lg font-semibold text-gray-800">{title}</h4>
    </div>
);

const TestimonialCard = ({ quote, author, position }) => (
    <div className="bg-indigo-50 p-8 rounded-xl shadow-md">
        <p className="text-gray-600 italic mb-4">"{quote}"</p>
        <p className="font-bold text-gray-800">{author}</p>
        <p className="text-sm text-indigo-500">{position}</p>
    </div>
);

function Homepage() {
  return (
    <div className="bg-white text-gray-800 font-sans">
      {/* Hero Section */}
      <section className="relative text-white min-h-screen flex items-center justify-center text-center px-4 bg-gradient-to-r from-indigo-800 to-purple-800">
        <div className="z-10">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-4 leading-tight">Welcome to PresencePro</h1>
          <p className="text-xl md:text-2xl mb-8 font-light">The future of attendance tracking is here. Simple, secure, and seamless.</p>
          <Link to="/login" className="bg-teal-400 text-gray-900 font-bold py-3 px-10 rounded-full text-lg hover:bg-teal-300 transition-all duration-300 transform hover:scale-110">
            Get Started
          </Link>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-100">
          <div className="container mx-auto px-4">
              <h2 className="text-4xl font-bold text-center mb-12">How It Works in 3 Simple Steps</h2>
              <div className="flex flex-col md:flex-row justify-center items-stretch gap-8">
                  <StepCard icon={<FaChalkboardTeacher />} title="Create & Display" description="Lecturers create a session and a unique, secure QR code is instantly generated." />
                  <StepCard icon={<FaQrcode />} title="Scan & Go" description="Students scan the QR code with their smartphone to instantly mark their attendance." />
                  <StepCard icon={<FaChartLine />} title="Track & Analyze" description="View real-time data, generate insightful reports, and identify at-risk students." />
              </div>
          </div>
      </section>


      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">Why PresencePro is the Right Choice</h2>
          <div className="grid md:grid-cols-3 gap-10">
            <FeatureCard icon={<FaQrcode size={40} />} title="Effortless QR Scanning" text="No more paper, no more manual entry. Just a quick scan for instant check-ins." />
            <FeatureCard icon={<FaChartLine size={40} />} title="Advanced Reporting" text="Gain deep insights with our comprehensive reports on attendance trends and student engagement." />
            <FeatureCard icon={<FaUsers size={40} />} title="User-Friendly for All" text="Intuitive dashboards for Admins, Lecturers, and Students on both web and mobile." />
          </div>
        </div>
      </section>

      {/* Who is it for? Section */}
       <section className="py-20 bg-gray-100">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-12">Designed for Educational Excellence</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
               <WhoIsItForCard icon={<FaUniversity />} title="Universities" />
               <WhoIsItForCard icon={<FaSchool />} title="Colleges & Schools" />
               <WhoIsItForCard icon={<FaBuilding />} title="Corporate Training" />
            </div>
        </div>
      </section>

      {/* Testimonials Section */}
       <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">Trusted by Educators & Students</h2>
          <div className="grid md:grid-cols-2 gap-10 max-w-4xl mx-auto">
              <TestimonialCard 
                  quote="PresencePro has revolutionized how I manage my lectures. The at-risk student report is a game-changer for me."
                  author="Dr. Eleanor Vance"
                  position="Senior Lecturer, Dept. of Computer Science"
              />
              <TestimonialCard 
                  quote="It’s so much easier than passing around a sheet of paper. I just scan the code and I’m done. Super simple."
                  author="Ben Carter"
                  position="Final Year Engineering Student"
              />
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="bg-gray-800 text-white py-10">
        <div className="container mx-auto text-center">
          <p>&copy; 2024 PresencePro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Homepage;
