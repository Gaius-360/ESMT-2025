const mongoose = require("mongoose");


const pushSubscriptionSchema = new mongoose.Schema({
etudiant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
subscription: { type: Object, required: true },
}, { timestamps: true });


module.exports = mongoose.model("PushSubscription", pushSubscriptionSchema);