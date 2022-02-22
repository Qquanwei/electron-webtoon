/* eslint-disable */
import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import ImgList from './imgList';
import ImgControl from './ImgControl';

function SingleComic({ imgList }) {
  return (
    <>
      <ImgList imgList={imgList} hasNextPage={false} />
      <ImgControl />
    </>
  );
}

SingleComic.propTypes = {
  imgList: PropTypes.arrayOf(PropTypes.string),
};

export default SingleComic;
