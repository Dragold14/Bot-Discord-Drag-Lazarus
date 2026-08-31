require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const ROLES = [
  // STAFF
  ["STAFF_ROLE_ID", "Staff Test"],

  // RANG PHYS
  ["ROLE_SEPARATOR_RANK_PHYS_ID", "✦────Rang Physique────✦"],
  ["ROLE_GERANT_PHYS_ID", "Gérant - PHYS"],
  ["ROLE_CO_GERANT_PHYS_ID", "Co-Gérant - PHYS"],
  ["ROLE_OFFICIER_PHYS_ID", "Officier - PHYS"],
  ["ROLE_SOUS_OFFICIER_PHYS_ID", "Sous-Officier - PHYS"],
  ["ROLE_MDR_PHYS_ID", "Militaire du Rang - PHYS"],

  // DIVISION PHYS
  ["ROLE_SEPARATOR_DIV_PHYS_ID", "✦────Division Physique────✦"],
  ["ROLE_FANTASSIN_ID", "Fantassin"],

  // SPECIALISATIONS PHYS
  ["ROLE_SEPARATOR_SPEC_PHYS_ID", "✦────Spécialisation PHYS────✦"],
  ["ROLE_CQB_ID", "Unité CQB/CQC"],
  ["ROLE_APPUI_FEU_ID", "Unité d'Appui Feu"],
  ["ROLE_DEMOLITION_ID", "Unité de Démolition"],
  ["ROLE_TP_TE_ID", "Unité TP/TE"],

  // RANG PTOL
  ["ROLE_SEPARATOR_RANK_PTOL_ID", "✦────Rang Ptolémée────✦"],
  ["ROLE_GERANT_PTOL_ID", "Gérant - PTOL"],
  ["ROLE_CO_GERANT_PTOL_ID", "Co-Gérant - PTOL"],
  ["ROLE_OFFICIER_PTOL_ID", "Officier - PTOL"],
  ["ROLE_SOUS_OFFICIER_PTOL_ID", "Sous-Officier - PTOL"],
  ["ROLE_MDR_PTOL_ID", "Militaire du Rang - PTOL"],

  // DIVISION PTOL
  ["ROLE_SEPARATOR_DIV_PTOL_ID", "✦────Division Ptolémée────✦"],
  ["ROLE_PARTISAN_ID", "Partisan"],

  // SPECIALISATIONS PTOL
  ["ROLE_SEPARATOR_SPEC_PTOL_ID", "✦────Spécialisation PTOL────✦"],
  ["ROLE_MEDICAL_ID", "Opérateur Médical"],
  ["ROLE_DRONE_ID", "Opérateur Drône"],
  ["ROLE_MOTORISE_ID", "Opérateur Motorisé"],
  ["ROLE_GENIE_ID", "Opérateur du Génie"],
  ["ROLE_QUARTIER_MAITRE_ID", "Quartier-Maître"],

  // AUTRES
  ["ROLE_RD_ID", "Membre R&D"],
  ["ROLE_EXTRA_ID", "Personnel extra divisionnaire"],
  ["ROLE_HC_ID", "Haut Commandement"],
];

client.once("ready", async () => {
  try {
    const guild = await client.guilds.fetch(
      process.env.GUILD_ID
    );

    const existing =
      await guild.roles.fetch();

    const envLines = [];

    console.log(
      `\nCréation des rôles sur : ${guild.name}\n`
    );

    for (const [envName, roleName] of ROLES) {
      let role = existing.find(
        (r) => r.name === roleName
      );

      if (!role) {
        role = await guild.roles.create({
          name: roleName,
          reason: "Setup serveur DEV CMO",
        });

        console.log(
          `✅ Créé : ${roleName}`
        );
      } else {
        console.log(
          `⏭️ Existe déjà : ${roleName}`
        );
      }

      envLines.push(
        `${envName}=${role.id}`
      );
    }

    console.log(
      "\n\n========== À COPIER DANS .env ==========\n"
    );

    console.log(
      envLines.join("\n")
    );

    console.log(
      "\n=========================================\n"
    );
  } catch (error) {
    console.error(
      "Erreur création rôles :",
      error
    );
  } finally {
    client.destroy();
  }
});

client.login(
  process.env.DISCORD_TOKEN
);