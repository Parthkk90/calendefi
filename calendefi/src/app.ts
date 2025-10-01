import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import CalendarView from './components/Calendar/CalendarView';
import WalletConnect from './components/Wallet/WalletConnect';
import Dashboard from './components/Dashboard/Dashboard';

const App = () => {
    return (
        <Router>
            <Switch>
                <Route path="/" exact component={CalendarView} />
                <Route path="/wallet" component={WalletConnect} />
                <Route path="/dashboard" component={Dashboard} />
            </Switch>
        </Router>
    );
};

ReactDOM.render(<App />, document.getElementById('root'));