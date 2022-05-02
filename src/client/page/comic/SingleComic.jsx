/* eslint-disable */
import React, { Fragment, useCallback } from 'react';
import PropTypes from 'prop-types';
import useComicContext from './useComicContext';
import ImgList from './imgList';
import ImgControl from './ImgControl';
import ipc from '../../ipc';

function SingleComic({ imgList }) {
  const { comic } = useComicContext();

  const onVisitPositionChange = useCallback(async (position) => {
    (await ipc).saveComicTag(comic.id, '', position);
  }, [comic]);

  return (
    <>
      <ImgList imgList={imgList}
        hasNextPage={false}
        onVisitPosition={onVisitPositionChange} />
      <ImgControl />
    </>
  );
}

SingleComic.propTypes = {
  imgList: PropTypes.arrayOf(PropTypes.string),
};

export default SingleComic;
