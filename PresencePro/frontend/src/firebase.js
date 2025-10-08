
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA2LeIacgQ5NiLbsL_kXCfgspEP4fjW1Yc",
  authDomain: "sas-29543974-79902.firebaseapp.com",
  projectId: "sas-29543974-79902",
  storageBucket: "sas-29543974-79902.appspot.com",
  messagingSenderId: "539204944881",
  appId: "1:539204944881:web:13212ee3199815a6897a50"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the initialized app for use in other parts of your application
export default app;
