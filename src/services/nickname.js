const { getMessageComponentText } = require("../helpers");

const DISCORD_NICKNAME_MAX = 32;

function cleanIdentityValue(value) {
  if (!value) return "";
  const cleaned = String(value)
    .replace(/[\r\n|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned === "Non renseigné" ? "" : cleaned;
}

function extractInlineField(content, labels) {
  const wanted = new Set(labels.map((label) => `**${label}**`));
  const lines = String(content || "").split("\n");

  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!wanted.has(lines[index].trim())) continue;

    const valueLine = lines[index + 1].trim();
    if (valueLine.startsWith("`") && valueLine.endsWith("`")) {
      return cleanIdentityValue(valueLine.slice(1, -1));
    }
  }

  return "";
}

function extractRequestIdentity(message) {
  const content = getMessageComponentText(message);
  return {
    matricule: extractInlineField(content, ["Matricule"]),
    nomPrenom: extractInlineField(content, ["Prénom / Nom", "Nom / Prénom"]),
    nomCode: extractInlineField(content, [
      "Nom de code (facultatif)",
      "Nom de code",
    ]),
  };
}

function buildIdentityDisplayName(nomPrenom) {
  const parts = cleanIdentityValue(nomPrenom).split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0];

  const firstName = parts.shift();
  const familyName = parts.join(" ");
  return `${firstName.charAt(0).toUpperCase()}.${familyName}`;
}

function buildNickname({ matricule, nomPrenom, nomCode }) {
  const cleanMatricule = cleanIdentityValue(matricule);
  const displayName =
    cleanIdentityValue(nomCode) || buildIdentityDisplayName(nomPrenom);
  if (!cleanMatricule || !displayName) return null;

  return `${cleanMatricule} | ${displayName}`.slice(0, DISCORD_NICKNAME_MAX);
}

async function applyRequestNickname(member, request, message) {
  if (request?.category !== "major") {
    return { skipped: true, ok: true, nickname: null };
  }

  const identity = extractRequestIdentity(message);
  const nickname = buildNickname(identity);
  if (!nickname) {
    return {
      skipped: false,
      ok: false,
      nickname: null,
      error: "Identité insuffisante pour générer le pseudo.",
    };
  }

  if (!member.manageable) {
    return {
      skipped: false,
      ok: false,
      nickname,
      error: "Le membre est au-dessus du bot dans la hiérarchie Discord.",
    };
  }

  try {
    await member.setNickname(nickname, `Accréditation ${request.label} validée`);
    return { skipped: false, ok: true, nickname };
  } catch (error) {
    return {
      skipped: false,
      ok: false,
      nickname,
      error: error?.message || "Renommage Discord impossible.",
    };
  }
}

module.exports = {
  extractRequestIdentity,
  buildNickname,
  applyRequestNickname,
};
