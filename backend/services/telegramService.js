const axios = require('axios');
const FormData = require('form-data');

/**
 * Sends the uploaded resume and a summary of the analysis to the admin via Telegram.
 * 
 * @param {Object} file - The file object from Multer (buffer, originalname)
 * @param {Object} metadata - Analysis results and user info (name, email, domain, score)
 */
const sendResumeToAdmin = async (file, metadata) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

    console.log(`Telegram Service: Using token ${token ? 'exists' : 'MISSING'} and chatId ${chatId || 'MISSING'}`);

    if (!token || !chatId || token === 'your_bot_token_here') {
        console.log('Telegram credentials not configured. Skipping admin notification.');
        return false;
    }

    try {
        // Sanitize helper for HTML (very minimal)
        const esc = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const message = `
🚀 <b>New Resume Received!</b>

<b>Name:</b> ${esc(metadata.name)}
<b>Email:</b> ${esc(metadata.email)}
<b>Domain:</b> ${esc(metadata.domain)}
<b>ATS Score:</b> ${metadata.score}%

The candidate has just analyzed their resume properly.
        `.trim();

        // 1. Send the document
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('document', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype
        });
        formData.append('caption', message);
        formData.append('parse_mode', 'HTML');

        const response = await axios.post(
            `https://api.telegram.org/bot${token}/sendDocument`,
            formData,
            { headers: formData.getHeaders() }
        );

        if (response.data.ok) {
            console.log('Resume successfully forwarded to Admin Telegram.');
            return true;
        } else {
            console.error('Telegram API error:', response.data.description);
            return false;
        }

    } catch (error) {
        if (error.response) {
            console.error('Telegram API rejected the request:', error.response.data);
        } else {
            console.error('Error sending Telegram notification:', error.message);
        }
        return false;
    }
};

module.exports = {
    sendResumeToAdmin
};
