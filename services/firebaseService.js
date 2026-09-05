import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Cargar las credenciales JSON
const serviceAccount = JSON.parse(
  readFileSync(new URL('../config/firebase-service-account.json', import.meta.url))
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

/**
 * Valida el idToken enviado desde el Frontend
 */
export const verifyFirebaseToken = async (idToken) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken; // Retorna datos del token incluyendo phone_number
  } catch (error) {
    console.error("❌ Error verificando Firebase Token:", error);
    throw new Error("Token de Firebase inválido o expirado");
  }
};