require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
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
          'contactInfo.city': 'Erode'
        }
      },
      { new: true }
    );

    if (settings) {
      console.log('✅ Settings updated successfully!');
      console.log('City updated to:', settings.contactInfo.city);
      console.log('Full address:', `${settings.contactInfo.address}, ${settings.contactInfo.city}, Tamil Nadu ${settings.contactInfo.pincode}`);
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
