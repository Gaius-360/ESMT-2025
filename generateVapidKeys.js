const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();
console.log("PUBLIC KEY:");
console.log(vapidKeys.publicKey);
console.log("\nPRIVATE KEY:");
console.log(vapidKeys.privateKey);
