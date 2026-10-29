# no-chan

看板娘 NooChan 的 React 组件。她站在页面底边上，可以被拖动、会落下、会对 app 里发生的事做反应。

## 用法

```tsx
import { createNooChan, NooChan, NooChanDialog } from 'no-chan'

// 整个 app 一个控制器，放在模块里，哪里都能用
export const nooChan = createNooChan()

// 放在 Layout 里：她拿着手机时被点，就打开她的手机面板
const [noticesOpen, setNoticesOpen] = useState(false)
<NooChan controller={nooChan} hasNotice={hasNotices} onClick={() => setNoticesOpen(true)} />
<NooChanDialog open={noticesOpen} onOpenChange={setNoticesOpen}>
  <NoticeList />
</NooChanDialog>

// app 里发生的事走控制器
nooChan.notifyError() // 有操作失败了：她会为难
nooChan.notifyRequest(button.getBoundingClientRect()) // 从按钮发出了请求：纸团飞过来砸她
```

| prop         | 说明                                                        |
| ------------ | ----------------------------------------------------------- |
| `controller` | `createNooChan()` 的返回值                                  |
| `bounds`     | 她活动的元素（ref），底边是地面，左右是墙；不传就是整个窗口 |
| `timeUnit`   | 一个时间单位多少毫秒，默认 100                              |
| `hasNotice`  | app 有没有通知；有的时候她拿出手机看                        |
| `onClick`    | 她拿着手机时被点了一下（按下又松开，没有拖动）              |

她不在页面上时，控制器收到的事直接丢掉。她离开页面再回来（组件卸载再挂载），会站在上次的地方，其余从站立重新开始。

NooChan 自己懒加载：帧图和 runtime 在单独的 chunk 里，第一次显示时才加载，所有 PNG 解码完才出现。加载出错时她只是不出现。

### 手机面板 `NooChanDialog`

窗口正中的模态弹窗，画成她的手机，她在手机上沿正中探头。app 的内容放在屏幕里，超出就在屏幕里滚动。

| prop           | 说明                                                             |
| -------------- | ---------------------------------------------------------------- |
| `open`         | 开没开，由 app 持有                                              |
| `onOpenChange` | 用户关上了它（点 home 条、按 Esc、点手机外面），参数总是 `false` |
| `children`     | 屏幕里的内容                                                     |

- 手机最大 360×720，她宽 220px；窗口放不下时手机和她一起等比缩小。
- 屏幕的底色取页面的背景色（从面板所在的元素往上找第一个有底色的），文字颜色、字体继承 app 的。
- 样式由组件自己带（React 的 `<style precedence>`），不用另外引 CSS。

## 帧图：`src/no-chan/framesets/`

一个文件夹是一个帧组：每帧一个 PNG（帧名就是文件名），加一个 `frameset.toml`。

```toml
scale = 0.5                # 一个图片像素画成几个 CSS 像素
anchor = [20, 10]          # 对齐点：组内换帧时对齐的点
between_feet = [53, 212]   # 两脚中点：她在图里站在哪；不写就等于对齐点

[frames]                   # 可选：只写和上面不一样的帧
2 = { anchor = [21, 10], resolution = 2 }

[actions.held]
priority = 2               # 可选：本动作的 step 默认优先级
duration = 2               # 可选：本动作的 step 默认时长
motion = "follow"          # 可选：移动方式，不写是 floor
next = "dragged.held"      # 可选：播完去哪；不写就回到站立
steps = [{ frame = "0" }, { frame = "1", duration = 3 }]
```

- 点都是整数像素，从 PNG 左上角量起。
- **对齐点**只在同一个帧组里换帧时用：标这组动画里不动的部位（站着的是脚，被拎着的是手，睡觉的是靠墙那一侧）。换到别的帧组时，让两脚中点重合，她原地换图。
- **两脚中点**：x 是两只鞋的正中间，y 是紧挨鞋底下面那一行。不是站姿的帧，取这组开始或结束时站姿的两脚中点。
- step 的时长是正数，单位是时间单位，没写取 action 的，再没有是 1；优先级是整数，没写取 action 的，再没有是 0。
- `next` 是 `frameset.action` 或 `frameset.action.step`。要循环或停住的动作自己写：指向自己的第 0 步是循环，指向自己的最后一步是停住。
- 移动方式：`floor` 贴地（默认）、`follow` 手跟着鼠标、`fall` 下落、`wall` 靠墙。
- 不认识的键、没被任何 step 用到的 PNG 都会报错。`pnpm test` 会把所有帧组读一遍。

## 指令：`src/no-chan/commands.ts`

除了动作按 `next` 往下播，她的每一次切换都是一个指令：名字、目标、优先级、`rule`。runtime 每帧检查每个指令的 `rule`，成立了指令就「就绪」并一直保持；就绪的指令里优先级最高的那个，比当前 step 的优先级高就切过去，否则继续等。目标和当前是同一个动作时，指令清掉不切。

| 值  | 步上的意思                                         | 指令                                   |
| --- | -------------------------------------------------- | -------------------------------------- |
| 0   | 什么都能打断：站立、打哈欠、摇一摇、掏手机、收手机 |                                        |
| 1   | 只有叫醒和手能打断：为难、被砸、落地、睡觉、醒来   | 为难、被砸、掏手机、收手机、待机、去睡 |
| 2   | 只有手能打断：被拎着、下落                         | 醒来                                   |
| 3   |                                                    | 拎起、松手、落地                       |

## 目录

- `src/character/`：角色。读帧组、记当前在哪一步、`switchTo`；不知道时间，从不自己行动。
- `src/runtime/`：runtime。时钟、指令、移动方式、位置、纸团；不碰 React 和 DOM。
- `src/react/`：组件、控制器，以及唯一碰 DOM 的 `stage.tsx`。
- `src/no-chan/`：她自己的内容：帧组、指令表、参数、纸团的图、手机面板上探头的图。
- `tests/`：测试。
- `playground/`：调试页面。

## 开发

```bash
pnpm dev       # playground：http://localhost:5173
pnpm test
pnpm lint
pnpm build     # tsc -b 加 playground 的构建
pnpm format
```

库以源码的形式被引用（`exports` 指向 `src/index.ts`），所以 `tsconfig.app.json` 和 noobenkyo 一样严格，库里只用相对路径。
