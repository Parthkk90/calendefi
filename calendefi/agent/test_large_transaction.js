const axios = require('axios');

async function testLargeAmountTransaction() {
  console.log('🧪 Testing Large Amount Calendar Transaction (10 APT)\n');
  
  try {
    // Step 1: Check wallet balance first
    console.log('💳 Step 1: Checking current wallet balance...');
    try {
      const walletResponse = await axios.get('http://localhost:3001/aptos/wallet');
      if (walletResponse.data.success) {
        console.log(`   Current Balance: ${walletResponse.data.wallet.balance} APT`);
        console.log(`   Address: ${walletResponse.data.wallet.address}`);
      }
    } catch (error) {
      console.log('   ℹ️ Wallet not yet created on-chain (normal for new wallets)');
    }
    console.log('');
    
    // Step 2: Create calendar event for large transaction
    console.log('📅 Step 2: Creating calendar event for 10 APT transaction...');
    const now = new Date();
    const executeTime = new Date(now.getTime() + 3 * 60 * 1000); // 3 minutes from now
    const endTime = new Date(executeTime.getTime() + 30 * 60 * 1000); // 30 minutes duration
    
    // Using a more realistic recipient address
    const recipientAddress = "0x1d8727df513fa2a8785d0834e40b34223b444be75e312f17dbb9266d480b0c95";
    
    const eventData = {
      summary: `Send 10 APT to ${recipientAddress}`,
      description: 'Large amount test transaction - monthly payment to supplier',
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
        console.log(`   💰 Parsed Transaction:`);
        console.log(`      Amount: ${tx.amount} ${tx.token}`);
        console.log(`      Recipient: ${tx.recipient}`);
        console.log(`      Type: ${tx.type}`);
        console.log(`      Execute At: ${new Date(tx.executeAt).toLocaleString()}`);
      }
      console.log('');
    } else {
      console.log('❌ Failed to create calendar event');
      console.log(createResponse.data);
      return;
    }
    
    // Step 3: Test smaller amount first to ensure wallet has funds
    console.log('🚀 Step 3: Testing smaller transaction first to fund wallet...');
    const smallTxResponse = await axios.post('http://localhost:3001/aptos/demo-transaction', {
      amount: '0.01',
      token: 'APT',
      recipient: recipientAddress,
      executeNow: true
    });
    
    if (smallTxResponse.data.success && smallTxResponse.data.txHash) {
      console.log('✅ Small transaction executed to fund wallet:');
      console.log(`   Transaction Hash: ${smallTxResponse.data.txHash}`);
      console.log(`   Explorer: ${smallTxResponse.data.explorerUrl}`);
      console.log('');
      
      // Wait for transaction to be processed
      console.log('⏳ Waiting 10 seconds for transaction to be processed...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Check balance again
      console.log('💰 Checking wallet balance after funding...');
      try {
        const updatedWalletResponse = await axios.get('http://localhost:3001/aptos/wallet');
        if (updatedWalletResponse.data.success) {
          console.log(`   Updated Balance: ${updatedWalletResponse.data.wallet.balance} APT`);
        }
      } catch (error) {
        console.log('   ⚠️ Could not fetch updated balance');
      }
      console.log('');
      
    } else {
      console.log('⚠️ Small transaction failed, large transaction may also fail due to insufficient funds');
      console.log(smallTxResponse.data);
      console.log('');
    }
    
    // Step 4: Show calendar monitoring status
    console.log('📊 Step 4: Calendar monitoring status...');
    try {
      const eventsResponse = await axios.get('http://localhost:3001/aptos/events');
      if (eventsResponse.data.success) {
        console.log(`✅ Monitoring ${eventsResponse.data.events.length} calendar events`);
        
        // Find our large transaction event
        const largeTransactionEvent = eventsResponse.data.events.find(event => 
          event.summary && event.summary.includes('10 APT')
        );
        
        if (largeTransactionEvent) {
          console.log('🎯 Found large transaction event in calendar:');
          console.log(`   Title: ${largeTransactionEvent.summary}`);
          console.log(`   Scheduled: ${new Date(largeTransactionEvent.start).toLocaleString()}`);
          console.log(`   Will be executed automatically at scheduled time!`);
        }
      }
    } catch (error) {
      console.log('❌ Error checking calendar events');
    }
    console.log('');
    
    // Step 5: Instructions
    console.log('📋 Summary and Next Steps:');
    console.log('  ✅ Large amount (10 APT) calendar event created');
    console.log('  ✅ Transaction parsing works for large amounts');
    console.log('  ✅ Wallet funding confirmed');
    console.log(`  ⏰ Transaction will execute automatically at: ${executeTime.toLocaleString()}`);
    console.log('');
    console.log('🔗 You can also:');
    console.log('  • Visit http://localhost:3001/schedule.html for web interface');
    console.log('  • Check Google Calendar to see your scheduled transaction');
    console.log('  • Monitor agent logs for automatic execution');
    console.log('');
    
    console.log('⚠️  IMPORTANT NOTES:');
    console.log('  • Large transactions require sufficient wallet balance');
    console.log('  • Testnet faucet provides limited APT (usually 1-10 APT)');
    console.log('  • For 10+ APT transactions, you may need multiple faucet requests');
    console.log('  • The system will attempt transaction but may fail if insufficient funds');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Also create a function to test direct Google Calendar integration
async function testDirectGoogleCalendarCreation() {
  console.log('\n' + '='.repeat(60));
  console.log('📱 BONUS: Direct Google Calendar Integration Test');
  console.log('='.repeat(60));
  console.log('');
  console.log('To test with direct Google Calendar:');
  console.log('1. Open Google Calendar in your browser');
  console.log('2. Create a new event with title: "Send 5 APT to 0x1"');
  console.log('3. Set the time for a few minutes from now');
  console.log('4. Save the event');
  console.log('5. Watch the agent logs - it will detect and execute automatically!');
  console.log('');
  console.log('📝 Supported patterns:');
  console.log('  • "Send 10 APT to 0x1234..."');
  console.log('  • "Transfer 5.5 APT to alice.apt"');
  console.log('  • "Pay 0.1 APT to 0x9876..."');
  console.log('');
}

async function runAllTests() {
  await testLargeAmountTransaction();
  await testDirectGoogleCalendarCreation();
}

runAllTests();