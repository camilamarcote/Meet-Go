import { google } from "googleapis";

const SPREADSHEET_ID = "1svmNFKF4ZD33Ro6RFAXXS9rHQpz-VQs4qksrBSY4cQA";
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
 * Registra una lista de filas en Google Sheets
 */
export async function appendTicketsToSheet(rowsData) {
  try {
    const credentials = getAuthCredentials();

    const auth = new google.auth.GoogleAuth({
      ...(credentials ? { credentials } : { keyFile: "./google-credentials.json" }),
      scopes: SCOPES,
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "A:G", // 👈 Cambiado a A:G para que escriba en la primera pestaña sin importar cómo se llame
      valueInputOption: "USER_ENTERED",
      resource: {
        values: rowsData,
      },
    });

    console.log("📊 [SHEETS SUCCESS] Fila(s) enviada(s) con éxito a Google Sheets! Filas actualizadas:", response.data.updates?.updatedRows);
  } catch (error) {
    console.error("❌ [SHEETS API ERROR]:", error.message || error);
  }
}