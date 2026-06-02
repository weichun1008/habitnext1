# 居家世界 — AI Pixel-Art 素材 Prompt Pack

> 目的：讓你（或設計師）把下面的 prompt 直接複製去 AI 圖像工具（Midjourney / DALL·E / Stable Diffusion / Leonardo / Recraft 等），**有紀律地**生出一致的等距 pixel-art 家具 sprite，堆進居家世界。
> 對應：`docs/superpowers/specs/2026-06-03-home-world-design.md`、參考截圖 = 使用者提供的 4 張 cozy 等距 pixel-art。

---

## 0. 先講最重要的：一致性 > 單張好看

9 區 × 4 階 ≈ 36+ 件家具，最大的坑是「每張單看不錯、放一起像拼貼」。守三條：
1. **固定風格前綴**（§1）——每個 prompt 都貼同一段，不要改字。
2. **固定參數**——同一個模型、同一個 `--ar`、SD 系列固定 seed 區段、同一個色盤參考圖。
3. **批次生成 + 人工篩**——一次生一整個區（4 件）對照看，挑風格最一致的，淘汰飛掉的。

---

## 1. 共用風格前綴（STYLE PREFIX — 每個 prompt 開頭都貼這段，逐字不改）

```
isometric pixel art game asset, single object centered, 2:1 dimetric projection,
cozy warm cottage style, soft warm lighting from upper-left, limited 16-color
warm palette (wood browns, cream, soft pastels), clean crisp pixel edges,
subtle dithered shading, dark warm-brown outline, no text, no UI,
plain flat #00000000 transparent background, full object visible with small margin,
inspired by Roots of Pacha / Travellers Rest cozy interior sprites
```

> 為什麼這樣寫：`isometric / 2:1 dimetric` 鎖視角；`transparent background / centered` 好去背對齊；`limited 16-color warm palette / dark outline / crisp pixel edges` 逼出真 pixel art 而非「假像素模糊」；風格參考鎖 cozy 調性。

### Negative prompt（SD / Leonardo 等支援的工具填這裡；MJ 用 `--no`）

```
blurry, anti-aliased soft edges, 3d render, realistic, photo, gradient background,
drop shadow on ground, multiple objects, people, text, watermark, signature,
front view, top-down flat, perspective vanishing point
```

### 建議參數
| 工具 | 參數 |
|---|---|
| Midjourney | `--ar 1:1 --style raw` ＋句尾接風格前綴；同主題用 `--seed <固定數>` 鎖風格 |
| Stable Diffusion / Leonardo | 512×512、固定 seed、CFG 6–8、加一張色盤/風格參考圖做 image-prompt |
| Recraft（原生向量/像素強） | 選 "pixel art" style、transparent bg 開 |

---

## 2. 每件家具 prompt（STYLE PREFIX + 下面這行主體）

格式：`<STYLE PREFIX>, <主體描述>`。主體描述已寫好英文，直接接在前綴後。

### 🍽 廚房 / 飲食（c-food，柔紅 #ff9e8a）
| 階 | 門檻 | 主體描述（接在前綴後） |
|---|---|---|
| 1 | 1 | `a single tall glass of water, light blue, tiny` |
| 2 | 5 | `a small round wooden dining table with two stools, warm wood` |
| 3 | 15 | `an open kitchen counter with stove and hanging pots, cream tiles` |
| 4 | 40 | `a kitchen island bar with stools, wine rack, warm pendant light` |

### 🏋 健身角 / 運動（c-move，柔橘 #ffc266）
| 1 | 1 | `a rolled yoga mat, soft orange` |
| 2 | 5 | `a small dumbbell rack with two dumbbells, warm metal` |
| 3 | 15 | `a compact treadmill, cream and orange` |
| 4 | 40 | `a cozy home gym corner with bench, rack and mirror` |

### 🛏 臥室 / 睡眠（c-sleep，奶紫 #a8b2f0）
| 1 | 1 | `a fluffy pillow, soft lavender` |
| 2 | 5 | `a single bed with lavender blanket and pillow` |
| 3 | 15 | `a bedside aroma diffuser with soft glow, lavender` |
| 4 | 40 | `a four-poster bed with blackout curtains, cozy night mood` |

### 📚 書房 / 認知（c-mind，薄荷 #7fd6c5）
| 1 | 1 | `a single open book, mint cover` |
| 2 | 5 | `a small bookshelf with colorful book spines` |
| 3 | 15 | `a wooden writing desk with lamp and books` |
| 4 | 40 | `a full reading-wall bookshelf with armchair and floor lamp` |

### 🛋 客廳 / 社交（c-social，粉紅 #ffa6c4）
| 1 | 1 | `a single cushioned chair, soft pink` |
| 2 | 5 | `a two-seat sofa, soft pink with cushions` |
| 3 | 15 | `a sofa with coffee table and small TV, cozy` |
| 4 | 40 | `a spacious living room set, sofa, rug, TV, plants, warm` |

### 🧘 冥想角 / 心靈（c-soul，嫩綠 #a8e6a3）
| 1 | 1 | `a single round meditation cushion, soft green` |
| 2 | 5 | `a meditation futon with a small potted plant` |
| 3 | 15 | `a window-side zen seat with sunrise light, calm` |
| 4 | 40 | `a small meditation room with mat, plants, soft lantern` |

### 🌿 玄關 / 環境（c-env，黃綠 #cfe88e）
| 1 | 1 | `a tiny potted seedling, fresh green` |
| 2 | 5 | `a tall floor plant in a woven basket` |
| 3 | 15 | `an entryway cabinet with a plant and key tray` |
| 4 | 40 | `a green indoor courtyard corner, lush plants, warm` |

### 💊 保健櫃 / 腸道（c-gut，淡紫 #d9b0ef）
| 1 | 1 | `a glass of water with a vitamin, soft purple` |
| 2 | 5 | `a small supplement cabinet with colorful bottles` |
| 3 | 15 | `a bathroom scale, soft purple and cream` |
| 4 | 40 | `a wellness wall with charts, scale, supplement shelf` |

### 💼 工作桌 / 職涯（c-work，灰藍 #aebfcc）
| 1 | 1 | `a closed laptop on a small surface, slate blue` |
| 2 | 5 | `a standing desk with laptop, slate blue` |
| 3 | 15 | `a dual-monitor desk setup, cozy, slate blue` |
| 4 | 40 | `a complete home office nook, desk, chair, shelf, warm lamp` |

> 「裝飾雜物池」（other 完成累積）：地毯 `a small woven round rug`、檯燈 `a small table lamp with warm glow`、掛畫 `a small framed flower painting`、小物 `a small decorative trinket`。

---

## 3. 場景 / 整體（非單件家具）

生「整個房間底」或迎賓圖時，前綴後接：

```
a cozy isometric living room at night, warm lamp glow, wooden floor, red carpet
runner, large house viewed from above, empty floor with placement spots,
inviting and warm, soft snow outside the window
```

迎賓「選世界」用的居家世界縮圖：上面那段 + `single warm cottage exterior at dusk, glowing windows, snowy, cozy`。

---

## 4. 後製（生完一定要做，否則放上去會破）

1. **去背**：若工具沒給透明背景 → remove.bg / Photoshop 魔術棒 / `rembg`。確認邊緣乾淨無殘留。
2. **限色 + 像素化**（把「假像素」逼成真像素）：
   - 下採樣到目標尺寸（見 §5）再放大，或用 Aseprite「Indexed 色彩模式 + 限色盤」。
   - 統一一個 16–24 色暖色盤（從第一批挑出來的好圖萃取，之後所有圖套同盤）。
3. **對齊基準線**：所有 sprite 底部中心對齊到等距格中心點；同尺寸畫布輸出，避免一格高一格低。
4. **挑選**：一個區（4 件）一起看，淘汰風格飛掉的，重生到一致為止。

工具建議：**Aseprite**（pixel art 標準，限色/對齊/輸出 sheet 都強）。

---

## 5. 技術規格（給整合用）

| 項目 | 規格 |
|---|---|
| 單件 sprite 畫布 | 建議 `96×96` 或 `128×128` px（透明背景，物件置中、底部留 grid 落點） |
| 等距角度 | 2:1 dimetric（地磚菱形寬:高 = 2:1） |
| 色盤 | 統一 16–24 色暖色盤（一份 `.gpl` / `.aco`，全專案共用） |
| 命名 | `home/<zone>/<tier>.png`，例 `home/kitchen/2.png`（zone key = kitchen/gym/bedroom/study/living/meditation/entry/wellness/office；tier 1–4），變體皮膚 `home/kitchen/2_v2.png` |
| 格式 | PNG-32（含 alpha） |

### Next.js 整合方向（之後 H2/H3 寫 code 時）
- sprite 放 `web-app/public/home/...`；前端用 `<img image-rendering:pixelated>` 或 `<canvas>` 等距堆疊。
- 進階：用 **PixiJS**（tile/sprite 渲染、好做暖光與分層）；或先 CSS 絕對定位等距堆疊（H2 唯讀房間夠用）。
- 落點 = 確定性 `layoutZone(zone) → [{slot,x,y}]`（spec §6.3，禁 render 期 Math.random）。

---

## 6. 授權（生圖前先確認）

- 確認所用 AI 工具的輸出**可商用**（多數付費方案可；免費/個人方案常限制）。把確認結果記在這份文件。
- 不要 prompt 指名「in the style of <某遊戲/某藝術家>」具體作品名做最終素材（風格參考可，抄特定作品有風險）。§1 用的是通用 cozy 風格描述 + 泛泛遊戲參考，安全度較高。

---

## 7. 最小可行流程（你今天就能試）

1. 複製 §1 風格前綴 + §2 任一行（建議先試「沙發 tier 2」`a two-seat sofa, soft pink with cushions`）。
2. 丟進你選的 AI 工具，生 4 張。
3. 挑最像 pixel art、邊緣最乾淨的一張。
4. 去背 + 用 Aseprite 限色到 16 色、輸出 96×96 PNG。
5. 把它跟 pixel-art mockup（`2026-06-03-homeWorld-pixelart-mockup.html`）的沙發位比一比——對到方向就照這流程生完整套。

生出第一批（建議先做「客廳 4 階」一整組）回來，我可以幫你評估一致性、調 prompt、規劃 H2 怎麼把它們渲染進房間。
