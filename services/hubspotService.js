import { Client } from "@hubspot/api-client";

const hubspotClient = new Client({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
});

export async function syncContactToHubSpot(userData) {
  const { email, firstName, lastName, phone, age, interests, department, lastEventBought, isSubscriber } = userData;

  if (!email || !process.env.HUBSPOT_ACCESS_TOKEN) return;

  try {
    const interestsString = Array.isArray(interests) ? interests.join("; ") : interests || "";

    // Mapeo seguro a campos nativos y personalizados
    const properties = {
      email,
      ...(firstName && { firstname: firstName }),
      ...(lastName && { lastname: lastName }),
      ...(phone && { phone }),
      ...(department && { city: department }), // Usa 'city' que es el estándar de HubSpot
    };

    // Agregar solo si existen o si ya los creaste en HubSpot:
    if (age) properties.age = age.toString();
    if (interestsString) properties.intereses_usuario = interestsString;
    if (lastEventBought) properties.ultimo_evento_comprado = lastEventBought;
    if (typeof isSubscriber === "boolean") properties.es_suscriptor = isSubscriber ? "Sí" : "No";

    // Intentar crear el contacto
    const response = await hubspotClient.crm.contacts.basicApi.create({
      properties,
      associations: [],
    });

    console.log(`🎯 [HUBSPOT SUCCESS] Usuario registrado en HubSpot (${email}) - ID: ${response.id}`);
    return response;

  } catch (error) {
    if (error.code === 409 || error.status === 409) {
      try {
        const interestsString = Array.isArray(interests) ? interests.join("; ") : interests || "";
        
        const propertiesToUpdate = {
          ...(firstName && { firstname: firstName }),
          ...(lastName && { lastname: lastName }),
          ...(phone && { phone }),
          ...(department && { city: department }),
        };

        if (age) propertiesToUpdate.age = age.toString();
        if (interestsString) propertiesToUpdate.intereses_usuario = interestsString;
        if (lastEventBought) propertiesToUpdate.ultimo_evento_comprado = lastEventBought;

        const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
          filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: email }] }],
        });

        if (searchResponse.results.length > 0) {
          const contactId = searchResponse.results[0].id;
          await hubspotClient.crm.contacts.basicApi.update(contactId, { properties: propertiesToUpdate });
          console.log(`🎯 [HUBSPOT SUCCESS] Perfil actualizado en HubSpot (${email})`);
        }
      } catch (updateError) {
        console.error("❌ [HUBSPOT ERROR] Fallo al actualizar usuario:", updateError.message || updateError);
      }
    } else {
      console.error("❌ [HUBSPOT ERROR] Error procesando usuario:", error.message || error);
    }
  }
}