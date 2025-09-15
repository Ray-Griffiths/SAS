
import React, { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real application, you would send this data to a backend.
    console.log('Form data submitted:', formData);
    setIsSubmitted(true);
    // Optional: Reset form after a few seconds
    setTimeout(() => {
        setIsSubmitted(false);
        setFormData({ name: '', email: '', subject: '', message: '' });
    }, 5000);
  };

  return (
    <div className="bg-gray-100 min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-gray-800">Get In Touch</h1>
          <p className="text-lg text-gray-600 mt-4">Have a question or a project in mind? We'd love to hear from you.</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-2xl p-8 md:p-12">
          {isSubmitted ? (
            <div className="text-center p-8">
              <h2 className="text-3xl font-bold text-green-500">Thank You!</h2>
              <p className="text-gray-700 mt-2">Your message has been sent successfully. We'll get back to you shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg focus:ring-4 focus:ring-indigo-300 focus:outline-none transition-shadow"
                        required
                      />
                  </div>
                  <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg focus:ring-4 focus:ring-indigo-300 focus:outline-none transition-shadow"
                        required
                      />
                  </div>
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg focus:ring-4 focus:ring-indigo-300 focus:outline-none transition-shadow"
                  required
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows="6"
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg focus:ring-4 focus:ring-indigo-300 focus:outline-none transition-shadow"
                  required
                ></textarea>
              </div>
              <div className="text-center">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-10 rounded-lg text-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-300"
                >
                  Send Message
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactForm;
