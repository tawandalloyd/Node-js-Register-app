const Mongoose = require('mongoose');
const Schema = Mongoose.Schema;

let Register = new Schema ({
name: {
    type: String
},
surname: {
    type: String
},
email: {
    type: String
},
password:{
    type: String
},
isVerified: {
    type:Boolean,
    default: false
}

});
module.exports = Mongoose.model('Register',Register);