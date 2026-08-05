import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import User from "../models/User.js";
import { appendUserToSheet } from "../services/googleSheetsService.js";

const syncAllToSheets = async () => {
  try {
    console.log("🔄 Conectando a MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Conectado a MongoDB");

    const users = await User.find({});
    console.log(`📊 Se encontraron ${users.length} usuarios para exportar a Google Sheets...`);

    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      console.log(`[${i + 1}/${users.length}] Procesando: ${u.email}...`);

      await appendUserToSheet({
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        username: u.username,
        phone: u.phone,
        age: u.age,
        department: u.department,
        neighborhood: u.neighborhood,
        nationality: u.nationality,
        isSubscribed: u.subscription?.isActive || false,
        subscriptionPlan: u.subscription?.plan || null,
        languages: u.languages,
        interests: u.interests,
        personality: u.personality,
        isOrganizer: u.isOrganizer || false,
        groupPreference: u.experienceProfile?.socialStyle?.groupPreference || "",
        conversationStyle: u.experienceProfile?.socialStyle?.conversationStyle || "",
        createdAt: u.createdAt,
      });

      // Pausa para evitar rate limits de la API de Google
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    console.log("\n==========================================");
    console.log("🎉 ¡Todos los usuarios se sincronizaron con los datos completos!");
    console.log("==========================================\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error en la exportación masiva:", error);
    process.exit(1);
  }
};

syncAllToSheets();