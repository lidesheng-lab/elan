import { publishedTrends } from "./trend-content";

export type Source = { title:string; url:string };
export type RunwayGallery = {
 sourceUrl:string;
 credit:string;
 total:number|null;
 complete:boolean;
 kind?:"lookbook";
 images:{number:number; label:string; url:string; thumbnailUrl?:string}[];
};
export type Study = {
 slug:string; date:string; designer:string; season:string; title:string; summary:string;
 libraryOnly?:true;
 runway?:RunwayGallery;
 hasRunway?:true;
 fabric:string; color:string; silhouette:string; techniques:string[]; tags:string[];
 palette:{name:string; hex:string}[]; sources:Source[];
 images:{label:string; url:string; thumbnailUrl?:string; sourceUrl?:string; credit:string}[];
};
export const trendCategories = ["color", "fabric", "silhouette"] as const;
export type TrendCategory = typeof trendCategories[number];
export type Trend = {
 category?: TrendCategory;
 id:string; date:string; season:string; kind:string; title:string; description:string;
 application:string; palette:{name:string; hex:string}[]; sources:Source[];
};
const rickArchive='https://www.rickowens.eu/pages/runway-shows';
const rickLook='https://nowfashion.com/media/rick-owens-ready-to-wear-fall-winter-2025-paris-fashion-week-runway-50';
const thomArchive='https://www.thombrowne.com/pages/collection/fall-2026-runway';
const natashaLook='https://nowfashion.com/media/natasha-zinko-ready-wear-fall-winter-2024-london-fashion-week-runway-31';
const day='2026-11-18';
export const initialStudies:Study[] = [
 { slug:'rick-owens-concordians', date:day, designer:'Rick Owens', season:'2025 秋冬 · Concordians',
 title:'用软硬反差做出雕塑感',
 summary:'把贴体、支撑和垂坠放在不同部位。2025 秋冬的象牙白罗纹长裙用挖空强调躯干结构，同色靴把线条继续往下拉。',
 fabric:'Look 50 的罗纹针织与长靴可由秀场资料核对。试样可用弹力罗纹做贴体层，中克重缎做自由下垂层，肩片需要另加衬时采用哑光双面呢。',
 color:'以骨白占主面积，银灰给流动层，暖象牙给鞋靴。明暗接近时靠罗纹、反光与雾面区分部件。色卡为应用提案。',
 silhouette:'收窄躯干、延长下装和靴线。若线稿本身有尖肩，可把体积集中于肩顶，在腋下留活动量。',
 techniques:['罗纹挖空先做稳定包边小样，并检查拉伸后的回弹。','单侧披覆从肩颈与背部两个位置固定，确认面料的自然落点。','让高光跟着垂线走，用哑光结构片压住最宽处。'],
 tags:['雕塑支撑','垂坠','镂空透层','解构剪裁','低饱和'],
 palette:[{name:'骨白',hex:'#eeebe1'},{name:'银雾',hex:'#b9bec3'},{name:'暖象牙',hex:'#d5c8aa'},{name:'石墨',hex:'#4a4b49'}],
 sources:[{title:'Rick Owens 官方秀场档案',url:rickArchive},{title:'NOWFASHION · 2025 秋冬 Look 50',url:rickLook}],
 images:[{label:'白色罗纹镂空长裙 · Look 50',url:'https://media.nowfashion.com/Collections/Paris/2025-Ready-To-Wear-Fall-Winter-Paris/Rick%20Owens-VM/Rick%20Owens-Ready-To-Wear-Fall-Winter-2025-Paris-Fashion-Week-Runway-50.jpg?class=xxlarge',thumbnailUrl:'https://media.nowfashion.com/Collections/Paris/2025-Ready-To-Wear-Fall-Winter-Paris/Rick%20Owens-VM/Rick%20Owens-Ready-To-Wear-Fall-Winter-2025-Paris-Fashion-Week-Runway-50.jpg?class=large',sourceUrl:rickLook,credit:'NOWFASHION'}] },
 { slug:'thom-browne-fall-2026', date:day, designer:'Thom Browne', season:'2026 秋冬 · GQ Bowl',
 title:'用西装材质控制解构比例',
 summary:'从正装的工整结构出发，通过改变外套、衬衫与下装的长度，让比例成为造型的焦点。',
 fabric:'从灰色精纺西装料和浅色细条纹府绸做应用小样。让软条纹衬衫在领口、袖口和腰际露出，局部搭配罗纹来收束边缘。',
 color:'冷中灰主面、浅蓝灰条纹、粉笔白内层，少量墨黑放在扣件和鞋。保持中灰的整体面积。',
 silhouette:'一处缩短、一处延长。适用于有肩线、翻领或门襟的线稿，能在保留外轮廓的同时拉开层次。',
 techniques:['先确定翻领和肩线的支撑，再安排软内层露出的位置。','把沿纵向的条纹留给平面，曲面转折处先检查条纹走向与对位。','把衬衫长短差或一处斜裹作为视觉主点。'],
 tags:['西装条纹','雕塑支撑','解构剪裁','低饱和'],
 palette:[{name:'冷中灰',hex:'#969b9e'},{name:'浅蓝灰',hex:'#bfcbd0'},{name:'粉笔白',hex:'#eeeee7'},{name:'墨黑',hex:'#29292a'}],
 sources:[{title:'Thom Browne 官方 · 2026 秋冬秀场',url:thomArchive},{title:'Vogue Runway · 2026 秋冬',url:'https://www.vogue.com/fashion-shows/fall-2026-ready-to-wear/thom-browne'}],
 images:[{"label":"秀场造型 01","url":"https://assets.vogue.com/photos/698752dfff08d14efcd43664/master/w_960%2Cc_limit/00001-thom-browne-fall-2026-ready-to-wear-credit-brand.jpg","thumbnailUrl":"https://assets.vogue.com/photos/698752dfff08d14efcd43664/master/w_360%2Cc_limit/00001-thom-browne-fall-2026-ready-to-wear-credit-brand.jpg","sourceUrl":"https://www.vogue.com/fashion-shows/fall-2026-ready-to-wear/thom-browne/slideshow/collection","credit":"Vogue Runway · 摄影署名见原图集"},{"label":"秀场造型 03","url":"https://assets.vogue.com/photos/698752e563b6cdbd07936b9b/master/w_960%2Cc_limit/00003-thom-browne-fall-2026-ready-to-wear-credit-brand.jpg","thumbnailUrl":"https://assets.vogue.com/photos/698752e563b6cdbd07936b9b/master/w_360%2Cc_limit/00003-thom-browne-fall-2026-ready-to-wear-credit-brand.jpg","sourceUrl":"https://www.vogue.com/fashion-shows/fall-2026-ready-to-wear/thom-browne/slideshow/collection","credit":"Vogue Runway · 摄影署名见原图集"},{"label":"秀场造型 05","url":"https://assets.vogue.com/photos/698752e54181eabb5b624114/master/w_960%2Cc_limit/00005-thom-browne-fall-2026-ready-to-wear-credit-brand.jpg","thumbnailUrl":"https://assets.vogue.com/photos/698752e54181eabb5b624114/master/w_360%2Cc_limit/00005-thom-browne-fall-2026-ready-to-wear-credit-brand.jpg","sourceUrl":"https://www.vogue.com/fashion-shows/fall-2026-ready-to-wear/thom-browne/slideshow/collection","credit":"Vogue Runway · 摄影署名见原图集"}] },
 { slug:'natasha-zinko-fall-2024', date:day, designer:'Natasha Zinko', season:'2024 秋冬 · Space Race',
 title:'给贴身针织加入功能转折',
 summary:'让缝线、局部夹层、偏置拉链承担造型。先从这组图里可定位到的 Look 31 入手，观察白色贴体层与开口之间的张力。',
 fabric:'Look 31 的白色 jersey 见秀场资料。回到系列，报道还提到部分硬挺造型采用贴合氯丁橡胶面料与华达呢。实际转化可选双向弹力针织配局部低弹支撑片。',
 color:'主色采用白到蛋壳白，冷灰放在领部和小面积五金。避开粉底式的灰雾，以保证白色的结构边缘清晰。',
 silhouette:'贴体高领加单侧肩口。曲面袋片改变躯干的读法，开口和拉链构成不对称的视觉节奏。',
 techniques:['优先确认开口的包边宽度与回弹，避免开口外张。','在弹力底布上先加拉链稳定衬，再确认拉链方向。','若原线稿已有复杂分割，集中在一个功能细节。'],
 tags:['镂空透层','解构剪裁','低饱和'],
 palette:[{name:'粉笔白',hex:'#eeeae6'},{name:'蛋壳白',hex:'#e1d5c5'},{name:'烟灰',hex:'#77706c'},{name:'拉链黑',hex:'#303234'}],
 sources:[{title:'NOWFASHION · 2024 秋冬 Look 31',url:natashaLook},{title:'Vogue Runway · Space Race',url:'https://www.vogue.com/fashion-shows/fall-2024-ready-to-wear/natasha-zinko'}],
 images:[{label:'弹力白色上装 · Look 31',url:'https://media.nowfashion.com/Collections/London/2024-Ready-To-Wear-Fall-Winter-London/Natasha%20Zinko/Natasha%20Zinko-Ready-Wear-Fall-Winter-2024-London-Fashion-Week-Runway-31.JPG?class=xxlarge',thumbnailUrl:'https://media.nowfashion.com/Collections/London/2024-Ready-To-Wear-Fall-Winter-London/Natasha%20Zinko/Natasha%20Zinko-Ready-Wear-Fall-Winter-2024-London-Fashion-Week-Runway-31.JPG?class=large',sourceUrl:natashaLook,credit:'NOWFASHION'}] }
];

export const initialTrends:Trend[] = [
 { id:'aw26-dense',category:'fabric',date:day,season:'2026/27 秋冬',kind:'当季 · 面料观察',title:'高密度织物撑出安静轮廓',
 description:'Première Vision 的当季材料解读强调一支表面平滑、组织致密的面料方向。密织面与干净边缘适合强调结构线。',
 application:'以高密西装料画清肩颈，搭轻薄哑光内搭。先试双层叠合后能否保持领口和下摆形状。',
 palette:[{name:'冷石灰',hex:'#a6aaac'},{name:'深瓦灰',hex:'#545857'},{name:'粗陶白',hex:'#e6e2d9'}],
 sources:[{title:'Première Vision · 2026/27 秋冬面料与装饰',url:'https://www.premierevision.com/en/articles/480ea5ff-1699-f011-b484-000d3a26b476/aw-26-27-decodings-fabrics-decoration-highlights'}]},
 { id:'ss27-layer',category:'silhouette',date:day,season:'2027 春夏',kind:'已发表秀场 · 造型观察',title:'轻透覆层与裙装重新分配体量',
 description:'2027 春夏秀场编辑观察关注裙装比例、内衣式上装与轻透明层。实际试样可把可见性当成一项造型变量。',
 application:'给贴体底层叠一片有独立落点的薄纱，让视线集中在腰、胯或肩的一个过渡。',
 palette:[{name:'贝壳白',hex:'#f0e8dc'},{name:'水雾蓝',hex:'#b8c6d0'},{name:'石灰',hex:'#878c83'}],
 sources:[{title:'Vogue · 2027 春夏秀场趋势',url:'https://www.vogue.com/article/the-top-trends-of-the-spring-2027-ready-to-wear-season'}]},
 { id:'aw27-living',category:'color',date:day,season:'2027/28 秋冬',kind:'前瞻 · 面料 / 色彩',title:'带色偏的中性色与有触感的光泽',
 description:'Première Vision 的 Living Matter 前瞻关注有数字冷调的细微中性色、缎面光泽和有雕塑感的密度；工艺、做旧与材质细节共同决定视觉效果。',
 application:'用灰紫或蓝灰做主体，深梅色做小面积点缀，再用中厚缎或哑光双面料建立光泽落差。',
 palette:[{name:'雾蓝灰',hex:'#8d9da7'},{name:'灰紫',hex:'#7e7185'},{name:'深梅',hex:'#3f303f'},{name:'矿物白',hex:'#e7e2da'}],
 sources:[{title:'Première Vision · 2027/28 秋冬关键材料',url:'https://www.premierevision.com/en/articles/9e280496-65b6-f111-a6a9-6045bdf5ca6d/-aw-27-28-key-materials-how-a-new-relationship-with-time-is-shaping-material-developments'},{title:'Première Vision · 2027/28 秋冬色彩预览',url:'https://www.premierevision.com/en/articles/350327a8-515e-f111-8fca-000d3a3a75fd/preview-couleur-ah-27-28-quand-la-couleur-revele-une-matiere-vivante'}]}
];

export const collectionTrends:Trend[] = [
 ...publishedTrends,
 { id:'aw26-adjustable-shell',category:'silhouette',date:day,season:'2026/27 秋冬',kind:'系列对照 · 面料与造型',
 title:'以柔软部件释放硬挺外层',
 description:'Hermès 用可拆领和可调拉链改变外衣的开口，Altuzarra 用短外层接波动裙摆，Sacai 则把正装、派克和针织构件接在同一造型。共同点是给硬挺的部分明确支撑任务，再从开口或拼接处释放活动量。',
 application:'外套先以低弹料确定肩领和门襟，肘、腰或下摆补柔软衬片。分别试闭合、敞开和走动时的效果。',
 palette:[{name:'煤灰',hex:'#36383A'},{name:'皮棕',hex:'#755448'},{name:'绒白',hex:'#E2DBCF'}],
 sources:[{title:'Vogue Runway · Hermès 2026 秋冬',url:'https://www.vogue.com/fashion-shows/fall-2026-ready-to-wear/hermes'},{title:'Vogue Runway · Altuzarra 2026 秋冬',url:'https://www.vogue.com/fashion-shows/fall-2026-ready-to-wear/altuzarra'},{title:'Vogue Runway · Sacai 2026 秋冬',url:'https://www.vogue.com/fashion-shows/fall-2026-ready-to-wear/sacai'}]},
 { id:'ss27-supporting-sheers',category:'fabric',date:day,season:'2027 春夏',kind:'已发表秀场 · 面料与造型',
 title:'半透明层用边缘和内层定形',
 description:'Khaite 为薄透层加入有支撑的荷叶边，Carolina Herrera 用白衬衫与腰部结构定裙身的透明体量，Marc Jacobs 叠贴身内层改变透料上的光色。三种方法分别作用于边缘、腰线和内衬。',
 application:'同一版型先换三种透明度，再测下摆支撑和内层颜色。以相同光线、站姿与步行状态拍对照。',
 palette:[{name:'浅杏',hex:'#D5BDAC'},{name:'烟灰',hex:'#96929B'},{name:'瓷白',hex:'#EEE9E1'}],
 sources:[{title:'Vogue Runway · Khaite 2027 春夏',url:'https://www.vogue.com/fashion-shows/spring-2027-ready-to-wear/khaite'},{title:'Vogue Runway · Carolina Herrera 2027 春夏',url:'https://www.vogue.com/fashion-shows/spring-2027-ready-to-wear/carolina-herrera'},{title:'Vogue Runway · Marc Jacobs 2027 春夏',url:'https://www.vogue.com/fashion-shows/spring-2027-ready-to-wear/marc-jacobs'}]}
];
