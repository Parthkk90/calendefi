module calendefi::calendar_payments {
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use std::string::{Self, String};
    use std::vector;
    
    // Error codes
    const E_INVALID_AMOUNT: u64 = 3;
    const E_INVALID_RECIPIENT: u64 = 4;
    
    // Simple transfer function that can be called by the calendar agent
    public entry fun calendar_transfer(
        sender: &signer,
        recipient: address,
        amount: u64,
        event_id: vector<u8>
    ) {
        // Validate inputs
        assert!(amount > 0, E_INVALID_AMOUNT);
        assert!(recipient != @0x0, E_INVALID_RECIPIENT);
        
        // Execute the transfer
        coin::transfer<AptosCoin>(sender, recipient, amount);
    }
    
    // Batch transfer for multiple calendar events
    public entry fun batch_calendar_transfer(
        sender: &signer,
        recipients: vector<address>,
        amounts: vector<u64>,
        event_ids: vector<vector<u8>>
    ) {
        let len = vector::length(&recipients);
        assert!(len == vector::length(&amounts), E_INVALID_AMOUNT);
        assert!(len == vector::length(&event_ids), E_INVALID_AMOUNT);
        
        let i = 0;
        while (i < len) {
            let recipient = *vector::borrow(&recipients, i);
            let amount = *vector::borrow(&amounts, i);
            let event_id = *vector::borrow(&event_ids, i);
            
            calendar_transfer(sender, recipient, amount, event_id);
            i = i + 1;
        };
    }
    
    // View function to check if contract is deployed
    #[view]
    public fun is_initialized(): bool {
        true
    }
}