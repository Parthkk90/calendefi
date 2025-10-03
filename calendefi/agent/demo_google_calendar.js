const axios = require('axios');

async function demonstrateGoogleCalendarIntegration() {
  console.log('🎯 DEMONSTRATING GOOGLE CALENDAR INTEGRATION\n');
  console.log('='.repeat(60));
  console.log('Creating a 10 APT transaction via Google Calendar API...\n');
  
  try {
    // Create a calendar event that will trigger a 10 APT transaction
    const now = new Date();
    const executeTime = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes from now
    const endTime = new Date(executeTime.getTime() + 30 * 60 * 1000);
    
    console.log('📅 Creating Google Calendar Event:');
    console.log(`   Title: "Send 10 APT to 0x1"`);
    console.log(`   Scheduled Time: ${executeTime.toLocaleString()}`);
    console.log(`   Duration: 30 minutes`);
    console.log('');
    
    const eventData = {
      summary: 'Send 10 APT to 0x1',
      description: 'Large transaction test - created via CalendeFi API integration with Google Calendar',
      start: { dateTime: executeTime.toISOString() },
      end: { dateTime: endTime.toISOString() }
    };
    
    const response = await axios.post('http://localhost:3001/aptos/create-event', eventData);
    
    if (response.data.success) {
      console.log('✅ SUCCESS! Calendar event created:');
      console.log(`   📅 Event ID: ${response.data.eventId}`);
      console.log(`   🔗 Calendar Link: ${response.data.htmlLink || 'Available in Google Calendar'}`);
      console.log('');
      
      if (response.data.parsedTransaction) {
        const tx = response.data.parsedTransaction;
        console.log('💰 Transaction Details Parsed:');
        console.log(`   📊 Type: ${tx.type}`);
        console.log(`   💵 Amount: ${tx.amount} ${tx.token}`);
        console.log(`   🎯 Recipient: ${tx.recipient}`);
        console.log(`   ⏰ Execute At: ${new Date(tx.executeAt).toLocaleString()}`);
        console.log(`   👥 Requires Approval: ${tx.requiresApproval ? 'Yes' : 'No'}`);
        console.log('');
      }
      
      console.log('🔄 WHAT HAPPENS NEXT:');
      console.log('1. ✅ Calendar event is now visible in Google Calendar');
      console.log('2. 🔍 CalendeFi agent monitors the calendar every minute');
      console.log('3. ⏰ At the scheduled time, agent will detect the event');
      console.log('4. 🚀 Agent will automatically execute the 10 APT transaction');
      console.log('5. ✅ Transaction hash will be logged and visible in monitor');
      console.log('');
      
      console.log('📊 MONITORING OPTIONS:');
      console.log('• 🌐 Web Monitor: http://localhost:3001/monitor.html');
      console.log('• 📅 Calendar View: http://localhost:3001/schedule.html');
      console.log('• 📊 Events API: http://localhost:3001/aptos/events');
      console.log('• 💳 Wallet Status: http://localhost:3001/aptos/wallet');
      console.log('');
      
      console.log('🎉 DEMONSTRATION COMPLETE!');
      console.log('Your 10 APT transaction is now scheduled and will execute automatically!');
      console.log('');
      console.log('📝 TO CREATE MORE TRANSACTIONS:');
      console.log('• Open Google Calendar (https://calendar.google.com)');
      console.log('• Create event with title like "Send 5 APT to 0x123..."');
      console.log('• Set your desired execution time');
      console.log('• Save - CalendeFi will handle the rest!');
      
    } else {
      console.log('❌ Failed to create calendar event:');
      console.log(response.data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run the demonstration
demonstrateGoogleCalendarIntegration();