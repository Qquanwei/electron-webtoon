import React from "react";
import Loading from "react-loading";

function StartUpPage() {
  return (
    <div className="fixed top-0 bottom-0 left-0 right-0 flex items-center jsutify-center">
      <Loading type="balls" height="100%" color="#927963" width="100%" />
    </div>
  );
}

export default StartUpPage;
