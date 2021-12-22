import React, { useRef, useEffect } from 'react';
import Qrcode from 'qrcode-generator';
import ipc from '../../ipc';
import styles from './index.css';

function QrcodeComponent() {
  const imgRef = useRef();

  useEffect(async () => {
    const server = await (await ipc).startLocalServer();
    const qr = Qrcode(0, 'H');
    qr.addData(`http://192.168.3.43:${server.port}`);
    qr.make();
    const imageurl = qr.createDataURL();
    imgRef.current.src = imageurl;
  }, []);

  return (
    <div className={styles.qrcodearea}>
      <img ref={imgRef} alt="qrcode" />
    </div>
  );
}

export default QrcodeComponent;
