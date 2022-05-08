import React, { Suspense } from 'react';
import { RecoilRoot, useRecoilTransactionObserver_UNSTABLE } from 'recoil';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import Loading from './components/Loading';
import Index from './page/index';
import Comic from './page/comic';
import './App.global.css';

export default function App() {
  return (
    <RecoilRoot>
      <Suspense fallback={<Loading />}>
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
