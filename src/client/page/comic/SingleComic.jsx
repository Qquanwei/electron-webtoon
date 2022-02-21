import React, { Fragment} from 'react';
import PropTypes from 'prop-types';
import ImgList from './imgList';
import ImgControl from './ImgControl';

function SingleComic({ imgList }) {
  return (
    <Fragment>
      <ImgList imgList={imgList} hasNextPage={false} />
      <ImgControl />
    </Fragment>
  );
}

SingleComic.propTypes = {
  imgList: PropTypes.arrayOf(PropTypes.string)
}

export default SingleComic;
