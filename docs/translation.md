# English source translation

This document translates the useful project text in the supplied Chinese source set. Application menus, advertisements, and unrelated screenshot controls are excluded. The files arrived without a designer name, source URL, or license statement.

The Word document contains four annotated images and no substantive editable instructions. The English assembly procedure is a reconstruction from those images, the photographs, and the STEP assembly. It is not a translation of a complete original assembly manual.

## Annotated image 1: PWM controller mounting

Original: 用自攻螺丝固定

Translation: **Secure with self-tapping screws.**

The arrows point to the board mounting holes. See [the controller photo](assets/photos/controller.webp).

Guide clarification: Confirm screw diameter, length, pilot holes, and clearance beneath the circuit board. Different controller brands can have different mounting holes.

## Annotated image 2: feeder bevel gear

Original:

> 用的是打印件伞齿轮，建议单独打印
> 层高降低
> 安装时装不进去，用打火机烫

Translation: **This is a printed bevel gear. Print it separately with a lower layer height. If it does not fit during assembly, heat it with a lighter.**

See [the feed motor photo](assets/photos/feed-motor.webp).

Guide clarification: The source provides no layer height, shaft tolerance, or heating temperature. This guide replaces the lighter method with a measured bore correction. Confirm the shaft fit and gear alignment before power-on.

## Annotated image 3: stopper and wheel rubber

Original:

> 此处有一个乒乓球阻挡器
> 主要目的是防止乒乓球射出
> 顺便带出后一个乒乓球
> 可以用一段耗材，或细轴10mm

Translation: **There is a ball stopper here. Its main purpose is to prevent a launched ball from pulling the next ball out with it. Use a piece of filament or a thin shaft; the note mentions 10 mm.**

The meaning of 10 mm is not explicit. A short piece approximately 10 mm long is a possible reading, not a confirmed dimension.

Original:

> 用乒乓球的胶皮粘在这上面
> 用502粘

Translation: **Glue table tennis rubber onto this surface. Use 502 adhesive.**

“502” refers to a commonly sold cyanoacrylate adhesive. The arrows point to the launch-wheel rims. See [the wheels](assets/photos/wheels.webp) and [the stopper detail](assets/photos/stopper.webp).

Guide clarification: The source does not specify rubber thickness, strip length, adhesive compatibility, cure time, wheel balance, or the final gap between the wheels.

## Annotated image 4: close-up

The fourth image contains arrows and no explanatory Chinese text. It shows the outlet support, fastener, and stopper region. See [the stopper detail](assets/photos/stopper.webp).

## Spreadsheet

The complete translated inventory is in [hardware-bom.md](hardware-bom.md) and [hardware-bom.csv](downloads/hardware-bom.csv). Human-readable spreadsheet row references use row 1 for the header.

| Original term | English translation / interpretation |
|---|---|
| 名称 | Name |
| 数量/个 | Quantity, pieces |
| 单价 | Unit price |
| 省钱卡一般就几分钱 | With the discount card, it is generally only a few fen; a shopping note, not a part specification |
| 热熔螺母 m3*5*5 | M3 × 5 × 5 heat-set insert; confirm dimensional convention |
| 杯头304 | Socket head screw, 304 stainless steel |
| 减速电机（77/min 2kg 12v） | Geared motor: 77 rpm, “2 kg,” 12 V; the torque unit is incomplete |
| 550电机 12v（d=35.8 就可以 Hmin=52+ 注意尺寸） | 550 motor, 12 V; diameter 35.8 mm; source minimum height/length 52+ mm; pay attention to dimensions |
| 梅花手柄螺丝 | Star knob screw |
| m3螺母，少量20 | M3 nuts; a small quantity, about 20 |
| 自攻螺丝m3*14，少量20（没有就买100个） | M3 × 14 self-tapping screws; about 20, or buy 100 if a small quantity is unavailable |
| 线束0.5平就行 | 0.5 mm² wire is sufficient, according to the source |
| 电源12v 3a 36w | Power supply: 12 V, 3 A, 36 W |
| 开关（关键字手捏）注意放在火线上 | Switch; search keyword “hand-operated inline”; place it in the live conductor |
| PWM电机调速（优信的，其他的品牌大小不一）（其他品牌也可以，孔对不上就只用自攻螺丝） | PWM motor speed controller, Youxin type. Other brands differ in size. Other brands are possible; if the holes do not line up, use self-tapping screws |
| 轴承d=7 D=16 h=5 | Bearing: 7 mm bore, 16 mm outside diameter, 5 mm width |

The source mains-switch note is preserved here as a translation. The build guide uses an enclosed, isolated DC supply and a DC-rated switch in its positive output lead. It provides no mains wiring procedure.

The old spreadsheet lists unit-price entries of 8 for each motor type, 14 for the supply, and 1–2 yuan for each PWM controller. Other price cells are empty. Currency for the unmarked numbers is not explicit. These December 2025 entries are historical notes, not current quotes. The original marketplace links are preserved in [the extracted source table](data/source-bom.json), without a claim that the products remain available or suitable.

## CAD names

| Original | English name used in the guide |
|---|---|
| FQJ-003 底座 | Base assembly |
| FQJ-002 发射器 | Launch-wheel assembly |
| FQJ-001 主体 | Main body |
| FQJ-004 推进器 | Feed drive |
| 储球 | Ball hopper |
| 涡轮改 / 涡轮改_直伞齿轮适配 | Modified feed screw; the literal source term is modified turbine |
| 底板下层 | Lower base / base enclosure |
| 端盖-改 | Modified end cover / base lid |
| 后盖 | Rear cover |
| 法轮盘 | Wheel flange; the source spelling is irregular |
| 法轮盘及发射盘 | Wheel flange and launch wheel |
| 撑杆改 | Modified support link / tilt linkage |
| 出口管，待改 | Outlet tube, revision pending |
| 动力改 / 动力改q | Modified drive/body parts; A/B names are guide identifications |
| 550电机模型_1 / _2 | 550 motor model 1/2; the printable objects are identified as motor mounts from geometry |
| 零件2^测试装配体2 | Part 2 of test assembly 2; identified as launch supports in the guide |
| 螺母_有螺母槽的 | Nut/knob with a nut pocket |
| 蝶形螺母 | Wing nut |
| 内六角圆柱头螺钉 | Socket head screw |
| 平垫 | Flat washer |
| 轴承 | Bearing |

Descriptive names for generic or unnamed geometry are identifications from CAD and photographs. They need confirmation during a real build. The STEP download retains internal source names to preserve its original assembly structure. The English 3MF changes display names and removes the original computer path from its model metadata. Geometry and print settings are retained.

## Video

The supplied video is 15.33 seconds long and contains an audio track. Its image shows the prototype, hopper loading, wheels, and outlet. The site provides English visual-description captions. The audio remains unchanged and has not been transcribed or translated. Do not interpret these captions as a speech transcript.

## Source handling

The original Chinese-named directory and duplicate root STEP are removed after the translated derivatives are verified, as requested. English-named CAD, print project, photographs, and video remain in the repository. [The source manifest](data/source-manifest.json) records historical filenames, sizes, and SHA-256 hashes for provenance.
