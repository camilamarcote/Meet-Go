import { google } from "googleapis";

const SPREADSHEET_ID = "1svmNFKF4ZD33Ro6RFAXXS9rHQpz-VQs4qksrBSY4cQA";
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

// Cargar credenciales desde Variable de Entorno (ideal para Render) o desde archivo local
function getAuthCredentials() {
  if (process.env.GOOGLE_CREDENTIALS) {
    try {
      // Si la credencial viene como texto JSON en las variables de entorno
      return JSON.parse(process.env.GOOGLE_CREDENTIALS);
    } catch (e) {
      console.error("❌ Error al parsear GOOGLE_CREDENTIALS desde env:", e.message);
    }
  }
  return null;
}

const credentials = getAuthCredentials();

const auth = new google.auth.GoogleAuth({
  ...(credentials ? { credentials } : { keyFile: "./google-credentials.json" }),
  scopes: SCOPES,
});

/**
 * Registra una lista de filas en Google Sheets
 */
export async function appendTicketsToSheet(rowsData) {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Hoja 1!A:G", // ⚠️ Verifica si en tu Excel abajo la pestaña se llama 'Hoja 1'
      valueInputOption: "USER_ENTERED",
      resource: {
        values: rowsData,
      },
    });

    console.log("📊 [SHEETS] Fila(s) enviada(s) con éxito a Google Sheets");
  } catch (error) {
    console.error("❌ [SHEETS ERROR] No se pudo guardar en Google Sheets:", error);
  }
}