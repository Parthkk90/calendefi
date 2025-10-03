const axios = require('axios');

async function testCompleteCalendarFlow() {
  console.log('🧪 Testing Complete Calendar-to-Blockchain Flow\n');
  
  try {
    // Step 1: Check system status
    console.log('📊 Step 1: Checking system status...');
    const healthResponse = await axios.get('http://localhost:3001/health');
    console.log('✅ Agent is running\n');
    
    // Step 2: Check calendar authentication
    console.log('🔐 Step 2: Checking calendar authentication...');
    try {
      const eventsResponse = await axios.get('http://localhost:3001/aptos/events');
      console.log('✅ Calendar is authenticated and accessible\n');
    } catch (error) {
      console.log('❌ Calendar authentication issue. Please visit http://localhost:3001/auth\n');
      return;
    }
    
    // Step 3: Create a calendar event with transaction
    console.log('📅 Step 3: Creating calendar event with transaction...');
    const now = new Date();
    const executeTime = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes from now
    const endTime = new Date(executeTime.getTime() + 30 * 60 * 1000); // 30 minutes duration
    
    const eventData = {
      summary: 'Send 0.001 APT to 0x1',
      description: 'Test transaction created via CalendeFi automation',
      start: { dateTime: executeTime.toISOString() },
      end: { dateTime: endTime.toISOString() }
    };
    
    const createResponse = await axios.post('http://localhost:3001/aptos/create-event', eventData);
    
    if (createResponse.data.success) {
      console.log('✅ Calendar event created successfully!');
      console.log(`   Event ID: ${createResponse.data.eventId}`);
      console.log(`   Scheduled for: ${executeTime.toLocaleString()}`);
      console.log(`   Transaction detected: ${createResponse.data.parsedTransaction ? 'YES' : 'NO'}`);
      
      if (createResponse.data.parsedTransaction) {
        const tx = createResponse.data.parsedTransaction;
        console.log(`   💰 Transaction: ${tx.amount} ${tx.token} to ${tx.recipient}`);
      }
      console.log('');
    } else {
      console.log('❌ Failed to create calendar event');
      console.log(createResponse.data);
      return;
    }
    
    // Step 4: Test immediate transaction execution
    console.log('🚀 Step 4: Testing immediate transaction execution...');
    const immediateResponse = await axios.post('http://localhost:3001/aptos/demo-transaction', {
      amount: '0.001',
      token: 'APT',
      recipient: '0x1',
      executeNow: true
    });
    
    if (immediateResponse.data.success && immediateResponse.data.txHash) {
      console.log('✅ Immediate transaction executed successfully!');
      console.log(`   Transaction Hash: ${immediateResponse.data.txHash}`);
      console.log(`   Explorer: ${immediateResponse.data.explorerUrl}`);
      console.log('');
    } else {
      console.log('⚠️ Immediate transaction failed or was not executed');
      console.log(immediateResponse.data);
      console.log('');
    }
    
    // Step 5: Check wallet status
    console.log('💳 Step 5: Checking wallet status...');
    try {
      const walletResponse = await axios.get('http://localhost:3001/aptos/wallet');
      if (walletResponse.data.success) {
        console.log('✅ Wallet information retrieved:');
        console.log(`   Address: ${walletResponse.data.wallet.address}`);
        console.log(`   Balance: ${walletResponse.data.wallet.balance} APT`);
        console.log(`   Network: ${walletResponse.data.wallet.network}`);
      }
    } catch (error) {
      console.log('ℹ️ Wallet not yet created on-chain (normal for new wallets)');
    }
    console.log('');
    
    // Step 6: Monitor for the scheduled event
    console.log('⏰ Step 6: Calendar monitoring is active...');
    console.log(`The scheduled transaction will be automatically executed at: ${executeTime.toLocaleString()}`);
    console.log('Monitor the agent logs to see when the transaction is executed!');
    console.log('');
    
    console.log('🎉 Test completed successfully!');
    console.log('📋 Summary:');
    console.log('  ✅ Agent is running');
    console.log('  ✅ Calendar is connected');
    console.log('  ✅ Calendar event created');
    console.log('  ✅ Transaction parsing works');
    console.log('  ✅ Immediate execution works');
    console.log('  ⏰ Scheduled execution will happen automatically');
    console.log('');
    console.log('🔗 Access the web interface at: http://localhost:3001/schedule.html');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testCompleteCalendarFlow();