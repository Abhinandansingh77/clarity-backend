const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendWhatsAppMessage(to, message) {
  try {
    const response = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER, // sandbox number
      to: `whatsapp:${to}`,
      body: message
    });

    console.log("WhatsApp message sent:", response.sid);
  } catch (error) {
    console.error("WhatsApp error:", error.message);
  }
}

module.exports = sendWhatsAppMessage;
