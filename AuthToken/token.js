const mongoose = require('mongoose');
const Schema = mongoose.Schema

let Token = new Schema ({
    _userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Register' },
    token: { type: String, required: true },
    expireAt: { type: Date, default: Date.now, index: { expires: 86400000 } }

});
module.exports = mongoose.model('Token',Token);