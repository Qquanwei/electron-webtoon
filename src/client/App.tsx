import React, { Suspense } from 'react';
import { RecoilRoot } from 'recoil';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import Index from './page/index';
import Comic from './page/comic';
import './App.global.css';

export default function App() {
  return (
    <RecoilRoot>
      <Suspense fallback="loading...">
        <Router>
          <Switch>
            <Route exact path="/" component={Index} />
            <Route path="/comic/:id" component={Comic} />
          </Switch>
        </Router>
      </Suspense>
    </RecoilRoot>
  );
}
