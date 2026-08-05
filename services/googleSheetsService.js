import { google } from "googleapis";
import fs from "fs";

// ID de tu hoja de tickets (la original)
const TICKETS_SPREADSHEET_ID = "1svmNFKF4ZD33Ro6RFAXXS9rHQpz-VQs4qksrBSY4cQA";

// ID de tu nueva hoja de usuarios registrada
const USERS_SPREADSHEET_ID = process.env.GOOGLE_USERS_SHEET_ID || "1jQdzMnmbEGnjryXNjrBt_H8x-oNLbRKYE_qdNQOrtIE";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

function getAuthCredentials() {
  if (process.env.GOOGLE_CREDENTIALS) {
    try {
      const rawEnv = process.env.GOOGLE_CREDENTIALS.trim();
      return JSON.parse(rawEnv);
    } catch (e) {
      console.error("❌ [SHEETS ERROR] Error parseando la variable GOOGLE_CREDENTIALS:", e.message);
    }
  } else {
    console.warn("⚠️ [SHEETS WARNING] No se encontró la variable GOOGLE_CREDENTIALS en process.env");
  }
  return null;
}

/**
 * Obtiene el cliente autenticado de Google Sheets
 */
async function getSheetsClient() {
  const credentials = getAuthCredentials();
  const localCredentialPath = "./google-credentials.json";

  if (!credentials && !fs.existsSync(localCredentialPath)) {
    throw new Error("No se encontraron credenciales válidas (ni en variable de entorno ni archivo local).");
  }

  const auth = new google.auth.GoogleAuth({
    ...(credentials ? { credentials } : { keyFile: localCredentialPath }),
    scopes: SCOPES,
  });

  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client });
}

/**
 * Registra una lista de filas de tickets en Google Sheets (Mantenemos tu función existente intacta)
 */
export async function appendTicketsToSheet(rowsData) {
  try {
    const sheets = await getSheetsClient();

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: TICKETS_SPREADSHEET_ID,
      range: "A:G",
      valueInputOption: "USER_ENTERED",
      resource: {
        values: rowsData,
      },
    });

    console.log("📊 [SHEETS SUCCESS] ¡Fila(s) de tickets enviada(s) con éxito! Filas actualizadas:", response.data.updates?.updatedRows);
  } catch (error) {
    console.error("❌ [SHEETS API ERROR en tickets]:", error.message || error);
  }
}

/**
 * Registra o actualiza un usuario en la hoja "Base de Usuarios"
 */
/**
 * Registra o actualiza un usuario en la hoja "Base de Usuarios"
 */
export async function appendUserToSheet(userData) {
  try {
    const {
      email,
      firstName,
      lastName,
      username,
      phone,
      age,
      department,
      neighborhood,
      nationality,
      isSubscribed,
      subscriptionPlan,
      languages,
      interests,
      personality,
      isOrganizer,
      groupPreference,
      conversationStyle,
      createdAt
    } = userData;

    if (!email) return;

    const sheets = await getSheetsClient();

    // Formatear arrays y fechas
    const formattedLanguages = Array.isArray(languages) ? languages.join(", ") : languages || "";
    const formattedInterests = Array.isArray(interests) ? interests.join(", ") : interests || "";
    const dateFormatted = createdAt ? new Date(createdAt).toLocaleDateString("es-UY") : new Date().toLocaleDateString("es-UY");

    // Fila estructurada con todos los datos clave del schema
    const row = [
      email || "",
      firstName || "",
      lastName || "",
      username || "",
      phone || "",
      age ? age.toString() : "",
      department || "",
      neighborhood || "",
      nationality || "Uruguay",
      isSubscribed ? "Sí" : "No",
      subscriptionPlan || "Ninguno",
      formattedLanguages,
      formattedInterests,
      personality || "",
      isOrganizer ? "Sí" : "No",
      groupPreference || "",
      conversationStyle || "",
      dateFormatted
    ];

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: "A:R", // Abarca de la columna A a la R (18 columnas)
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [row],
      },
    });

    console.log(`📊 [SHEETS SUCCESS] Usuario agregado a Google Sheets (${email})`);
  } catch (error) {
    console.error("❌ [SHEETS API ERROR en usuarios]:", error.message || error);
  }
}