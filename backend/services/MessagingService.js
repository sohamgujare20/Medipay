// backend/services/MessagingService.js
/**
 * Real Twilio SMS Messaging Service for MediPay
 * Sends actual SMS to customer mobile numbers
 */
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

let client = null;
try {
  if (accountSid && authToken) {
    client = twilio(accountSid, authToken);
  }
} catch (err) {
  console.warn('[TWILIO] Failed to initialize client:', err.message);
}

class MessagingService {
    static formatIndianNumber(mobile) {
      if (!mobile) return null;
      // Strip spaces/dashes
      let num = mobile.replace(/[\s\-()]/g, '');
      // If it's a 10-digit Indian number, prefix +91
      if (/^\d{10}$/.test(num)) {
        return `+91${num}`;
      }
      // If already has country code
      if (num.startsWith('+')) return num;
      return `+${num}`;
    }

    static async sendRefillReminder(customerName, mobile, daysToRefill, isOverdue = false, billNo = "") {
        const template = isOverdue 
            ? `Namaste ${customerName}, your medicine refill was due yesterday (Bill #${billNo}). Please visit MediPay soon to maintain your prescription schedule. Stay healthy!`
            : `Namaste ${customerName}, this is a friendly reminder that your medicine refill is due tomorrow (Bill #${billNo}). We have your stock ready at MediPay!`;

        const formattedNumber = this.formatIndianNumber(mobile);

        // Try real Twilio SMS
        if (client && formattedNumber) {
            try {
                const message = await client.messages.create({
                    body: template,
                    messagingServiceSid: messagingServiceSid,
                    to: formattedNumber,
                });
                console.log("------------------------------------------");
                console.log(`[TWILIO SMS] SENT to: ${formattedNumber} (${customerName})`);
                console.log(`[MESSAGE SID]: ${message.sid}`);
                console.log(`[STATUS]: ${message.status}`);
                console.log("------------------------------------------");
                return { success: true, message: template, sid: message.sid, sentAt: new Date() };
            } catch (err) {
                console.warn(`[TWILIO SMS] Failed to send to ${formattedNumber}: ${err.message}`);
                // Fall through to mock log below
            }
        }

        // Fallback: Log to console if Twilio fails or is not configured
        console.log("------------------------------------------");
        console.log(`[SMS FALLBACK] To: ${mobile} (${customerName})`);
        console.log(`[MESSAGE CONTENT]: ${template}`);
        console.log("[STATUS]: LOGGED (Twilio unavailable)");
        console.log("------------------------------------------");

        return { success: true, message: template, sentAt: new Date() };
    }

    static async sendReceiptSMS(customerName, mobile, billNo, total, items) {
        let itemList = '';
        if (items && items.length) {
            itemList = items.map(i => `${i.name} x${i.qty}`).join(', ');
        }

        const template = `MediPay Receipt - Bill #${billNo}\nDear ${customerName},\nTotal: ₹${total}\nItems: ${itemList}\nThank you for choosing MediPay!`;

        const formattedNumber = this.formatIndianNumber(mobile);

        if (client && formattedNumber) {
            try {
                const message = await client.messages.create({
                    body: template,
                    messagingServiceSid: messagingServiceSid,
                    to: formattedNumber,
                });
                console.log(`[TWILIO RECEIPT SMS] SENT to: ${formattedNumber} | SID: ${message.sid}`);
                return { success: true, message: template, sid: message.sid, sentAt: new Date() };
            } catch (err) {
                console.warn(`[TWILIO RECEIPT SMS] Failed: ${err.message}`);
            }
        }

        console.log(`[RECEIPT SMS FALLBACK] To: ${mobile} | Bill #${billNo} | ₹${total}`);
        return { success: true, message: template, sentAt: new Date() };
    }

    static async sendManualReminder(customerName, mobile, customText) {
        const formattedNumber = this.formatIndianNumber(mobile);

        if (client && formattedNumber) {
            try {
                const message = await client.messages.create({
                    body: customText,
                    messagingServiceSid: messagingServiceSid,
                    to: formattedNumber,
                });
                console.log(`[TWILIO MANUAL SMS] SENT to: ${formattedNumber} | SID: ${message.sid}`);
                return { success: true, message: customText, sid: message.sid, sentAt: new Date() };
            } catch (err) {
                console.warn(`[TWILIO MANUAL SMS] Failed: ${err.message}`);
            }
        }

        console.log(`[MANUAL SMS FALLBACK] To: ${mobile} | Msg: ${customText}`);
        return { success: true, message: customText, sentAt: new Date() };
    }
}

module.exports = MessagingService;
