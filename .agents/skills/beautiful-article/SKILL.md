---
name: beautiful-article
description: "把用户提供的素材（网页 URL / PDF / DOCX / Markdown / 纯文本 / 截图 / 粘贴材料）编辑、设计成一篇美丽的、可离线打开和分享的单文件 HTML 网页文章。基于 reacticle 组件协议：不手写裸 HTML/CSS，而用语义组件 + 受主题约束 of Raw 自由层；按 source→规划→双确认→生成→终审→修复的小型 harness 流程推进，默认 100% 信息保留的长文。"
---

# Beautiful Article

## 背景原则

AI 生成内容越复杂，输出媒介越重要。HTML 的价值在于同时提升信息密度、视觉清晰度、分享便利性和交互能力：表格、SVG、CSS、代码片段、可调控件、复制与导出按钮，可以让读者不只是“看完”，而是能比较、定位、调整、复查 e 继续使用。Beautiful Article 的目的，是把原本枯燥、线性、难以消化的文字材料，转换成视觉体验更漂亮、阅读节奏更清晰、也更容易审阅和分享的单文件网页文章。


## 边界（先判断要不要进这个 Skill）

- 最终主产物是 **single HTML 文章**，不是网页应用。
- 文章可以有 `Raw` 自由层（任意 HTML / CSS / JS / React：交互、布局排版、动效、小工具、按需的 SVG / canvas 图解），但**必须服务阅读、解释、论证、节奏或审美**。
- **不**生成：后台、表单、拖拽工作台、完整 dashboard、产品原型、通用 Web App。
- 信息密度由用户确认；**默认保留 100% 信息**，生成长文式网页文章。

如果用户要的是应用而不是文章，停下来澄清，不要进入本 Skill。

---

## 工作流总览

```
Phase 0  Intake            判断是否进入本 Skill + 初步文章类型
   ▼
Phase 1  Source → Markdown URL/PDF/DOCX/MD/文本 → source.md + extraction-notes.md
         └ 主 Agent 内联 5 条 checklist 自查（仅复杂/低置信源升级 SubAgent）
   ▼
Phase 2  Editorial Planning 一份 plan.md（Brief / Outline / Theme / Assets 四段）
         └ 主 Agent 内联自查（无 SubAgent、无 review 文件）
   ▼
Phase 3  Plan Checkpoint   ★Checkpoint 1 必须停。逐项确认 5 件事：文章类型（含标配保留比例）/ 主题 / 版式 / 配图模式 / 封面
   ▼
Phase 4  First Spread      首屏 + 第一节 + 一个代表性视觉块（脚手架在此创建）
         └ First Spread Reviewer SubAgent（写 review/first-spread-review.md）
         └ ★Checkpoint 2 必须停。逐项确认 2 件事：验收结论 / 开发模式 A/B
   ▼
Phase 5  Full Article Build 生成完整网页文章（默认单 Agent，超长可按 Section 隔离）
         └ Section Reviewer SubAgent（以消息返回 pass/fail，无须写 review 文件）
   ▼
Phase 6  Final Review      Editorial / Visual / Technical 三视角终审（写 review/final-review.md）
   ▼
Phase 7  Repair            最小切片修复，有修复才写 repair-log.md
   ▼
Phase 8  Delivery          ★Checkpoint 3 必须停。逐项确认交付决策 → 交付 article.html + 简短编辑说明
```

工作区结构（脚手架创建）：

```text
<workspace>/
  source/   original.*  source.md  source.<lang>.md(需翻译时)  extraction-notes.md
  plan/     plan.md                                    # 单一规划文件：Brief / Outline / Theme / Assets 四段
  article/  Cover.tsx(默认)  Article.tsx  sections/  raw-blocks/  assets/  article.html(产物)
  review/   first-spread-review.md  final-review.md   # 仅这两份是常规产物
            source-review.md(仅复杂源)  repair-log.md(仅有修复时)
  index.html  package.json  vite.config.ts  tsconfig*.json   (构建工装)
```
