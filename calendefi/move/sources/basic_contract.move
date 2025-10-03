module calendefi::simple_calendar {
    use std::string;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::signer;
    
    // Error codes
    const EINVALID_AMOUNT: u64 = 1;
    const EINVALID_RECIPIENT: u64 = 2;
    
    // Calendar transaction resource
    struct CalendarTx has key {
        recipient: address,
        amount: u64,
        executed: bool
    }
    
    // Create a new transaction (calendar event)
    public entry fun create_transaction(
        account: &signer,
        recipient: address,
        amount: u64
    ) {
        let sender_addr = signer::address_of(account);
        move_to(account, CalendarTx {
            recipient: recipient,
            amount: amount,
            executed: false
        });
    }
    
    // Execute a transaction
    public entry fun execute_transaction(account: &signer) acquires CalendarTx {
        let sender_addr = signer::address_of(account);
        
        // Check if transaction exists
        assert!(exists<CalendarTx>(sender_addr), 0);
        
        // Get transaction details
        let calendar_tx = borrow_global_mut<CalendarTx>(sender_addr);
        
        // Check if already executed
        assert!(!calendar_tx.executed, 0);
        
        // Execute APT transfer
        coin::transfer<AptosCoin>(
            account,
            calendar_tx.recipient,
            calendar_tx.amount
        );
        
        // Mark as executed
        calendar_tx.executed = true;
    }
}