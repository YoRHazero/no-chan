import { useState } from 'react'
import { createNooChan, NooChan, NooChanDialog } from '../src'

const nooChan = createNooChan()

/** Stand-in notices for the dialog's screen. */
const notices = [
  { source: '来源 A', name: '第三课的生词', detail: '条目 · 24 条' },
  { source: '来源 B', name: '周末听力练习', detail: '剧本 · 第 2 集' },
  { source: '来源 A', name: '动词变形复习', detail: '条目 · 12 条' },
  { source: '来源 C', name: '新闻精读', detail: '剧本 · 5 段' },
]

/** A page to try her on: every input NooChan takes has a control here. */
export function App() {
  const [hasNotice, setHasNotice] = useState(false)
  const [shown, setShown] = useState(true)
  const [unit, setUnit] = useState(100)
  const [clicks, setClicks] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px', lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>no-chan playground</h1>
      <p style={{ margin: '0 0 24px', color: '#555' }}>
        按住她拖动，松手她会落下来。勾上「有通知」她会掏出手机，这时点她算一次点击，并打开她的手机面板；点
        home 条、按 Esc
        或点手机外面关上。站在离墙一个身宽以内、三分钟不动鼠标键盘，她会靠墙睡着。取消「显示」再勾上，她会回到上次站的地方。
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
          onClick={() => {
            setClicks((count) => count + 1)
            setDialogOpen(true)
          }}
        />
      )}
      <NooChanDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <h2 style={{ fontSize: 18, margin: '0 8px 8px' }}>通知</h2>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {notices.map((notice) => (
            <li key={notice.name}>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 8px',
                  border: 0,
                  borderRadius: 10,
                  background: 'none',
                  color: 'inherit',
                  font: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{ marginRight: 6, fontSize: 12, color: '#777' }}>{notice.source}</span>
                {notice.name}
                <small style={{ display: 'block', color: '#777' }}>{notice.detail}</small>
              </button>
            </li>
          ))}
        </ul>
      </NooChanDialog>
    </main>
  )
}
