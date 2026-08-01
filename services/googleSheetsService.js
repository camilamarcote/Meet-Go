const { google } = require('googleapis');
const path = require('path');

// Cargar credenciales desde el archivo JSON
const KEYFILEPATH = path.join(__dirname, 'google-credentials.json');

// Definir los permisos requeridos (Lectura y Escritura en Sheets)
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// ID de tu hoja de cálculo (Reemplázalo por tu ID real copiado en el Paso 2)
const SPREADSHEET_ID = 'TU_SPREADSHEET_ID_AQUI'; 

// Inicializar la autenticación
const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
});

/**
 * Agrega una nueva fila al final de la hoja de cálculo
 * @param {Array} rowData - Arreglo con los valores de la fila, ej: ['2026-08-01', 'Juan', 'juan@email.com']
 */
async function appendTicketToSheet(rowData) {
    try {
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Hoja 1!A:G', // Ajusta 'Hoja 1' según el nombre exacto de la pestaña abajo en tu Excel
            valueInputOption: 'USER_ENTERED', // Para que interprete fechas y números correctamente
            resource: {
                values: [rowData], // Recibe una lista de filas
            },
        });

        console.log('✅ Venta agregada exitosamente a Google Sheets');
        return response.data;
    } catch (error) {
        console.error('❌ Error guardando en Google Sheets:', error.message);
        // Tip: No lanzamos el error para no romper la transacción del usuario si falla Sheets
    }
}

module.exports = { appendTicketToSheet };