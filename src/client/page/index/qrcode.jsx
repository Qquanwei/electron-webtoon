import React, { useRef, useEffect } from 'react';
import Qrcode from 'qrcode-generator';
import ipc from '../../ipc';
import styles from './index.css';

function QrcodeComponent() {
  const imgRef = useRef();

  useEffect(async () => {
    try {
      const server = await (await ipc).startLocalServer();
      const qr = Qrcode(0, 'H');
      qr.addData(`http://${server.address}:${server.port}`);
      qr.make();
      const imageurl = qr.createDataURL();
      imgRef.current.src = imageurl;
    } catch (e) {
      (await ipc).addLog('error', e.message);
    }
  }, []);

  return (
    <div className={styles.qrcodearea}>
      <img ref={imgRef} alt="qrcode" />
    </div>
  );
}

export default QrcodeComponent;
