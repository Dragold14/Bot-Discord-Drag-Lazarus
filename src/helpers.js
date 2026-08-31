const {
  ActionRowBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

function safeText(value, maxLength = 1800) {
  if (value === null || value === undefined || value === "") {
    return "Non renseigné";
  }

  const cleaned = String(value).replace(/`/g, "ˋ").trim();
  if (!cleaned) return "Non renseigné";
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLength - 1))}…`;
}

function formatDateTimeFR(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${parts.day}/${parts.month}/${parts.year} à ${parts.hour}:${parts.minute}`;
}

function text(content) {
  return new TextDisplayBuilder().setContent(content);
}

function separator() {
  return new SeparatorBuilder();
}

function makeInput({
  id,
  label,
  placeholder,
  required = true,
  style = "short",
  maxLength,
}) {
  const discordStyle =
    style === "paragraph" ? TextInputStyle.Paragraph : TextInputStyle.Short;

  const input = new TextInputBuilder()
    .setCustomId(id)
    .setLabel(label.slice(0, 45))
    .setStyle(discordStyle)
    .setRequired(required)
    .setMaxLength(
      maxLength ?? (discordStyle === TextInputStyle.Paragraph ? 1500 : 120)
    );

  if (placeholder) input.setPlaceholder(placeholder.slice(0, 100));
  return new ActionRowBuilder().addComponents(input);
}

function getField(interaction, id) {
  try {
    return interaction.fields.getTextInputValue(id)?.trim() || "Non renseigné";
  } catch {
    return "Non renseigné";
  }
}

function mapMessageComponents(message, visitor) {
  const components = message.components.map((component) => component.toJSON());

  const walk = (component) => {
    visitor(component);
    if (Array.isArray(component.components)) component.components.forEach(walk);
    if (component.accessory) walk(component.accessory);
  };

  components.forEach(walk);
  return components;
}

function getMessageComponentText(message) {
  const chunks = [];
  mapMessageComponents(message, (component) => {
    if (typeof component.content === "string") chunks.push(component.content);
  });
  return chunks.join("\n");
}

function buildContestKey(userId, requestId) {
  return `${userId}:${requestId}`;
}

function quoteMessage(value) {
  const clean = safeText(value, 1800);
  return clean
    .split("\n")
    .map((line) => `> ${line || " "}`)
    .join("\n");
}

module.exports = {
  safeText,
  formatDateTimeFR,
  text,
  separator,
  makeInput,
  getField,
  mapMessageComponents,
  getMessageComponentText,
  buildContestKey,
  quoteMessage,
};
