import React from 'react';

const Dashboard: React.FC = () => {
    // Sample data for demonstration purposes
    const events = [
        { id: 1, title: 'Payment to Alice', status: 'Executed' },
        { id: 2, title: 'Swap USDC for ETH', status: 'Pending' },
        { id: 3, title: 'Governance Vote', status: 'Failed' },
    ];

    return (
        <div>
            <h1>Dashboard</h1>
            <h2>Transaction Status</h2>
            <ul>
                {events.map(event => (
                    <li key={event.id}>
                        {event.title} - Status: {event.status}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Dashboard;