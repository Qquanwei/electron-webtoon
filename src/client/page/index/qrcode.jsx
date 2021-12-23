import React, { useRef, useEffect, useState } from 'react';
import Qrcode from 'qrcode-generator';
import WaittingIcon from '@material-ui/icons/BlurOn';
import ipc from '../../ipc';
import styles from './index.css';

function QrcodeComponent() {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    async function work() {
      try {
        const server = await (await ipc).startLocalServer();
        const qr = Qrcode(0, 'H');
        qr.addData(`http://${server.address}:${server.port}`);
        qr.make();
        const imageurl = qr.createDataURL();
        setUrl(imageurl);
      } catch (e) {
        (await ipc).addLog('error', e.message);
      }
    }
    work();
  }, []);

  return (
    <div className={styles.qrcodearea}>
      {url ? <img src={url} alt="qrcode" /> : <WaittingIcon />}
    </div>
  );
}

export default QrcodeComponent;
