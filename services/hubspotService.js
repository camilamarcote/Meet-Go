import { Client } from "@hubspot/api-client";

const hubspotClient = new Client({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
});

/**
 * Sincroniza la información de un usuario con HubSpot usando propiedades estándar.
 */
export async function syncContactToHubSpot(userData) {
  const { email, firstName, lastName, phone, age, interests, department, lastEventBought, isSubscriber } = userData;

  if (!email || !process.env.HUBSPOT_ACCESS_TOKEN) return;

  try {
    // 1. SOLO PROPIEDADES ESTÁNDAR NATIVAS DE HUBSPOT
    // Evita errores HTTP 400 por campos personalizados inexistentes.
    const properties = {
      email,
      ...(firstName && { firstname: firstName }),
      ...(lastName && { lastname: lastName }),
      ...(phone && { phone: phone }),
      ...(department && { city: department }), // 'city' es campo nativo para ubicación/departamento
    };

    // 2. PROPIEDADES PERSONALIZADAS (Opcionales)
    // Descomenta estas líneas ÚNICAMENTE cuando hayas creado las propiedades en la web de HubSpot
    // con sus nombres internos correspondientes:
    
    // if (age) properties.age = age.toString();
    // if (interests) properties.intereses_usuario = Array.isArray(interests) ? interests.join("; ") : interests;
    // if (lastEventBought) properties.ultimo_evento_comprado = lastEventBought;
    // if (typeof isSubscriber === "boolean") properties.es_suscriptor = isSubscriber ? "Sí" : "No";

    // Intentar crear el contacto
    const response = await hubspotClient.crm.contacts.basicApi.create({
      properties,
      associations: [],
    });

    console.log(`🎯 [HUBSPOT SUCCESS] Usuario creado en HubSpot (${email}) - ID: ${response.id}`);
    return response;

  } catch (error) {
    // Si el contacto ya existe (Error 409), actualizamos sus datos
    if (error.code === 409 || error.status === 409) {
      try {
        const propertiesToUpdate = {
          ...(firstName && { firstname: firstName }),
          ...(lastName && { lastname: lastName }),
          ...(phone && { phone: phone }),
          ...(department && { city: department }),
        };

        // Si creaste campos personalizados en HubSpot, descomenta los requeridos:
        // if (age) propertiesToUpdate.age = age.toString();
        // if (interests) propertiesToUpdate.intereses_usuario = Array.isArray(interests) ? interests.join("; ") : interests;

        const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
          filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: email }] }],
        });

        if (searchResponse.results.length > 0) {
          const contactId = searchResponse.results[0].id;
          await hubspotClient.crm.contacts.basicApi.update(contactId, { properties: propertiesToUpdate });
          console.log(`🎯 [HUBSPOT SUCCESS] Perfil de usuario actualizado en HubSpot (${email})`);
        }
      } catch (updateError) {
        console.error("❌ [HUBSPOT ERROR] Fallo al actualizar usuario:", updateError.message || updateError);
      }
    } else {
      console.error("❌ [HUBSPOT ERROR] Error procesando usuario:", error.message || error);
    }
  }
}