/* eslint-disable react/jsx-props-no-spreading */
import React, { Suspense } from "react";
import Loading from "../loading";

function withSuspense(Component) {
  return function (props) {
    <Suspense fallback={<Loading />}>
      <Component {...props} />
    </Suspense>;
  };
}

export default withSuspense;
