import type { Trend } from "./initial";

const date = "2026-11-19";
const season = "2027 春夏";

const runwayIndex = {
  title: "T-Fashion · 2027 春夏女装秀场统计",
  url: "https://tfashion.ai/runway/ss27",
};
const parisRunway = {
  title: "Vogue · 巴黎 2027 春夏秀场观察",
  url: "https://www.vogue.com/article/skirts-shoes-and-celine-dion-key-takeaways-from-paris-fashion-week-spring-summer-2027",
};
const bottega = {
  title: "Vogue Runway · Bottega Veneta 2027 春夏",
  url: "https://www.vogue.com/fashion-shows/spring-2027-ready-to-wear/bottega-veneta",
};
const celine = {
  title: "Vogue Runway · Celine 2027 春夏",
  url: "https://www.vogue.com/fashion-shows/spring-2027-ready-to-wear/celine",
};
const chanel = {
  title: "Vogue Runway · Chanel 2027 春夏",
  url: "https://www.vogue.com/fashion-shows/spring-2027-ready-to-wear/chanel",
};
const chanelShow = {
  title: "Chanel 官方 · 2027 春夏秀场",
  url: "https://www.chanel.com/us/fashion/collection/spring-summer-2027/",
};
const prada = {
  title: "Prada Group · 2027 春夏女装发布资料",
  url: "https://www.pradagroup.com/en/news-media/press-releases-documents/2026/26-09-22-prada-ss-2027-womenswear-show.html",
};

export const publishedTrends: Trend[] = [
  {
    id: "ss27-black-white-contrast",
    category: "color",
    date,
    season,
    kind: "已发表秀场 · 色彩",
    title: "黑白基底用明度划分结构",
    description: "T-Fashion 的女装秀场样本里，黑色和白色分别出现在 35.2% 和 28.4% 的造型中，白色比上年同季高 4.7 个百分点。Mame Kurogouchi 的校服主题演示了黑、白与海军蓝怎样组织领口、内搭和外层。",
    application: "先做纯黑白和墨蓝粉白两版。把浅色集中在领、门襟或袖口一个位置，用哑光浅料检验斜向分割在正面光下的清晰度。",
    palette: [{ name: "墨黑", hex: "#212125" }, { name: "粉笔白", hex: "#F1EDE4" }, { name: "墨海军蓝", hex: "#272F42" }],
    sources: [runwayIndex, { title: "Vogue Runway · Mame Kurogouchi 2027 春夏", url: "https://www.vogue.com/fashion-shows/spring-2027-ready-to-wear/mame-kurogouchi" }],
  },
  {
    id: "ss27-violet-and-butter",
    category: "color",
    date,
    season,
    kind: "已发表秀场 · 色彩",
    title: "浅丁香紫配黄油色",
    description: "Bottega Veneta 将丁香紫上装、蓝白条纹衬衫与黄油黄裤装叠搭。T-Fashion 的纽约女装秀场样本中，薰衣草紫从上年同季的 2.0% 增至 2.5%。",
    application: "把丁香紫放在细针织或低光泽薄料上，用浅暖黄裤装接住大面积。让少量蓝白条纹从二者之间露出，分别在自然光与室内暖光下核对三色是否分得开。",
    palette: [{ name: "浅丁香紫", hex: "#B4A0C4" }, { name: "黄油黄", hex: "#E8D39A" }, { name: "衬衫蓝", hex: "#8CAAC2" }],
    sources: [bottega, { title: "T-Fashion · 纽约女装秀场薰衣草紫统计", url: "https://tfashion.ai/runway/ss27/new-york/lavender" }],
  },
  {
    id: "ss27-tonal-red",
    category: "color",
    date,
    season,
    kind: "已发表秀场 · 色彩",
    title: "红色叠穿用明暗区分部件",
    description: "Celine Look 17 把不同深浅的红放在同一套造型中。Bottega Veneta 则用红色棉料的腰部抽褶和同色百褶裙，让面料起伏在同一色域内形成明暗分层。",
    application: "同一张线稿先试朱红主面与深莓红辅面。每一色选一块哑光和一块微光料，再用灰度照片检查相邻分片是否仍能辨认。",
    palette: [{ name: "鲜朱红", hex: "#C83238" }, { name: "深莓红", hex: "#852D40" }, { name: "淡砖红", hex: "#CB6A5C" }],
    sources: [celine, bottega],
  },
  {
    id: "ss27-aqua-matte-and-sheer",
    category: "color",
    date,
    season,
    kind: "已发表秀场 · 色彩",
    title: "海盐蓝绿随透度改变",
    description: "Who What Wear 的秀场回顾将 Chanel、Dior、Ralph Lauren 与 Valentino 的浅蓝绿放在一起，指出各家分别通过亮片、透料、渐变和垂坠表现色彩。",
    application: "先用哑光灰绿做底，再在同一色卡下选透明与半透明两块薄纱，观察边缘重叠时的色深。试拍时固定光线和白平衡，区分面料造成的色变与镜头色偏。",
    palette: [{ name: "海沫绿", hex: "#ADCBBF" }, { name: "海盐蓝", hex: "#9DBDC6" }, { name: "沙贝白", hex: "#E8E3D6" }],
    sources: [{ title: "Who What Wear · 2027 春夏秀场回顾「Marine Layer」", url: "https://www.whowhatwear.com/fashion/runway/fashion-week-trends-spring-summer-2027" }],
  },
  {
    id: "ss27-light-stretch-tweed",
    category: "fabric",
    date,
    season,
    kind: "已发表秀场 · 面料",
    title: "粗花呢纹理用轻弹组织表达",
    description: "Chanel 把再刺绣欧根纱与丝材用于带弹性的粗花呢表达，并把刺绣整合进针织制作。T-Fashion 的女装秀场样本中，格纹造型占 5.3%，比上年同季高 1.5 个百分点。",
    application: "用网眼或细针织承载横纵两组粗细不同的纱线。比较有衬和无衬的小样，测试格线拉伸后的回位，并检查肩部活动时的重量和触感。",
    palette: [{ name: "燕麦白", hex: "#E5DACB" }, { name: "莓格红", hex: "#A9484E" }, { name: "芥末黄", hex: "#C4A34D" }],
    sources: [chanelShow, chanel, runwayIndex],
  },
  {
    id: "ss27-openwork-craft",
    category: "fabric",
    date,
    season,
    kind: "已发表秀场 · 面料",
    title: "用钩编孔径调节疏密",
    description: "Bottega Veneta 的夏季段落用手工蕾丝、粗孔钩编和放大的编织纹理做层次。Who What Wear 的跨品牌整理同时收录了 Chloé、Khaite 与 The Row 的镂空和钩编案例。",
    application: "先用同一纱线钩出小孔、中孔、大孔三块样片，吊挂后再量孔径。将密针放在肩、领与承力接缝，大孔集中到袖面或不受拉力的覆片。",
    palette: [{ name: "原纱白", hex: "#EFE7D8" }, { name: "漂浅麻", hex: "#C8B89C" }, { name: "编织棕", hex: "#705A48" }],
    sources: [bottega, { title: "Who What Wear · 2027 春夏秀场回顾「By Hand」", url: "https://www.whowhatwear.com/fashion/runway/fashion-week-trends-spring-summer-2027" }],
  },
  {
    id: "ss27-reflective-pleats",
    category: "fabric",
    date,
    season,
    kind: "已发表秀场 · 面料",
    title: "顺着褶线分配银色高光",
    description: "Celine 将银色细褶长上衣叠在裤装上，细褶与下摆切口让反射随动作改变。Vogue 将 Celine 与 Dior 的银色造型并置，记录了这一季在巴黎可见的冷光表面。",
    application: "以有垂度的低光泽银灰布做两种褶宽，再与哑光同色下装搭配。正面光和侧光各拍一组，检查高光是否沿褶脊移动，以及转身时接缝是否抢亮。",
    palette: [{ name: "冷银", hex: "#BFC5CB" }, { name: "铅灰", hex: "#828994" }, { name: "雾黑", hex: "#34363D" }],
    sources: [celine, parisRunway],
  },
  {
    id: "ss27-technical-plisse",
    category: "fabric",
    date,
    season,
    kind: "已发表秀场 · 面料",
    title: "机能面料做精细压褶",
    description: "Prada 的发布资料明确记录，将哑光轧光面料和 Re-Nylon 用于压褶，也将棉布整理成类似皮革或麂皮的外观。同一种裙装轮廓中，面料整理会改变褶峰、反光和摆动。",
    application: "并排比较轻量尼龙、薄型混纺和棉斜纹的褶样。按各面料的耐热范围试压，记录冷却后、悬挂一天后及摩擦后的折线保持和异响。",
    palette: [{ name: "机能黑", hex: "#313238" }, { name: "岩棕", hex: "#7A6458" }, { name: "洗棉米", hex: "#D6C6AF" }],
    sources: [prada],
  },
  {
    id: "ss27-graphic-column-skirt",
    category: "silhouette",
    date,
    season,
    kind: "已发表秀场 · 廓形",
    title: "直身裙用开衩保留步幅",
    description: "Prada 把直线感强的裙形用作系列中固定的结构，变化来自面料、扣件和可露出的装饰。Khaite 开场采用高腰黑皮窄裙。T-Fashion 的女装秀场样本中，直身裙从上年同季的 5.1% 增至 10.3%。",
    application: "先定正面两侧直线，再把活动量留给后中或侧后开衩。打样时检查步幅、坐姿和上下楼，确认开衩长度与位置足够，再决定是否增加装饰。",
    palette: [{ name: "黑咖", hex: "#2D2928" }, { name: "纸白", hex: "#F5EFE8" }, { name: "钝银灰", hex: "#8F969B" }],
    sources: [prada, { title: "Vogue Runway · Khaite 2027 春夏开场造型", url: "https://www.vogue.com/fashion-shows/spring-2027-ready-to-wear/khaite" }, runwayIndex],
  },
  {
    id: "ss27-lowered-hip-line",
    category: "silhouette",
    date,
    season,
    kind: "已发表秀场 · 廓形",
    title: "胯位裙腰拉长躯干比例",
    description: "Chanel 将圆肩夹克与落在胯部的及膝裙搭在一起，圆润肩头和下移的裙腰形成较长的上身比例。系列另有短流苏裙，可以对照不同裙长在同一种肩线下的效果。",
    application: "同一版型试自然腰与低胯腰两版，保持肩宽、外套长和裙摆量一致。检查侧身时是否在胯部积褶，并在坐姿下核对腰口会不会滑落或勒紧。",
    palette: [{ name: "砂砾灰", hex: "#868482" }, { name: "奶米白", hex: "#E5DCC9" }, { name: "暗焦糖", hex: "#795746" }],
    sources: [chanelShow, chanel],
  },
  {
    id: "ss27-volume-at-the-edge",
    category: "silhouette",
    date,
    season,
    kind: "已发表秀场 · 廓形",
    title: "把扩张量移到袖口和裙摆",
    description: "Sacai 的春夏秀把西装袖做成钟形，裙摆用喇叭形荷叶边增加动态；机车夹克和裙装通过开缝形成摆动的流苏，向外拉出 A 字线。",
    application: "保留上臂、肩颈和大腿的基础版型，将袖的张量放在肘下，裙的张量放在膝附近。先只放一个部位，比较静止、抬臂和步行三张侧视图后再调整展开量。",
    palette: [{ name: "车衣黑", hex: "#242525" }, { name: "靛煤蓝", hex: "#343D4B" }, { name: "暗金属", hex: "#887B6F" }],
    sources: [{ title: "Vogue Runway · Sacai 2027 春夏", url: "https://www.vogue.com/fashion-shows/spring-2027-ready-to-wear/sacai" }, { title: "FHCM · 巴黎 2027 春夏女装系列", url: "https://www.fhcm.paris/en/paris-fashion-week/collections" }],
  },
];
