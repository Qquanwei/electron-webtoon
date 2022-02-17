import React, { useCallback, useState } from 'react';

// 当鼠标hover时展示一个扇形区域
// items: [Component, Component]
// children: hover 的元素, 支持onHover事件
function Sector({ children, items }) {
  const [hover, setHover] = useState(false);

  const onMouseDown = useCallback(() => {
    setHover(true);
  }, []);

  const onMouseUp = useCallback(() => {
    if (hover) {
      setHover(false);
    }
  }, [hover]);

  return (
    React.cloneElement(children, {
      onMouseDown: onMouseDown,
      onMouseUp: onMouseUp
    })
  );
}

export default Sector;
