import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDVD44IVcLfsKucAvI2dRwkiUxW085TqIE",
  authDomain: "pelaka-eed7a.firebaseapp.com",
  databaseURL: "https://pelaka-eed7a-default-rtdb.firebaseio.com",
  projectId: "pelaka-eed7a",
  appId: "1:565111419691:web:5a9cc7f05e85e126e30b6e",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

export { db };
