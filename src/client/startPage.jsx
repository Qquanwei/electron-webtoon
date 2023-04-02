import React, { useEffect } from "react";
import Loading from "react-loading";
import classNames from 'classnames';
import * as selector from './selector';
import { useRecoilValue  } from "recoil";

function StartUpPage({ className }) {
  const nextOpenComicInfo = useRecoilValue(selector.nextOpenComicInfo);

  useEffect(() => {
    return () => {
    };
  }, []);

  console.log(nextOpenComicInfo)

  return (
    <div className={classNames(className, "fixed bg-gray-300 top-0 bottom-0 left-0 right-0 flex items-center justify-center")}>
    {
      nextOpenComicInfo ? (
        <img src={nextOpenComicInfo.cover} className='animate-pulse max-w-full max-h-full'></img>
      ) : (
        <Loading type="balls" height="100%" color="#927963" width="100%" />
      )
    }
    </div>
  );
}

export default StartUpPage;
