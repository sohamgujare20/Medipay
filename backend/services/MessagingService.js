// backend/services/MessagingService.js
/**
 * Mock Messaging Service for MediPay
 * Simulates a real-time SMS / WhatsApp API
 */
class MessagingService {
    static async sendRefillReminder(customerName, mobile, daysToRefill, isOverdue = false, billNo = "") {
        const template = isOverdue 
            ? `Namaste ${customerName}, your medicine refill was due yesterday (Bill #${billNo}). Please visit MediPay soon to maintain your prescription schedule. Stay healthy!`
            : `Namaste ${customerName}, this is a friendly reminder that your medicine refill is due tomorrow (Bill #${billNo}). We have your stock ready at MediPay!`;

        // Mocking an API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log("------------------------------------------");
        console.log(`[REAL-TIME SMS API] To: ${mobile} (${customerName})`);
        console.log(`[MESSAGE CONTENT]: ${template}`);
        console.log("[STATUS]: SENT SUCCESSFULLY");
        console.log("------------------------------------------");

        return {
            success: true,
            message: template,
            sentAt: new Date()
        };
    }

    static async sendManualReminder(customerName, mobile, customText) {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(`[MANUAL SMS API] To: ${mobile} | Msg: ${customText}`);
        return { success: true, message: customText, sentAt: new Date() };
    }
}

module.exports = MessagingService;
