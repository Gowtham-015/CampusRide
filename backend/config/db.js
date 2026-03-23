const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = 'mongodb://chowdarync_2:CObCv6KBzKbcD0Pf@ac-ji8h9nw-shard-00-00.kwpoqsb.mongodb.net:27017,ac-ji8h9nw-shard-00-01.kwpoqsb.mongodb.net:27017,ac-ji8h9nw-shard-00-02.kwpoqsb.mongodb.net:27017/freewheels?ssl=true&replicaSet=atlas-jd3pzn-shard-0&authSource=admin&retryWrites=true&w=majority';
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000, socketTimeoutMS: 45000, family: 4 });
    console.log('✅ MongoDB Connected to shared Atlas database');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('⏳ Retrying in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};
module.exports = connectDB;
