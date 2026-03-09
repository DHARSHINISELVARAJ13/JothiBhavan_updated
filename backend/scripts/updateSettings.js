const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
if (!process.env.MONGODB_URI) {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
}
const mongoose = require('mongoose');
const Settings = require('../models/Settings');

async function updateSettings() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected! Updating settings...');
    
    const settings = await Settings.findOneAndUpdate(
      {},
      {
        $set: {
          'contactInfo.address': '331, Bhavani Main Road, Near RTO Office',
          'contactInfo.pincode': '638 052',
          'contactInfo.phone': '94896 10555',
          'contactInfo.city': 'Perundurai',
          'contactInfo.state': 'Tamil Nadu'
        }
      },
      { new: true, upsert: true }
    );

    if (settings) {
      console.log('✅ Settings updated successfully!');
      console.log('Address:', settings.contactInfo.address);
      console.log('Pincode:', settings.contactInfo.pincode);
      console.log('Phone:', settings.contactInfo.phone);
    } else {
      console.log('Settings not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateSettings();
