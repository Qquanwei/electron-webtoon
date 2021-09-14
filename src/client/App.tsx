import React from 'react';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import Index from './page/index';
import Comic from './page/comic';
import './App.global.css';

export default function App() {
  return (
    <Router>
      <Switch>
        <Route exact path="/" component={Index} />
        <Route path="/comic/:id" component={Comic} />
      </Switch>
    </Router>
  );
}
