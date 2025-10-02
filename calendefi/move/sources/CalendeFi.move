module calendefi::calendar_defi {
    use std::signer;
    use std::vector;
    use std::string::{Self, String};
    use std::option::{Self, Option};
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_framework::account;
    use aptos_framework::event;
    use aptos_std::table::{Self, Table};
    use aptos_token_objects::collection;
    use aptos_token_objects::token;

    /// Calendar Transaction Resource
    struct CalendarTransaction has key, store, copy, drop {
        id: String,
        calendar_id: String,
        transaction_type: String, // "send", "swap", "delegate"
        amount: u64,
        token_type: String,
        recipient: address,
        execute_at: u64, // timestamp
        created_at: u64,
        status: String, // "pending", "approved", "executed", "failed"
        required_approvals: u64,
        current_approvals: u64,
        approvers: vector<address>,
        executed: bool,
    }

    /// Calendar NFT Collection Resource
    struct CalendarCollection has key {
        owner: address,
        calendar_id: String,
        collection_name: String,
        description: String,
        transactions: Table<String, CalendarTransaction>,
        multisig_threshold: u64,
        authorized_signers: vector<address>,
    }

    /// RSVP Approval Resource
    struct RSVPApproval has key, store {
        transaction_id: String,
        approver: address,
        approved: bool,
        timestamp: u64,
    }

    /// Events
    #[event]
    struct TransactionCreated has drop, store {
        transaction_id: String,
        calendar_id: String,
        creator: address,
        execute_at: u64,
    }

    #[event]
    struct TransactionApproved has drop, store {
        transaction_id: String,
        approver: address,
        total_approvals: u64,
        required_approvals: u64,
    }

    #[event]
    struct TransactionExecuted has drop, store {
        transaction_id: String,
        executor: address,
        success: bool,
        timestamp: u64,
    }

    /// Errors
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_TRANSACTION_NOT_FOUND: u64 = 2;
    const E_ALREADY_APPROVED: u64 = 3;
    const E_INSUFFICIENT_APPROVALS: u64 = 4;
    const E_EXECUTION_TIME_NOT_REACHED: u64 = 5;
    const E_ALREADY_EXECUTED: u64 = 6;
    const E_COLLECTION_NOT_FOUND: u64 = 7;

    /// Initialize calendar collection (called when user connects calendar)
    public entry fun initialize_calendar(
        account: &signer,
        calendar_id: String,
        collection_name: String,
        description: String,
        multisig_threshold: u64,
        authorized_signers: vector<address>
    ) {
        let account_addr = signer::address_of(account);
        
        // Create calendar collection as NFT collection
        collection::create_unlimited_collection(
            account,
            description,
            collection_name,
            option::none(),
            string::utf8(b"https://calendefi.com/calendar/")
        );

        // Store calendar collection resource
        move_to(account, CalendarCollection {
            owner: account_addr,
            calendar_id,
            collection_name,
            description,
            transactions: table::new(),
            multisig_threshold,
            authorized_signers,
        });
    }

    /// Create calendar transaction from parsed event
    public entry fun create_calendar_transaction(
        account: &signer,
        calendar_id: String,
        transaction_id: String,
        transaction_type: String,
        amount: u64,
        token_type: String,
        recipient: address,
        execute_at: u64,
        required_approvals: u64
    ) acquires CalendarCollection {
        let account_addr = signer::address_of(account);
        
        // Verify calendar collection exists
        assert!(exists<CalendarCollection>(account_addr), E_COLLECTION_NOT_FOUND);
        
        let collection = borrow_global_mut<CalendarCollection>(account_addr);
        
        // Create transaction
        let transaction = CalendarTransaction {
            id: transaction_id,
            calendar_id,
            transaction_type,
            amount,
            token_type,
            recipient,
            execute_at,
            created_at: timestamp::now_seconds(),
            status: string::utf8(b"pending"),
            required_approvals,
            current_approvals: 0,
            approvers: vector::empty(),
            executed: false,
        };

        // Store transaction
        table::add(&mut collection.transactions, transaction_id, transaction);

        // Emit event
        event::emit(TransactionCreated {
            transaction_id,
            calendar_id,
            creator: account_addr,
            execute_at,
        });
    }

    /// RSVP-based approval (when someone accepts calendar invite)
    public entry fun approve_transaction(
        approver: &signer,
        collection_owner: address,
        transaction_id: String
    ) acquires CalendarCollection {
        let approver_addr = signer::address_of(approver);
        
        assert!(exists<CalendarCollection>(collection_owner), E_COLLECTION_NOT_FOUND);
        
        let collection = borrow_global_mut<CalendarCollection>(collection_owner);
        assert!(table::contains(&collection.transactions, transaction_id), E_TRANSACTION_NOT_FOUND);
        
        let transaction = table::borrow_mut(&mut collection.transactions, transaction_id);
        
        // Check if already approved
        assert!(!vector::contains(&transaction.approvers, &approver_addr), E_ALREADY_APPROVED);
        
        // Add approval
        vector::push_back(&mut transaction.approvers, approver_addr);
        transaction.current_approvals = transaction.current_approvals + 1;
        
        // Update status if threshold reached
        if (transaction.current_approvals >= transaction.required_approvals) {
            transaction.status = string::utf8(b"approved");
        };

        // Emit approval event
        event::emit(TransactionApproved {
            transaction_id,
            approver: approver_addr,
            total_approvals: transaction.current_approvals,
            required_approvals: transaction.required_approvals,
        });
    }

    /// Execute approved transaction at scheduled time
    public entry fun execute_transaction(
        executor: &signer,
        collection_owner: address,
        transaction_id: String
    ) acquires CalendarCollection {
        let executor_addr = signer::address_of(executor);
        
        assert!(exists<CalendarCollection>(collection_owner), E_COLLECTION_NOT_FOUND);
        
        let collection = borrow_global_mut<CalendarCollection>(collection_owner);
        assert!(table::contains(&collection.transactions, transaction_id), E_TRANSACTION_NOT_FOUND);
        
        let transaction = table::borrow_mut(&mut collection.transactions, transaction_id);
        
        // Verify execution conditions
        assert!(!transaction.executed, E_ALREADY_EXECUTED);
        assert!(transaction.current_approvals >= transaction.required_approvals, E_INSUFFICIENT_APPROVALS);
        assert!(timestamp::now_seconds() >= transaction.execute_at, E_EXECUTION_TIME_NOT_REACHED);
        
        // Execute based on transaction type
        let success = if (transaction.transaction_type == string::utf8(b"send")) {
            execute_send_transaction(collection_owner, transaction)
        } else if (transaction.transaction_type == string::utf8(b"swap")) {
            execute_swap_transaction(collection_owner, transaction)
        } else {
            false
        };
        
        // Mark as executed
        transaction.executed = true;
        transaction.status = if (success) {
            string::utf8(b"executed")
        } else {
            string::utf8(b"failed")
        };

        // Emit execution event
        event::emit(TransactionExecuted {
            transaction_id,
            executor: executor_addr,
            success,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Execute APT transfer
    fun execute_send_transaction(
        from: address,
        transaction: &CalendarTransaction
    ): bool {
        // Execute APT transfer
        if (transaction.token_type == string::utf8(b"APT")) {
            coin::transfer<AptosCoin>(
                &account::create_signer_with_capability(
                    &account::create_test_signer_cap(from)
                ),
                transaction.recipient,
                transaction.amount
            );
            true
        } else {
            false
        }
    }

    /// Execute token swap (placeholder for DEX integration)
    fun execute_swap_transaction(
        _from: address,
        _transaction: &CalendarTransaction
    ): bool {
        // TODO: Integrate with Aptos DEX (PancakeSwap, Hippo, etc.)
        true
    }

    /// View functions
    #[view]
    public fun get_transaction(
        collection_owner: address,
        transaction_id: String
    ): CalendarTransaction acquires CalendarCollection {
        let collection = borrow_global<CalendarCollection>(collection_owner);
        *table::borrow(&collection.transactions, transaction_id)
    }

    #[view]
    public fun get_calendar_info(owner: address): (String, String, u64, u64) acquires CalendarCollection {
        let collection = borrow_global<CalendarCollection>(owner);
        (
            collection.calendar_id,
            collection.collection_name,
            collection.multisig_threshold,
            vector::length(&collection.authorized_signers)
        )
    }
}