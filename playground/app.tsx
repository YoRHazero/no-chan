import { useState } from 'react'
import { createNooChan, NooChan } from '../src'

const nooChan = createNooChan()

/** A page to try her on: every input NooChan takes has a control here. */
export function App() {
  const [hasNotice, setHasNotice] = useState(false)
  const [shown, setShown] = useState(true)
  const [unit, setUnit] = useState(100)
  const [clicks, setClicks] = useState(0)

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px', lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>no-chan playground</h1>
      <p style={{ margin: '0 0 24px', color: '#555' }}>
        按住她拖动，松手她会落下来。勾上「有通知」她会掏出手机，这时点她算一次点击。站在离墙一个身宽以内、三分钟不动鼠标键盘，她会靠墙睡着。取消「显示」再勾上，她会回到上次站的地方。
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <label>
          <input
            type="checkbox"
            checked={hasNotice}
            onChange={(event) => setHasNotice(event.target.checked)}
          />{' '}
          有通知
        </label>
        <label>
          <input
            type="checkbox"
            checked={shown}
            onChange={(event) => setShown(event.target.checked)}
          />{' '}
          显示
        </label>
        <button
          onClick={(event) => nooChan.notifyRequest(event.currentTarget.getBoundingClientRect())}
        >
          发请求（扔纸团）
        </button>
        <button onClick={() => nooChan.notifyError()}>出错（为难）</button>
        <label>
          时间单位{' '}
          <input
            type="range"
            min={25}
            max={400}
            step={25}
            value={unit}
            onChange={(event) => setUnit(Number(event.target.value))}
          />{' '}
          {unit} ms
        </label>
      </div>
      <p style={{ marginTop: 24, fontFamily: 'ui-monospace, monospace', fontSize: 14 }}>
        点击：{clicks} 次
      </p>
      {shown && (
        <NooChan
          controller={nooChan}
          hasNotice={hasNotice}
          timeUnit={unit}
          onClick={() => setClicks((count) => count + 1)}
        />
      )}
    </main>
  )
}
