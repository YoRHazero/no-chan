# no-chan

[English](README.md) · 中文

React app 的看板娘。她站在页面底边上：拎起来她会晃，松手她会掉下来，放着不管她会打哈欠、跟着音乐摇、靠着墙睡着。她会对 app 告诉她的事做反应；她看手机的时候点她一下，会打开她的手机，里面放你的内容。

<table>
  <tr>
    <td align="center"><img src="docs/no-chan.png" alt="NooChan 站着、打哈欠、摇一摇、看手机" height="222"></td>
    <td align="center"><img src="docs/dialog.png" alt="NooChanDialog：她的手机面板，她在手机上沿探头" width="210"></td>
  </tr>
  <tr>
    <td align="center"><code>&lt;NooChan&gt;</code></td>
    <td align="center"><code>&lt;NooChanDialog&gt;</code></td>
  </tr>
</table>

- [调用](#调用)
- [扩展](#扩展)
- [开发](#开发)
- [许可证](#许可证)

## 调用

### 安装

需要 React 19 和 Vite。库以 TypeScript 源码发布，用到了 Vite 的 `import.meta.glob`，所以由你 app 的 Vite 和你的代码一起编译。

```bash
pnpm add no-chan
# 或直接从 GitHub 装
pnpm add github:YoRHazero/no-chan
```

```ts
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  // 和你的代码一起编译 no-chan，不预构建它
  optimizeDeps: { exclude: ['no-chan'] },
})
```

### 用法

```tsx
import { useState } from 'react'
import { createNooChan, NooChan, NooChanDialog } from 'no-chan'

// 整个 app 一个控制器，放在模块里，哪里的代码都能找到她
export const nooChan = createNooChan()

export function Layout() {
  const [noticesOpen, setNoticesOpen] = useState(false)
  return (
    <>
      {/* 你的页面 */}
      <NooChan
        controller={nooChan}
        hasNotice={notices.length > 0}
        onClick={() => setNoticesOpen(true)}
      />
      <NooChanDialog open={noticesOpen} onOpenChange={setNoticesOpen}>
        <NoticeList notices={notices} />
      </NooChanDialog>
    </>
  )
}

// app 里任何地方，告诉她发生了什么：
nooChan.notifyError() // 有操作失败了：她会为难
nooChan.notifyRequest(button.getBoundingClientRect()) // 发出了一个请求：纸团飞过来砸她
```

app **是什么状态**走 prop，app 里**发生了什么**走控制器。

### `createNooChan()`

创建交给 `<NooChan>` 的控制器。

| 方法                  | 告诉她什么                                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| `notifyError()`       | 用户的某个操作失败了。她会为难。                                                                               |
| `notifyRequest(from)` | 用户从 `from` 发出了一个请求：`from` 是 `DOMRect`（比如按钮的）或视口里的点 `{ x, y }`。纸团从那里飞过来砸她。 |

她不在页面上时，控制器收到的事直接丢掉。

### `<NooChan>`

| prop         | 类型                             | 说明                                                   |
| ------------ | -------------------------------- | ------------------------------------------------------ |
| `controller` | `NooChanController`              | 必填。`createNooChan()` 的返回值。                     |
| `bounds`     | `RefObject<HTMLElement \| null>` | 她活动的元素：底边是地面，左右是墙。不传就是整个窗口。 |
| `timeUnit`   | `number`                         | 她的动画里一个时间单位是多少毫秒，默认 `100`。         |
| `hasNotice`  | `boolean`                        | app 有没有要给用户看的东西。有的时候她拿出手机看。     |
| `onClick`    | `() => void`                     | 她看手机时被点了一下（按下又松开，没有拖动）。         |

她自己会：

- 被拖动时吊在鼠标下面晃，松手掉下来，落地后坐一会儿；
- 站着时隔一阵打个哈欠，或者跟着音乐摇一摇；
- 站在墙边、三分钟没人动鼠标键盘时，靠墙坐下睡着；一有输入就醒。

她第一次出现在离右边 80px 的地方。组件卸载再挂载，她会站回原来的地方，其余从头开始。帧图和 runtime 在单独的 chunk 里，第一次显示时才加载，所有帧解码完她才出现；加载失败时她只是不出现。

### `<NooChanDialog>`

| prop           | 类型                      | 说明                                                                    |
| -------------- | ------------------------- | ----------------------------------------------------------------------- |
| `open`         | `boolean`                 | 必填。开没开，由 app 持有。                                             |
| `onOpenChange` | `(open: boolean) => void` | 必填。用户关上了它：点 home 条、按 Esc 或点手机外面。参数总是 `false`。 |
| `children`     | `ReactNode`               | 手机屏幕里的内容，超出就在屏幕里滚动。                                  |

- 窗口正中的模态 `<dialog>`，最大 360 × 720。窗口小时，手机和她一起等比缩小。
- 屏幕的底色取页面的背景色（从面板所在的元素往上找第一个有底色的），文字颜色和字体继承你的。
- 样式由组件通过 React 19 的 `<style precedence>` 自己带上，不用引 CSS。

## 扩展

她之所以是她，全在 `src/no-chan/` 里；机制对她一无所知。要改她、教她新东西，fork 仓库改这个文件夹就行。

```
src/
  character/   Character：读她的帧组，记她在哪一步
  runtime/     时钟、指令、移动、她在页面上的位置、纸团
  react/       组件和控制器；唯一碰 DOM 的代码
  no-chan/     她：帧组、指令、参数、图
```

下面用到的词：

- **帧**（frame）：一个 PNG。
- **帧组**（frameset）：一个文件夹，放帧和一个说明怎么播放的 `frameset.toml`。
- **动作**（action）：帧组里有名字的一串步，写作 `frameset.action`。
- **步**（step）：一帧放一段时间，写作 `frameset.action.step`（从 0 数；`frameset.action` 就是它的第 0 步）。

### Character

角色只管她的帧组和她当前在哪一步，别的都不管。它在创建时一次收下所有帧组，这样每个 `next` 都能检查；有帧组不对就报错，之后数据只读。

它是被动的：不知道时间，从不自己行动。只有 runtime 调用 `switchTo(step)`，因为「这一步播了多久」在 runtime 里。其他地方只读：某一步的帧、时长、优先级、移动方式，以及 `following(step)`，也就是它之后的那一步。

一步的时间到了，她走到 `following(step)`：动作里的下一步；最后一步之后是动作的 `next`；没写就是角色的默认（她是站立）；没有默认就停在最后一步。

### Command

其余的切换都是指令：被拎起、下落、落地、为难、掏手机、睡着。她的指令在 `src/no-chan/commands.ts`。

| 字段       | 说明                                                             |
| ---------- | ---------------------------------------------------------------- |
| `name`     | 名字。                                                           |
| `target`   | 切到哪一步。是列表时随机挑一个。                                 |
| `priority` | 只能把她从优先级更低的步上切走。                                 |
| `rule`     | `(now) => boolean`：根据发生了什么、她现在怎样，判断该不该发生。 |

每一帧，runtime：

1. 把 `rule` 成立的指令置为**就绪**。就绪的指令一直保持，直到被执行；
2. 挑就绪的指令里优先级最高的；一样高的，先就绪的优先，再一样就按列出的顺序；
3. 它的优先级不高于当前步的：留着，以后再说。反应就是这样排队的；
4. 否则清掉它的就绪，把她切到目标；她已经在那个动作里时不切。

她每帧最多切换一次，不管是指令还是时间到了。

`rule` 读 `now`：

| 字段                   | 说明                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `inAction(action)`     | 她是否在 `action`（`frameset.action`）的某一步上。                                       |
| `onStep(step)`         | 她是否在 `step`（`frameset.action.step`）上。                                            |
| `elapsed`              | 在当前步上多少毫秒了。                                                                   |
| `sinceInput`           | 离上次用鼠标或键盘多少毫秒了。                                                           |
| `happened(event)`      | 上一帧以来是否发生过 `event`：`'input'`、`'hit'`（纸团）、`'error'`（`notifyError()`）。 |
| `ready(name)`          | 指令 `name` 是否就绪。                                                                   |
| `pressing`、`dragging` | 她是否被按住；是否正被拖动。                                                             |
| `onFloor`、`nearWall`  | 她的脚是否在地面上；她离墙是否在一个身宽以内。                                           |
| `hasNotice`            | prop `hasNotice`。                                                                       |
| `chance(perSecond)`    | 按每秒 `perSecond` 的概率，这一帧是否为真。                                              |

比如她的待机指令：

```ts
{
  name: 'idle',
  target: ['yawn.yawn', 'sway.sway'],
  priority: 1,
  // 至少站 20 秒，之后平均再过 20 秒
  rule: (now) => now.inAction('standing.standing') && now.elapsed >= 20_000 && now.chance(1 / 20),
}
```

她的优先级按这个约定：

| 优先级 | 在步上的意思                                     | 这个优先级的指令                       |
| ------ | ------------------------------------------------ | -------------------------------------- |
| 0      | 什么都能打断：站立、打哈欠、摇一摇、手机         |                                        |
| 1      | 只有叫醒和手能打断：为难、被砸、落地、睡觉、醒来 | 为难、被砸、掏手机、收手机、待机、睡觉 |
| 2      | 只有手能打断：被拎着、下落                       | 醒来                                   |
| 3      |                                                  | 拎起、松手、落地                       |

### `frameset.toml`

`src/no-chan/framesets/` 里每个文件夹是一个帧组：每帧一个 PNG（帧名就是文件名），加一个 `frameset.toml`。

```toml
scale = 0.5                # 一个图片像素画成几个 CSS 像素
anchor = [20, 10]          # 对齐点：帧组内换帧时对齐的点
between_feet = [53, 212]   # 两脚中点：她在图里站在哪；不写就等于对齐点

[frames]                   # 可选：只写和上面不一样的帧
2 = { anchor = [21, 10], resolution = 2 }

[actions.held]
priority = 2               # 可选：本动作的步的默认优先级（否则 0）
duration = 2               # 可选：本动作的步的默认时长（否则 1）
motion = "follow"          # 可选：移动方式，不写是 "floor"
next = "dragged.held"      # 可选：最后一步之后去哪
steps = [{ frame = "0" }, { frame = "1", duration = 3 }]
```

- 点都是整数像素，从 PNG 左上角量起。
- **对齐点**是帧组里她不动的部位：站着是脚，被拎着是手，睡觉是靠墙那一侧。同一帧组的帧按它对齐。
- **两脚中点**（`between_feet`）：x 是两只鞋的正中间，y 是紧挨鞋底下面那一行。切到别的帧组时，前后两帧按它对齐，她在原地换图。不是站姿的帧，取这组开始或结束时站姿的两脚中点。
- **`resolution`**：这一帧的分辨率是帧组的几倍。`resolution = 2` 的帧，像素多一倍，页面上一样大。
- 步的 `duration` 是正数，单位是时间单位；`priority` 是整数。
- `next` 写 `frameset.action` 或 `frameset.action.step`。要循环或停住的动作自己写：指向自己的第 0 步是循环，指向自己的最后一步是停住。
- `motion` 可以是 `floor`（贴地，默认）、`follow`（对齐点跟着鼠标）、`fall`（下落）、`wall`（挪到近的那面墙边，靠右墙时镜像）。
- 帧组名、动作名里不能有点。不认识的键、不存在的帧、没被任何步用到的 PNG 都会报错，`pnpm test` 会把所有帧组读一遍。

教她一个新动作：加一个放 PNG 和 `frameset.toml` 的文件夹，在 `src/no-chan/commands.ts` 里加一条指向它的指令，然后在 playground 里试。

## 开发

```bash
pnpm install
pnpm dev      # playground：http://localhost:5173
pnpm test
pnpm lint
pnpm build    # 类型检查，并构建 playground
pnpm format
```

playground 里每个 prop、每个控制器方法都有对应的控件，还有让她马上打哈欠、摇一摇、睡觉的按钮。

## 许可证

[MIT](LICENSE)
