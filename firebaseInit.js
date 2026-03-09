// firebaseInit.js – ES module version using CDN imports

// Import the Firebase core SDK (modular) from the official CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
// If you need other products, import them similarly, e.g.:
// import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration (provided by you)
const firebaseConfig = {
    apiKey: "AIzaSyB11wcijqj38zXK9RM-0Je8owVNlesX1nQ",
    authDomain: "coffee-spark-ai-barista-d7d8c.firebaseapp.com",
    projectId: "coffee-spark-ai-barista-d7d8c",
    storageBucket: "coffee-spark-ai-barista-d7d8c.firebasestorage.app",
    messagingSenderId: "1094114951578",
    appId: "1:1094114951578:web:18e0e8b528870215c4ba23"
};

// Initialise Firebase – this creates a global `firebase` namespace for compat APIs
// and also returns the modular app instance.
export const firebaseApp = initializeApp(firebaseConfig);
console.log("[Firebase] Initialized (modular import) – app ready");
