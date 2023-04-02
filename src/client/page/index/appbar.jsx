/* eslint-disable */
import React, { useRef, useCallback, useEffect } from 'react'
import classNames from 'classnames'
import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import Typography from '@material-ui/core/Typography'
import InputBase from '@material-ui/core/InputBase'
import SearchIcon from '@material-ui/icons/Search'
import IconButton from '@material-ui/core/IconButton'
import ScreenLockPortraitIcon from '@material-ui/icons/ScreenLockPortrait'
import Popup from 'reactjs-popup'
import 'reactjs-popup/dist/index.css'

import { useRecoilRefresher_UNSTABLE } from 'recoil'
import Qrcode from './qrcode'
import { version } from '../../../package.json'
import * as selector from '../../selector'
import ipc from '../../ipc'
import styles from './index.css'

function ElectronWebtoonAppBar({ onSearch }) {
  const imgRef = useRef(null)
  const searchRef = useRef(null)
  const refreshComicList = useRecoilRefresher_UNSTABLE(selector.comicList)

  const onSubmitSearch = useCallback(e => {
    e.stopPropagation()
    e.preventDefault()
    onSearch(searchRef.current.value)
  }, [])

  useEffect(() => {
    async function work() {
      ;(await ipc).onMsg(msg => {
        document.title = msg
        setTimeout(() => {
          document.title = 'ElectronWebtoon'
        }, 1000)
      })

      ;(await ipc).onCompressFile(msg => {
        document.title = `${msg}`
      })

      ;(await ipc).onCompressDone(() => {
        document.title = '处理完毕'
        refreshComicList()
        setTimeout(() => {
          document.title = 'ElectronWebtoon'
        }, 1000)
      })
    }
    work()
  }, [refreshComicList])

  const onClickAddFile = useCallback(async () => {
    ;(await ipc).takeCompressAndAddToComic()
  }, [])

  const onClickAddFolder = useCallback(async () => {
    const path = await (await ipc).takeDirectory()

    if (!path.canceled) {
      await (await ipc).addComicToLibrary(path.filePaths[0])
      refreshComicList()
    }
  }, [])

  return (
    <div className='shadow z-10 px-2 fixed top-0 left-0 right-0 bg-white text-black flex justify-center h-[60px] items-center'>
      <Typography variant='h6' noWrap>
        ElectronWebtoon
        <span className='text-[10px]'>@{version}</span>
      </Typography>

      <form
        onSubmit={onSubmitSearch}
        className='border-box transition-all rounded p-1 relative ml-2 hover:border-sky-500 focus-within:border-sky-500 border-gray-200 border'
      >
        <SearchIcon />
        <input
        className='focus:outline-none bg-transparent ml-1'
          ref={searchRef}
          placeholder='Search…'
        />
      </form>
      <Popup
        position='bottom center'
        trigger={
          <button className={classNames(styles.mobilebtn, 'hidden')}>
            <ScreenLockPortraitIcon />
          </button>
        }
      >
        <Qrcode />
      </Popup>
      <Popup
        position='bottom'
        trigger={
          <button className='ml-auto w-[24px] bg-gray-200 hover:bg-gray-500 transiton-all duration-[300ms] ml-auto mr-[100px]'>
            +
          </button>
        }
      >
        <div
          className={classNames(
            styles.createactionlist,
            'text-white flex flex-col items-center justify-center'
          )}
        >
          <button onClick={onClickAddFolder} className='hover:outline outline-1 p-2 outline-sky-300 transiton-all rounded'>打开文件夹</button>
          <button onClick={onClickAddFile} className='hover:outline outline-1 p-2 outline-sky-300 transiton-all rounded'>打开压缩包</button>
        </div>
      </Popup>
      <div />
    </div>
  )
}

export default ElectronWebtoonAppBar
