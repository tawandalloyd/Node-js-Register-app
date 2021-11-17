const Mongoose = require('mongoose');
const Schema = Mongoose.Schema;

let Products = new Schema ({
    productName :{
        type: String
    }
});

module.exports = Mongoose.model('Products', Products);