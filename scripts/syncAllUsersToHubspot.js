import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import User from "../models/User.js";
import { syncContactToHubSpot } from "../services/hubspotService.js";

const syncAllUsers = async () => {
  try {
    console.log("🔄 Conectando a MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Conectado a MongoDB");

    // Obtener todos los usuarios de la base de datos
    const users = await User.find({});
    console.log(`📊 Se encontraron ${users.length} usuarios para sincronizar.`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`[${i + 1}/${users.length}] Procesando: ${user.email}...`);

      try {
        await syncContactToHubSpot({
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          age: user.age,
          interests: user.interests,
          department: user.department,
          isSubscriber: user.subscription?.isActive || false
        });

        successCount++;
        
        // Pausa de 200ms entre solicitudes para no saturar los límites de la API de HubSpot
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`❌ Error sincronizando a ${user.email}:`, err.message);
        errorCount++;
      }
    }

    console.log("\n==========================================");
    console.log(`🎉 ¡Sincronización completada!`);
    console.log(`✅ Éxito: ${successCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log("==========================================\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error general en la migración:", error);
    process.exit(1);
  }
};

syncAllUsers();