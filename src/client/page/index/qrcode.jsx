import React, { useRef, useEffect, useState } from "react";
import Qrcode from "qrcode-generator";
import WaittingIcon from "@mui/icons-material/BlurOn";
import { ipc } from "../../ipc";
import styles from "./index.module.css";

function QrcodeComponent() {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    async function work() {
      try {
        const server = await ipc.startLocalServer();
        const qr = Qrcode(0, "H");
        qr.addData(`http://${server.address}:${server.port}`);
        qr.make();
        const imageurl = qr.createDataURL();
        setUrl(imageurl);
      } catch (e) {
        ipc.addLog("error", e.message);
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
