import React from 'react';
import styles from './index.css';

function Loading() {
    return (
        <div className={styles.loading}>
            <img alt="loading" className={styles.img} src={require('../../Yukinoshita.png').default}/>
            <div className="text">
              loading...
            </div>
        </div>
    )
}

export default Loading;
