import React, { Suspense } from 'react';
import { RecoilRoot } from 'recoil';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import Index from './page/index';
import Comic from './page/comic';
import StartUpPage from './startPage';
import './App.global.css';

export default function App() {
  // TODO: loading 时能自动从所有logo中选一张岂不是完美了。
  return (
    <Router>
      <RecoilRoot>
        <Suspense fallback={<StartUpPage />}>
          <Switch>
            <Route exact path="/" component={Index} />
            <Route path="/comic/:id" component={Comic} />
          </Switch>
        </Suspense>
      </RecoilRoot>
    </Router>
  );
}
